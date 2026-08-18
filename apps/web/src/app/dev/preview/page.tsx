import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PreviewPlayground } from './preview-playground';

/**
 * Rota interna para validar `SandboxPreview`/`LazyPreview` isoladamente
 * (seção 8 do MVP2: "recomenda-se prototipar SandboxPreview isoladamente
 * antes de construir o restante da UI em cima dele") — não faz parte do
 * catálogo. `noindex` cobre motores de busca; bloquear em produção evita
 * que a rota fique alcançável fora de ambiente de desenvolvimento.
 */
export const metadata: Metadata = {
  title: 'Preview sandbox (dev)',
  robots: { index: false, follow: false },
};

/**
 * Força avaliação por request em vez de estática: sem isto, o `notFound()`
 * abaixo rodaria uma única vez em `next build` e o resultado (conteúdo ou
 * 404) ficaria congelado no HTML pré-renderizado — o valor de `NODE_ENV`
 * do ambiente que rodou o build deixaria de importar depois disso. Com a
 * rota dinâmica, o runtime real (`next start`) é sempre quem decide.
 */
export const dynamic = 'force-dynamic';

export default function PreviewDevPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <PreviewPlayground />;
}
