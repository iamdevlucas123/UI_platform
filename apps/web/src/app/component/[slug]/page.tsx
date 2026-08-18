import { auth } from '@clerk/nextjs/server';
import type { ComponentDetailDto } from '@uilib/shared';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CodeTabs } from '@/components/code/CodeTabs';
import { CopyCodeButton } from '@/components/code/CopyCodeButton';
import { ComponentPreviewPanel } from '@/components/preview/ComponentPreviewPanel';
import { ApiError, serverApi } from '@/lib/api-client';

interface ComponentPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * `/component/[slug]` — página de detalhes (seção 5.2 do MVP2): nome,
 * categoria (link), descrição em texto puro, tecnologias, preview funcional
 * amplo com alternância clara/escura (`ComponentPreviewPanel`, que reaproveita
 * `SandboxPreview`/`ThemeToggle` da seção 8), código em abas (`CodeTabs`,
 * highlight no servidor) e "Copy Code" (`CopyCodeButton`). "Copy AI Prompt"
 * e o seletor de stack ficam fora desta tarefa (sem integração com LLM).
 *
 * De propósito, esta pasta não tem `loading.tsx` — mesmo motivo documentado
 * em `app/category/[slug]/page.tsx`: qualquer `<Suspense>` acima do
 * `notFound()` abaixo faz o Next.js responder 200 antes do componente
 * assíncrono resolver.
 */

const COMPONENTS_LIST_PAGE_SIZE = 48;

/** Pré-renderiza os slugs conhecidos (seção 7 do MVP2). `getComponents` só retorna `PUBLISHED` (seção 7 do MVP1) — um DRAFT nunca entra aqui. */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const slugs: string[] = [];
  let page = 1;

  for (;;) {
    const response = await serverApi.getComponents(
      { page, limit: COMPONENTS_LIST_PAGE_SIZE },
      { revalidate: 300, tags: ['components'] },
    );
    slugs.push(...response.data.map((item) => item.slug));

    if (response.data.length === 0 || page >= response.meta.totalPages) {
      break;
    }
    page += 1;
  }

  return slugs.map((slug) => ({ slug }));
}

function toSingleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Só resolve um token quando a sessão do Clerk tem `role: 'admin'` (seção 9
 * do MVP2) — nunca enviamos `preview=1`/`Authorization` fora desse caso, nem
 * quando `previewRequested` vem de alguém manipulando a URL sem sessão ou
 * sem o papel: `sessionClaims` é `null`/sem `metadata.role` para essa
 * pessoa, então a checagem abaixo já devolve `null` antes de qualquer
 * chamada à API (fluxo 3/seção 11 do MVP2).
 */
async function resolveAdminPreviewToken(previewRequested: boolean): Promise<string | null> {
  if (!previewRequested) {
    return null;
  }

  const { sessionClaims, getToken } = await auth();
  if (sessionClaims?.metadata?.role !== 'admin') {
    return null;
  }

  return getToken();
}

interface LoadedComponent {
  component: ComponentDetailDto;
  /** `true` só quando a API foi consultada com `preview=1` **e** um token de admin válido (seção 9/11 do MVP2). */
  isPreview: boolean;
}

/**
 * Busca o componente (seção 5.2 do MVP2). `preserve a regra da API`: só
 * passamos `preview: true` quando já resolvemos um token — se a sessão não é
 * admin, a request é idêntica à de um visitante anônimo, então participa do
 * mesmo cache ISR (`tags: ['components']`); em preview real, a resposta pode
 * conter um DRAFT específico da sessão e nunca deve entrar no cache
 * compartilhado.
 */
async function loadComponent(
  slug: string,
  resolvedSearchParams: Record<string, string | string[] | undefined>,
): Promise<LoadedComponent> {
  const previewRequested = toSingleValue(resolvedSearchParams.preview) === '1';
  const token = await resolveAdminPreviewToken(previewRequested);
  const isPreview = Boolean(token);

  const response = await serverApi.getComponent(
    slug,
    { preview: isPreview, token: token ?? undefined },
    isPreview ? { revalidate: 0 } : { revalidate: 300, tags: ['components'] },
  );

  return { component: response.data, isPreview };
}

export async function generateMetadata({ params, searchParams }: ComponentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  try {
    const { component, isPreview } = await loadComponent(slug, resolvedSearchParams);

    // DRAFT em revisão: nunca entra em metadata pública/índice de busca
    // (seção 11 do MVP2) — só o essencial para o admin identificar a aba.
    if (isPreview) {
      return {
        title: `Preview: ${component.name} — UI Library`,
        robots: { index: false, follow: false },
      };
    }

    return {
      title: `${component.name} — UI Library`,
      description: component.description,
    };
  } catch {
    // Slug inexistente (ou falha inesperada): metadata vazia — a página em
    // si resolve notFound()/o erro correspondente.
    return {};
  }
}

export default async function ComponentPage({ params, searchParams }: ComponentPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  let component: ComponentDetailDto;
  let isPreview: boolean;

  try {
    const result = await loadComponent(slug, resolvedSearchParams);
    component = result.component;
    isPreview = result.isPreview;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const hasTechnologies = component.technologies.length > 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
      <Link
        href="/"
        className="flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to library
      </Link>

      {isPreview && (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          Preview mode — you&apos;re viewing this as an admin. This component may not be publicly
          visible yet.
        </p>
      )}

      <header className="flex flex-col gap-2">
        <Link
          href={`/category/${component.category.slug}`}
          className="w-fit text-xs font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-800 hover:underline"
        >
          {component.category.name}
        </Link>
        <h1 className="text-2xl font-semibold text-neutral-900">{component.name}</h1>
        {/* Texto puro (seção 11 do MVP2): React escapa por padrão, sem Markdown/HTML. */}
        <p className="text-sm text-neutral-600">{component.description}</p>
        {hasTechnologies && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {component.technologies.map((technology) => (
              <li
                key={technology}
                className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600"
              >
                {technology}
              </li>
            ))}
          </ul>
        )}
      </header>

      <ComponentPreviewPanel html={component.html} css={component.css} js={component.js} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium text-neutral-700">Code</h2>
          <CopyCodeButton html={component.html} css={component.css} js={component.js} />
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <CodeTabs html={component.html} css={component.css} js={component.js} />
        </div>
      </section>
    </main>
  );
}
