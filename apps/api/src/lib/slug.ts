/**
 * Normaliza uma string livre num slug de URL: minúsculas, sem acentos (seção
 * 7 do MVP1 — "slug normalizado antes de checar unicidade"), apenas letras,
 * dígitos e hífens simples entre blocos. Usado pelo service de componentes
 * antes de checar unicidade e persistir — mesmo com `slugSchema` (Zod) já
 * restringindo o formato de entrada, o service normaliza defensivamente
 * qualquer variação (ex.: maiúsculas ou acentos que cheguem por outra via).
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
