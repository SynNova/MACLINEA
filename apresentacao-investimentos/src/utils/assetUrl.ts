export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const clean = String(path || '').replace(/^\/+/, '');
  // BASE_URL do Vite geralmente já termina com "/", mas garantimos.
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${clean}`;
}


