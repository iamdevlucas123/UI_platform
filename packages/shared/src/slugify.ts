/**
 * Normaliza uma string livre num slug de URL: minúsculas, sem acentos (seção
 * 7 do MVP1 — "slug normalizado antes de checar unicidade"), apenas letras,
 * dígitos e hífens simples entre blocos. Compartilhada entre `apps/api`
 * (normaliza defensivamente antes de checar unicidade e persistir, mesmo já
 * validado por `slugSchema`) e `apps/web` (gera o slug automático em
 * `ComponentForm`, seção 5.4 do MVP2, a partir do `name`) — as duas pontas
 * precisam produzir exatamente o mesmo resultado para o slug mostrado no
 * formulário nunca divergir do que o servidor de fato grava.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    // Marcas diacríticas combináveis (acentos) isoladas pelo NFD acima.
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
