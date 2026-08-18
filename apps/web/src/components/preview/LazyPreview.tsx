'use client';

import { useEffect, useRef, useState } from 'react';

import { SandboxPreview, type SandboxPreviewProps } from './SandboxPreview';

export interface LazyPreviewProps extends SandboxPreviewProps {
  /** Distância antes de entrar no viewport em que já pré-carrega (seção 8: "próximo/visível"). */
  rootMargin?: string;
}

/**
 * Só atribui `srcDoc` ao `SandboxPreview` quando o card entra (ou está perto
 * de entrar) no viewport (seção 8 do MVP2): montar 24+ iframes de uma vez
 * na home é caro, então o skeleton fica no lugar até o `IntersectionObserver`
 * disparar. Uma vez visível, permanece montado (não desmonta ao sair do
 * viewport) — evita recarregar o iframe (e reexecutar o JS do componente)
 * a cada scroll para cima e para baixo.
 */
export function LazyPreview({ rootMargin = '200px', className, background = 'light', ...previewProps }: LazyPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    // Fallback seguro (seção 8): sem suporte a IntersectionObserver, renderiza
    // direto em vez de deixar o skeleton para sempre no lugar do preview.
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return (
    <div ref={containerRef} className={className}>
      {isVisible ? (
        <SandboxPreview {...previewProps} background={background} className="h-full w-full" />
      ) : (
        <PreviewSkeleton background={background} />
      )}
    </div>
  );
}

export function PreviewSkeleton({ background = 'light' }: { background?: SandboxPreviewProps['background'] }) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-testid="preview-skeleton"
      className={[
        'h-full w-full animate-pulse',
        background === 'dark' ? 'bg-neutral-900' : 'bg-neutral-100',
      ].join(' ')}
    />
  );
}
