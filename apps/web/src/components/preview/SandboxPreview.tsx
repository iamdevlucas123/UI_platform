'use client';

import { useMemo } from 'react';

import { buildSrcDoc, type BuildSrcDocInput } from '@/lib/build-srcdoc';

/** Fundo da área externa ao componente (seção 5.2 do MVP2: alternância claro/escuro). */
export type PreviewBackground = 'light' | 'dark';

export const PREVIEW_BACKGROUND_CLASS: Record<PreviewBackground, string> = {
  light: 'bg-white',
  dark: 'bg-neutral-950',
};

export interface SandboxPreviewProps extends BuildSrcDocInput {
  background?: PreviewBackground;
  className?: string;
  title?: string;
}

/**
 * Preview funcional de um componente (seção 8 do MVP2): renderiza
 * exclusivamente em `<iframe sandbox="allow-scripts" srcDoc={...}>`, sem
 * `allow-same-origin` e sem o atributo `allow` — a origem opaca resultante
 * é a única barreira de segurança contra o HTML/CSS/JS arbitrário do
 * componente, então nenhuma permissão extra deve ser adicionada aqui.
 *
 * `srcDoc` é uma propriedade do elemento, não HTML injetado no DOM React —
 * não há `dangerouslySetInnerHTML` neste componente.
 */
export function SandboxPreview({
  html,
  css,
  js,
  background = 'light',
  className,
  title = 'Live component preview',
}: SandboxPreviewProps) {
  const srcDoc = useMemo(() => buildSrcDoc({ html, css, js }), [html, css, js]);

  return (
    <iframe
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      loading="lazy"
      referrerPolicy="no-referrer"
      className={['border-0', PREVIEW_BACKGROUND_CLASS[background], className].filter(Boolean).join(' ')}
    />
  );
}
