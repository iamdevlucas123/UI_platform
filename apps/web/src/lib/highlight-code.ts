import { codeToTokensBase, type BundledLanguage } from 'shiki';

/**
 * Realce de sintaxe no servidor (seção 3/5.2 do MVP2: "Highlight no servidor
 * → zero JS extra no cliente"). Devolve tokens estruturados
 * (`content`/`color`/…), nunca uma string de HTML — quem consome isto
 * (`CodeBlockView`) monta `<span>`s via JSX, então o código do catálogo
 * (não confiável) nunca vira markup interpretável no documento principal
 * (seção 11: zero `dangerouslySetInnerHTML`). Este módulo só roda em Server
 * Components (`CodeTabs`); nada aqui é importado por um Client Component.
 */

export type HighlightLanguage = 'html' | 'css' | 'js';

export interface HighlightToken {
  content: string;
  color?: string;
  bold: boolean;
  italic: boolean;
}

export type HighlightedLine = HighlightToken[];

const SHIKI_LANG: Record<HighlightLanguage, BundledLanguage> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
};

const THEME = 'github-dark';

// Bits do bitmask de `FontStyle` do Shiki (Italic=1, Bold=2, Underline=4) —
// lidos como número puro em vez de importar o `const enum` da lib: com
// `isolatedModules` (tsconfig deste app), um `const enum` importado de fora
// do projeto não pode ser inlinado com segurança pelo compilador.
const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;

export async function highlightCode(code: string, lang: HighlightLanguage): Promise<HighlightedLine[]> {
  const lines = await codeToTokensBase(code, {
    lang: SHIKI_LANG[lang],
    theme: THEME,
  });

  return lines.map((line) =>
    line.map((token) => ({
      content: token.content,
      color: token.color,
      bold: Boolean((token.fontStyle ?? 0) & FONT_STYLE_BOLD),
      italic: Boolean((token.fontStyle ?? 0) & FONT_STYLE_ITALIC),
    })),
  );
}
