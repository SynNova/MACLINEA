/**
 * Gera um dicionário de tradução PT->IT para uso no site (opcional).
 *
 * Saída: public/dados/traducao_it.json
 *
 * - Não altera o CSV original
 * - Serve para traduzir "categoria" e "historico" exibidos (UI) quando o idioma estiver em IT
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

// Você pode sobrescrever via env: $env:OPENROUTER_MODEL="..."
const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4.5';

const CSV_PATH = join(__dirname, '../public/dados/movimentos.csv');
const OUTPUT_PATH = join(__dirname, '../public/dados/traducao_it.json');

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

function extractCategoriaNome(categoria: string): string {
  if (!categoria) return '';
  const match = categoria.match(/^\d+\s*-\s*(.+)/);
  return match ? match[1].trim() : categoria.trim();
}

function safeReadJson(path: string): Record<string, string> {
  try {
    if (!existsSync(path)) return {};
    const raw = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function collectStringsFromCSV(content: string): string[] {
  const set = new Set<string>();
  const lines = content.trim().split('\n');

  for (const line of lines) {
    const parts = line.split(';');
    if (!parts || parts.length < 11) continue;

    const categoriaRaw = parts[9] || '';
    const historico = (parts[10] || '').trim();
    const categoriaNome = extractCategoriaNome(categoriaRaw);

    if (categoriaNome) set.add(categoriaNome);
    if (historico) set.add(historico);
  }

  return Array.from(set);
}

async function callTranslateBatch(items: Array<{ id: number; text: string }>): Promise<Map<number, string>> {
  const lines = items.map((i) => `${i.id}: ${i.text}`).join('\n');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://maclinea.com.br',
      'X-Title': 'Maclinea - Traducao PT->IT',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Você é um tradutor profissional PT-BR -> IT-IT especializado em lançamentos bancários/financeiros.

REGRAS:
1) Traduza para italiano NATURAL e objetivo.
2) Mantenha siglas e termos brasileiros: FGTS, INSS, IOF, PIX, TED, DOC, RJ (não traduza).
3) Mantenha nomes próprios/empresas/bancos como estão.
4) Não adicione explicações, nem aspas, nem bullets.
5) Preserve números e quantidades.
6) Seja conciso (ideal <= 80 caracteres).

FORMATO DE SAÍDA (obrigatório, um por linha):
ID: traduzione`,
        },
        {
          role: 'user',
          content:
            `Traduza os itens abaixo para italiano. Responda APENAS no formato "ID: traduzione" (um por linha).\n\n${lines}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${err}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content || '';

  const result = new Map<number, string>();
  for (const line of content.split('\n')) {
    const m = line.trim().match(/^(\d+):\s*(.+)$/);
    if (!m) continue;
    const id = parseInt(m[1], 10);
    const text = m[2].trim();
    if (!Number.isFinite(id) || !text) continue;
    result.set(id, text);
  }

  return result;
}

async function main() {
  console.log('📂 Lendo movimentos.csv...');
  const csv = readFileSync(CSV_PATH, 'utf-8');

  console.log('🔎 Coletando textos únicos (categoria + histórico)...');
  const allStrings = collectStringsFromCSV(csv);
  console.log(`📊 Únicos encontrados: ${allStrings.length}`);

  console.log('📦 Carregando dicionário existente (se houver)...');
  const existing = safeReadJson(OUTPUT_PATH);
  const existingCount = Object.keys(existing).length;
  console.log(`✅ Já traduzidos: ${existingCount}`);

  const toTranslate = allStrings.filter((s) => !existing[s]);
  console.log(`📝 Faltando traduzir: ${toTranslate.length}`);

  if (toTranslate.length === 0) {
    console.log('🎉 Nada a fazer. Dicionário já está completo.');
    return;
  }

  const batchSize = 35;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let done = 0;
  let errors = 0;

  for (let i = 0; i < toTranslate.length; i += batchSize) {
    const batchTexts = toTranslate.slice(i, i + batchSize);
    const items = batchTexts.map((text, idx) => ({ id: idx + 1, text }));

    try {
      const translated = await callTranslateBatch(items);
      for (const item of items) {
        const it = translated.get(item.id);
        if (it) {
          existing[item.text] = it;
          done++;
        }
      }
    } catch (e) {
      errors++;
      console.error(`❌ Erro no batch ${i}-${i + batchSize}:`, e);
    }

    const progress = Math.min(100, Math.round(((i + batchSize) / toTranslate.length) * 100));
    console.log(`📈 Progresso: ${progress}% (${Math.min(i + batchSize, toTranslate.length)}/${toTranslate.length})`);

    if (i + batchSize < toTranslate.length) {
      await delay(2500);
    }
  }

  // Salva
  const sortedKeys = Object.keys(existing).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const sorted: Record<string, string> = {};
  for (const k of sortedKeys) sorted[k] = existing[k];

  writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2), 'utf-8');

  console.log('\n✨ Tradução concluída!');
  console.log(`   ✅ Novos traduzidos: ${done}`);
  console.log(`   ❌ Batches com erro: ${errors}`);
  console.log(`   📁 Arquivo gerado: ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error('❌ Falha geral:', e);
  process.exitCode = 1;
});



