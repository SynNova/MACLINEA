export type BancoPermitido = 'BRADESCO' | 'UNICREDI' | 'UNICRED' | 'INTER';

export const BANCOS_PERMITIDOS: BancoPermitido[] = ['BRADESCO', 'UNICREDI', 'UNICRED', 'INTER'];

function normalize(value: string): string {
  return (value || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function extractBancoNome(banco: string): string {
  const raw = normalize(banco);
  // Formato comum: "6 - BRADESCO"
  const parts = raw.split('-').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(1).join(' - ').trim();
  return raw;
}

export function isBancoPermitido(banco: string): boolean {
  const nome = extractBancoNome(banco);
  return BANCOS_PERMITIDOS.some((b) => nome === b);
}

/** Verifica se o banco corresponde a um nome específico (normalizado) */
export function isBancoEspecifico(banco: string, targetBanco: string): boolean {
  const nome = extractBancoNome(banco);
  const target = normalize(targetBanco);
  return nome === target || nome.includes(target) || target.includes(nome);
}


