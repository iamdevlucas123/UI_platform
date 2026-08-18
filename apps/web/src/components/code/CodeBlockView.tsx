import { Fragment } from 'react';

import type { HighlightedLine } from '@/lib/highlight-code';

export interface CodeBlockViewProps {
  lines: HighlightedLine[];
}

/**
 * Renderiza tokens já realçados (seção 5.2/11 do MVP2) como `<span>`s de
 * texto puro — cada `token.content` é um filho de texto do React, nunca
 * markup: sem `dangerouslySetInnerHTML`, o código do catálogo não pode virar
 * HTML executável no documento principal mesmo que contenha `<script>`,
 * `<img onerror=...>` etc. como texto literal.
 *
 * Componente síncrono de propósito (não `async`): `CodeTabs` já resolveu o
 * highlight antes de montar esta árvore, então isto é puro JSX renderizável
 * tanto pelo runtime RSC do Next quanto pelo `react-dom` client usado nos
 * testes (`render()` do Testing Library não sabe lidar com componentes
 * assíncronos aninhados).
 */
export function CodeBlockView({ lines }: CodeBlockViewProps) {
  return (
    <pre className="overflow-x-auto bg-neutral-950 p-4 text-xs leading-relaxed sm:text-sm">
      <code>
        {lines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {line.map((token, tokenIndex) => (
              <span
                key={tokenIndex}
                style={{
                  color: token.color,
                  fontWeight: token.bold ? 700 : undefined,
                  fontStyle: token.italic ? 'italic' : undefined,
                }}
              >
                {token.content}
              </span>
            ))}
            {lineIndex < lines.length - 1 ? '\n' : null}
          </Fragment>
        ))}
      </code>
    </pre>
  );
}
