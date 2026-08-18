import { highlightCode, type HighlightLanguage } from '@/lib/highlight-code';

import { CodeBlockView } from './CodeBlockView';
import { CodeTabsClient, type CodeTabItem } from './CodeTabsClient';

export interface CodeTabsProps {
  html: string;
  css: string;
  /** Ausente/vazio omite a aba JS (seção 5.2 do MVP2). */
  js?: string | null;
}

const TAB_LABEL: Record<HighlightLanguage, string> = { html: 'HTML', css: 'CSS', js: 'JS' };

/**
 * Abas HTML/CSS/JS (seção 5.2 do MVP2) — Server Component assíncrono de
 * propósito único: resolve todo o highlight do Shiki aqui (uma única função
 * `await`ável, sem `<CodeBlock>` assíncrono aninhado) e só então monta a
 * árvore de `CodeTabsClient`, que é síncrona. Isso mantém o Shiki inteiramente
 * fora do bundle do cliente (import só existe no grafo de módulos do
 * servidor) e torna este componente testável com um simples `await
 * CodeTabs(props)` seguido de `render()`, sem precisar do runtime RSC do
 * Next.js para resolver componentes assíncronos aninhados.
 */
export async function CodeTabs({ html, css, js }: CodeTabsProps) {
  const hasJs = Boolean(js && js.trim().length > 0);

  const entries: Array<{ id: HighlightLanguage; code: string }> = [
    { id: 'html', code: html },
    { id: 'css', code: css },
    ...(hasJs ? [{ id: 'js' as const, code: js as string }] : []),
  ];

  const tabs: CodeTabItem[] = await Promise.all(
    entries.map(async ({ id, code }) => ({
      id,
      label: TAB_LABEL[id],
      content: <CodeBlockView lines={await highlightCode(code, id)} />,
    })),
  );

  return <CodeTabsClient tabs={tabs} />;
}
