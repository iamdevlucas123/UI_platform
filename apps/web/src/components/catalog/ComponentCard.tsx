import type { ComponentListItemDto } from '@uilib/shared';
import Link from 'next/link';

import { LazyPreview } from '@/components/preview/LazyPreview';

export interface ComponentCardProps {
  component: ComponentListItemDto;
}

/**
 * Card do grid (seção 5.1 do MVP2): preview ao vivo preguiçoso, nome,
 * categoria e um único link acessível para `/component/[slug]`.
 *
 * O card inteiro é clicável via "stretched link" (`after:absolute
 * after:inset-0` no `<Link>`), então o preview não pode ser mais um alvo de
 * clique/foco por baixo dele — `inert` (some do tab order, some da árvore
 * de acessibilidade) e `pointer-events-none` tiram o `<iframe>` da
 * navegação por teclado do card, deixando exatamente um elemento focável
 * por item do grid.
 */
export function ComponentCard({ component }: ComponentCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 transition-colors hover:border-neutral-300">
      {/* `inert` (atributo HTML padrão, React 19 repassa para o DOM) tira o preview do tab order e da árvore de acessibilidade. */}
      <div inert className="pointer-events-none h-40 w-full border-b border-neutral-200">
        <LazyPreview
          html={component.preview.html}
          css={component.preview.css}
          js={component.preview.js}
          className="h-full w-full"
        />
      </div>
      <div className="flex flex-col gap-1 p-3">
        <h3 className="truncate text-sm font-medium text-neutral-900">
          <Link href={`/component/${component.slug}`} className="after:absolute after:inset-0">
            {component.name}
            <span className="sr-only"> — {component.category.name}</span>
          </Link>
        </h3>
        <p className="truncate text-xs text-neutral-500">{component.category.name}</p>
      </div>
    </article>
  );
}
