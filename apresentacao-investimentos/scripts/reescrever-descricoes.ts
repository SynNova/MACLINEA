/**
 * Script para reescrever descrições de lançamentos financeiros
 * Usa Claude Opus 4.5 via OpenRouter para gerar descrições limpas e diretas
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error(
    'OPENROUTER_API_KEY não definido. Defina a variável de ambiente antes de executar (ex.: $env:OPENROUTER_API_KEY="..." no PowerShell).'
  );
}

// Modelo: Claude Opus 4.5 (OpenRouter)
const MODEL = 'anthropic/claude-opus-4.5';
const CSV_PATH = join(__dirname, '../public/dados/movimentos.csv');
const OUTPUT_PATH = join(__dirname, '../public/dados/movimentos_limpo.csv');

interface Lancamento {
  id: string;
  data: string;
  diaSemana: string;
  tipo: string;
  credito: string;
  debito: string;
  banco: string;
  documento: string;
  parcela: string;
  categoria: string;
  historico: string;
  fornecedor?: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Parse CSV para array de lançamentos
function parseCSV(content: string): Lancamento[] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const parts = line.split(';');
    return {
      id: parts[0] || '',
      data: parts[1] || '',
      diaSemana: parts[2] || '',
      tipo: parts[3] || '',
      credito: parts[4] || '',
      debito: parts[5] || '',
      banco: parts[6] || '',
      documento: parts[7] || '',
      parcela: parts[8] || '',
      categoria: parts[9] || '',
      historico: parts[10] || '',
      fornecedor: parts[11] || '',
    };
  });
}

// Converte lançamento de volta para linha CSV
function toCSVLine(l: Lancamento): string {
  return [
    l.id, l.data, l.diaSemana, l.tipo, l.credito, l.debito,
    l.banco, l.documento, l.parcela, l.categoria, l.historico, l.fornecedor || ''
  ].join(';');
}

// Formata valor para exibição
function formatValor(credito: string, debito: string): string {
  if (credito && credito !== '0') return `+R$ ${credito}`;
  if (debito && debito !== '0') return `-R$ ${debito}`;
  return 'R$ 0';
}

// Monta contexto para o Claude
function buildContext(lancamentos: Lancamento[], index: number): string {
  const atual = lancamentos[index];
  const anterior = index > 0 ? lancamentos[index - 1] : null;
  const posterior = index < lancamentos.length - 1 ? lancamentos[index + 1] : null;
  
  let context = `## LANÇAMENTO A REESCREVER (ID: ${atual.id})\n`;
  context += `- Data: ${atual.data} (${atual.diaSemana})\n`;
  context += `- Tipo: ${atual.tipo}\n`;
  context += `- Valor: ${formatValor(atual.credito, atual.debito)}\n`;
  context += `- Banco: ${atual.banco}\n`;
  context += `- Documento: ${atual.documento}\n`;
  context += `- Parcela: ${atual.parcela || 'N/A'}\n`;
  context += `- Categoria: ${atual.categoria}\n`;
  context += `- Descrição Original: "${atual.historico}"\n`;
  if (atual.fornecedor) {
    context += `- Fornecedor: ${atual.fornecedor}\n`;
  }

  if (anterior) {
    context += `\n## LANÇAMENTO ANTERIOR (contexto)\n`;
    context += `- ${anterior.data}: ${anterior.categoria} - ${formatValor(anterior.credito, anterior.debito)} - "${anterior.historico.slice(0, 50)}..."\n`;
  }

  if (posterior) {
    context += `\n## LANÇAMENTO POSTERIOR (contexto)\n`;
    context += `- ${posterior.data}: ${posterior.categoria} - ${formatValor(posterior.credito, posterior.debito)} - "${posterior.historico.slice(0, 50)}..."\n`;
  }

  return context;
}

// Agrupa múltiplos lançamentos para processar em uma única chamada (economia de tokens)
function buildBatchContext(lancamentos: Lancamento[], indices: number[]): string {
  let context = '';
  
  for (const index of indices) {
    const atual = lancamentos[index];
    const anterior = index > 0 ? lancamentos[index - 1] : null;
    const posterior = index < lancamentos.length - 1 ? lancamentos[index + 1] : null;
    
    context += `\n---\n### LANÇAMENTO ${atual.id}\n`;
    context += `Data: ${atual.data} | Tipo: ${atual.tipo} | Valor: ${formatValor(atual.credito, atual.debito)}\n`;
    context += `Banco: ${atual.banco} | Categoria: ${atual.categoria}\n`;
    context += `Descrição Original: "${atual.historico}"\n`;
    if (atual.fornecedor) context += `Fornecedor: ${atual.fornecedor}\n`;
    if (anterior) context += `[Anterior: ${anterior.historico.slice(0, 40)}...]\n`;
    if (posterior) context += `[Posterior: ${posterior.historico.slice(0, 40)}...]\n`;
  }
  
  return context;
}

// Chama Claude Opus 4.5 via OpenRouter - Batch
async function callClaudeBatch(context: string, ids: string[]): Promise<Map<string, string>> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://maclinea.com.br',
      'X-Title': 'Maclinea - Reescrita de Descricoes'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Você é um assistente financeiro especializado em limpar e padronizar descrições de lançamentos bancários.

REGRAS PARA REESCRITA:
1. Seja EXTREMAMENTE conciso (máximo 50 caracteres)
2. Remova códigos de transação, datas redundantes, prefixos como "PIX", "TED", "DOC", "DES:"
3. Mantenha apenas a informação essencial: PARA QUEM foi pago ou DE QUEM recebeu
4. Use formato: "Pagto [Beneficiário]" ou "[Categoria curta]"
5. Se for FGTS, INSS, tributo: use sigla + quantidade ou referência
6. Se houver fornecedor, priorize o nome do fornecedor
7. Remova textos como "MACLINEA", "MAQUINAS E", datas, números de documento
8. Para transferências internas: "Transf Interna" ou "Transf [Banco]"
9. Para folha: "Folha" ou "Salários"
10. NÃO inclua valores monetários

FORMATO DE RESPOSTA (um por linha, exatamente):
ID: nova_descricao

Exemplo de resposta:
106: FGTS 27 Rescisões
8: Transf Interna Bradesco
216: Transf Interna`
        },
        {
          role: 'user',
          content: `Reescreva as descrições dos lançamentos abaixo. Responda APENAS no formato "ID: nova_descricao" (um por linha):\n${context}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as OpenRouterResponse;
  const content = data.choices[0]?.message?.content || '';
  
  // Parse resposta
  const resultMap = new Map<string, string>();
  const lines = content.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/^(\d+):\s*(.+)$/);
    if (match) {
      const id = match[1];
      const descricao = match[2].trim();
      if (descricao.length > 0 && descricao.length <= 60) {
        resultMap.set(id, descricao);
      }
    }
  }
  
  return resultMap;
}

// Processa todos os lançamentos em batches
async function processarLancamentos() {
  console.log('📂 Lendo arquivo CSV...');
  const content = readFileSync(CSV_PATH, 'utf-8');
  const lancamentos = parseCSV(content);
  
  console.log(`📊 Total de lançamentos: ${lancamentos.length}`);
  
  // Filtra apenas lançamentos com descrição longa (precisa limpar)
  const lancamentosParaProcessar: number[] = [];
  lancamentos.forEach((l, i) => {
    if (l.historico && l.historico.trim().length > 20) {
      lancamentosParaProcessar.push(i);
    }
  });
  
  console.log(`📝 Lançamentos para processar: ${lancamentosParaProcessar.length}`);

  const batchSize = 15; // Processa 15 por vez em uma chamada (economia)
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  let processados = 0;
  let erros = 0;

  console.log('\n🤖 Iniciando processamento com Claude Opus 4.5 via OpenRouter...\n');

  for (let i = 0; i < lancamentosParaProcessar.length; i += batchSize) {
    const batchIndices = lancamentosParaProcessar.slice(i, i + batchSize);
    const batchIds = batchIndices.map(idx => lancamentos[idx].id);
    
    try {
      const context = buildBatchContext(lancamentos, batchIndices);
      const results = await callClaudeBatch(context, batchIds);
      
      for (const idx of batchIndices) {
        const id = lancamentos[idx].id;
        const novaDescricao = results.get(id);
        
        if (novaDescricao) {
          const antiga = lancamentos[idx].historico.slice(0, 35);
          lancamentos[idx].historico = novaDescricao;
          processados++;
          console.log(`✅ [${id}] "${antiga}..." → "${novaDescricao}"`);
        }
      }
    } catch (error) {
      erros++;
      console.error(`❌ Erro no batch ${i}-${i+batchSize}: ${error}`);
    }
    
    // Progresso
    const progresso = Math.min(100, Math.round(((i + batchSize) / lancamentosParaProcessar.length) * 100));
    console.log(`\n📈 Progresso: ${progresso}% (${Math.min(i + batchSize, lancamentosParaProcessar.length)}/${lancamentosParaProcessar.length})\n`);
    
    // Aguarda entre batches para respeitar rate limits
    if (i + batchSize < lancamentosParaProcessar.length) {
      await delay(3000);
    }
  }

  // Salva arquivo atualizado
  console.log('\n💾 Salvando arquivo atualizado...');
  const novoConteudo = lancamentos.map(toCSVLine).join('\n');
  writeFileSync(OUTPUT_PATH, novoConteudo, 'utf-8');
  
  // Também sobrescreve o original (backup já feito acima)
  writeFileSync(CSV_PATH, novoConteudo, 'utf-8');
  
  console.log(`\n✨ Processamento concluído!`);
  console.log(`   📊 Total processados: ${processados}`);
  console.log(`   ❌ Erros: ${erros}`);
  console.log(`   📁 Arquivo salvo em: ${OUTPUT_PATH}`);
  console.log(`   📁 Original atualizado: ${CSV_PATH}`);
}

// Executa
processarLancamentos().catch(console.error);
