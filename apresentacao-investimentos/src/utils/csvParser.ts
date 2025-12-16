import Papa from 'papaparse';
import type { Movimento, TipoMovimento } from '../types/movimento';
import { CATEGORIAS_ESPECIAIS, GRUPOS_DESPESA } from '../types/movimento';
import { parseDate, parseCSVNumber } from './formatters';

// Extrai o ID numérico da categoria (ex: "87 - FGTS Rescisao" -> 87)
function extractCategoriaId(categoria: string): number {
  if (!categoria) return 0;
  const match = categoria.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

// Extrai nome da categoria sem o ID
function extractCategoriaNome(categoria: string): string {
  if (!categoria) return 'Outros';
  const match = categoria.match(/^\d+\s*-\s*(.+)/);
  return match ? match[1].trim() : categoria;
}

export async function parseMovimentosCSV(csvUrl: string): Promise<Movimento[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvUrl, {
      download: true,
      header: false,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const movimentos: Movimento[] = [];
          const rows = results.data as string[][];
          
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length < 10) continue;
            
            // Estrutura do CSV:
            // 0: ID
            // 1: Data
            // 2: Dia Semana
            // 3: Tipo
            // 4: Crédito
            // 5: Débito
            // 6: Banco
            // 7: Documento
            // 8: Parcela (vazio em alguns)
            // 9: Categoria
            // 10: Histórico
            
            const id = parseInt(row[0], 10);
            if (isNaN(id)) continue; // Pula linhas inválidas
            
            const dataStr = row[1]?.trim();
            if (!dataStr || !dataStr.match(/\d{2}\/\d{2}\/\d{4}/)) continue;
            
            const credito = parseCSVNumber(row[4] || '');
            const debito = parseCSVNumber(row[5] || '');
            
            // Ignora linhas sem valor
            if (credito === 0 && debito === 0) continue;
            
            const categoria = row[9] || '';
            const categoriaId = extractCategoriaId(categoria);
            
            const movimento: Movimento = {
              id,
              data: parseDate(dataStr),
              dataStr,
              diaSemana: row[2]?.trim() || '',
              tipo: (row[3]?.trim() || '') as TipoMovimento,
              credito,
              debito,
              banco: row[6]?.trim() || '',
              documento: row[7]?.trim() || '',
              parcela: row[8]?.trim() || '',
              categoria: extractCategoriaNome(categoria),
              categoriaId,
              historico: row[10]?.trim() || '',
              fornecedor: row[11]?.trim() || '',
            };
            
            movimentos.push(movimento);
          }
          
          // Ordena por data
          movimentos.sort((a, b) => a.data.getTime() - b.data.getTime());
          
          resolve(movimentos);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

// Verifica se é um aporte (Brivio ou IANCO)
export function isAporte(mov: Movimento): boolean {
  return mov.categoriaId === CATEGORIAS_ESPECIAIS.APORTE && mov.credito > 0;
}

// Verifica se é aporte da família Brivio (câmbio - valor alto)
export function isAporteBrivio(mov: Movimento): boolean {
  if (mov.categoriaId !== CATEGORIAS_ESPECIAIS.APORTE) return false;
  if (mov.credito <= 0) return false;
  
  // Normaliza o histórico removendo acentos
  const historico = mov.historico
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Aporte Brivio é de ~3.3 milhões via câmbio
  const isCambio = historico.includes('CAMBIO');
  const isValorAlto = mov.credito > 3000000;
  
  return isCambio || isValorAlto;
}

// Verifica se é aporte da IANCO (via Usifix)
export function isAporteIanco(mov: Movimento): boolean {
  if (mov.categoriaId !== CATEGORIAS_ESPECIAIS.APORTE) return false;
  if (mov.credito <= 0) return false;
  
  // Já é Brivio? Não é IANCO
  const historico = mov.historico
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  const isCambio = historico.includes('CAMBIO');
  const isValorAlto = mov.credito > 3000000;
  
  if (isCambio || isValorAlto) return false;
  
  // É IANCO se menciona Usifix ou Aporte
  return historico.includes('USIFIX') || 
         historico.includes('APORTE');
}

// Verifica se é venda
export function isVenda(mov: Movimento): boolean {
  return (mov.categoriaId === CATEGORIAS_ESPECIAIS.VENDA_PRODUTOS ||
          mov.categoriaId === CATEGORIAS_ESPECIAIS.VENDA_SERVICOS) &&
         mov.credito > 0;
}

// Verifica se é transferência interna
export function isTransferenciaInterna(mov: Movimento): boolean {
  return mov.categoriaId === CATEGORIAS_ESPECIAIS.TRANSFERENCIA;
}

// Verifica se é implantação de saldo (não conta)
export function isImplantacaoSaldo(mov: Movimento): boolean {
  return mov.categoriaId === CATEGORIAS_ESPECIAIS.IMPLANTACAO_SALDO;
}

// Verifica se é despesa válida (exclui transferências e implantações)
export function isDespesaValida(mov: Movimento): boolean {
  return mov.debito > 0 && 
         !isTransferenciaInterna(mov) && 
         !isImplantacaoSaldo(mov);
}

// Obtém o grupo de despesa pelo categoriaId
export function getGrupoDespesa(categoriaId: number): string {
  return GRUPOS_DESPESA[categoriaId.toString()] || 'Outras Despesas';
}
