import type { ComponentListItemDto } from '@uilib/shared';
import Link from 'next/link';

import { LazyPreview } from '@/components/preview/LazyPreview';

export interface ComponentCardProps {
  component: ComponentListItemDto;
}

/**
 * Card do grid (seção 5.1 do MVP2): preview ao vivo preguiçoso, nome (link
 * para `/component/[slug]`) e categoria (link para `/category/[slug]`,
 * seção 7).
 *
 * O card inteiro é clicável via "stretched link" no link do nome
 * (`after:absolute after:inset-0`), que cobre o `<article>` inteiro
 * (`relative`) por cima de qualquer conteúdo não posicionado — por isso o
 * link da categoria só recebe clique/foco por ficar `relative z-10`: isso o
 * coloca na mesma "camada" posicionada do overlay, e a ordem no DOM (depois
 * do nome) o desenha por cima. Sem isso, o overlay do card capturaria todo
 * clique que caísse sobre o texto da categoria.
 *
 * O preview não pode ser um terceiro alvo de clique/foco por baixo do
 * overlay — `inert` (some do tab order, some da árvore de acessibilidade) e
 * `pointer-events-none` tiram o `<iframe>` da navegação por teclado do
 * card, deixando exatamente dois elementos focáveis por item do grid.
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
        <p className="relative z-10 truncate text-xs text-neutral-500">
          <Link href={`/category/${component.category.slug}`} className="hover:text-neutral-800 hover:underline">
            {component.category.name}
          </Link>
        </p>
      </div>
    </article>
  );
}
