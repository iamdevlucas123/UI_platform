'use client';

import { useState } from 'react';

import { SandboxPreview, type PreviewBackground } from './SandboxPreview';
import { ThemeToggle } from './ThemeToggle';

export interface ComponentPreviewPanelProps {
  html: string;
  css: string;
  js: string | null;
}

/**
 * Preview funcional em área ampla, com alternância de fundo claro/escuro
 * (seção 5.2 do MVP2) — combina `SandboxPreview` + `ThemeToggle` (já
 * prototipados isoladamente em `/dev/preview`, seção 8) numa única instância
 * sempre acima da dobra na página de detalhe. Não usa `LazyPreview`: o custo
 * que o lazy-load evita é o de montar 24+ iframes de uma vez no grid da
 * home, que não existe aqui (é sempre um único iframe, já visível).
 */
export function ComponentPreviewPanel({ html, css, js }: ComponentPreviewPanelProps) {
  const [background, setBackground] = useState<PreviewBackground>('light');

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-neutral-700">Preview</h2>
        <ThemeToggle value={background} onChange={setBackground} />
      </div>
      <SandboxPreview
        html={html}
        css={css}
        js={js}
        background={background}
        className="h-96 w-full rounded-lg border border-neutral-200"
      />
    </section>
  );
}
