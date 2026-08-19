export type ClassValue = string | false | null | undefined;

/** Junta classes Tailwind condicionalmente, descartando valores falsy — sem dependência externa (`clsx`/`tailwind-merge`), suficiente para composições simples de variantes. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
