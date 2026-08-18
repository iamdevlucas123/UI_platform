import type { ComponentDetailDto, ComponentListItemDto } from '@uilib/shared';
import { Children, isValidElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getComponent = vi.fn();
const getComponents = vi.fn();
const auth = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    serverApi: { getComponent, getComponents },
  };
});

vi.mock('@clerk/nextjs/server', () => ({ auth }));
vi.mock('next/navigation', () => ({ notFound }));

// Importado depois dos mocks acima, para pegar os módulos já mockados.
const { default: ComponentPage, generateMetadata, generateStaticParams } = await import('../page');

function makeComponentDetail(overrides: Partial<ComponentDetailDto> = {}): ComponentDetailDto {
  return {
    id: 'c1',
    name: 'Neon Toggle',
    slug: 'neon-toggle',
    description: 'A toggle with neon glow',
    technologies: ['React', 'Tailwind'],
    category: { name: 'Toggles', slug: 'toggles' },
    html: '<button>Toggle</button>',
    css: 'button{color:red}',
    js: null,
    prompt: 'Implement this exact component...',
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

function makeComponentListItem(overrides: Partial<ComponentListItemDto> = {}): ComponentListItemDto {
  return {
    id: 'c1',
    name: 'Neon Toggle',
    slug: 'neon-toggle',
    description: 'A toggle with neon glow',
    technologies: [],
    category: { name: 'Toggles', slug: 'toggles' },
    preview: { html: '<button>Toggle</button>', css: '', js: null },
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

/** Acha o `<script type="application/ld+json">` entre os filhos de `<main>` sem renderizar a árvore (evita o problema de Server Components async aninhados, ex.: `CodeTabs`). */
function findJsonLdScript(mainElement: unknown): { children: string } | undefined {
  if (!isValidElement(mainElement)) {
    throw new Error('esperava um elemento React');
  }
  const children = Children.toArray((mainElement.props as { children?: ReactNode }).children);
  const script = children.find(
    (child) => isValidElement(child) && child.type === 'script',
  );
  return script && isValidElement(script) ? (script.props as { children: string }) : undefined;
}

beforeEach(() => {
  getComponent.mockReset();
  getComponents.mockReset();
  auth.mockReset();
  notFound.mockClear();
});

describe('generateStaticParams (seção 7 do MVP2, via fetchAllPublishedComponents)', () => {
  it('mapeia cada componente publicado para { slug }, paginando até totalPages', async () => {
    getComponents
      .mockResolvedValueOnce({
        data: [makeComponentListItem({ slug: 'a' })],
        meta: { page: 1, limit: 48, total: 2, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [makeComponentListItem({ slug: 'b' })],
        meta: { page: 2, limit: 48, total: 2, totalPages: 2 },
      });

    await expect(generateStaticParams()).resolves.toEqual([{ slug: 'a' }, { slug: 'b' }]);
  });
});

describe('generateMetadata — Open Graph (seção 5.2 do MVP2)', () => {
  it('inclui openGraph com título, descrição, url, tecnologias e data de publicação', async () => {
    getComponent.mockResolvedValue({ data: makeComponentDetail() });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'neon-toggle' }),
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe('Neon Toggle — UI Library');
    expect(metadata.description).toBe('A toggle with neon glow');
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      title: 'Neon Toggle — UI Library',
      description: 'A toggle with neon glow',
      url: 'http://localhost:3000/component/neon-toggle',
      publishedTime: '2026-01-15T00:00:00.000Z',
      tags: ['React', 'Tailwind'],
    });
    expect(metadata.alternates).toEqual({ canonical: 'http://localhost:3000/component/neon-toggle' });
  });

  it('nunca inclui openGraph nem index no ramo de preview (DRAFT em revisão)', async () => {
    getComponent.mockResolvedValue({ data: makeComponentDetail({ name: 'Draft Component' }) });
    auth.mockResolvedValue({
      sessionClaims: { metadata: { role: 'admin' } },
      getToken: vi.fn().mockResolvedValue('admin-token'),
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: 'draft-component' }),
      searchParams: Promise.resolve({ preview: '1' }),
    });

    expect(metadata.title).toBe('Preview: Draft Component — UI Library');
    expect(metadata.openGraph).toBeUndefined();
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe('ComponentPage — JSON-LD (seção 5.2 do MVP2)', () => {
  it('inclui um <script type="application/ld+json"> com os dados públicos do componente, sem html/css/js/prompt', async () => {
    getComponent.mockResolvedValue({ data: makeComponentDetail() });

    const page = await ComponentPage({
      params: Promise.resolve({ slug: 'neon-toggle' }),
      searchParams: Promise.resolve({}),
    });

    const script = findJsonLdScript(page);
    expect(script).toBeDefined();

    const jsonLd = JSON.parse(script!.children);
    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SoftwareSourceCode',
      name: 'Neon Toggle',
      description: 'A toggle with neon glow',
      url: 'http://localhost:3000/component/neon-toggle',
      image: 'http://localhost:3000/component/neon-toggle/opengraph-image',
      programmingLanguage: ['React', 'Tailwind'],
      about: { '@type': 'Thing', name: 'Toggles' },
      datePublished: '2026-01-15T00:00:00.000Z',
    });

    // Nunca vaza código-fonte/prompt pelo JSON-LD.
    const serialized = script!.children;
    expect(serialized).not.toContain(makeComponentDetail().html);
    expect(serialized).not.toContain(makeComponentDetail().css);
    expect(serialized).not.toContain(makeComponentDetail().prompt);
  });

  it('nunca inclui o <script> de JSON-LD no ramo de preview (DRAFT em revisão)', async () => {
    getComponent.mockResolvedValue({ data: makeComponentDetail({ slug: 'draft-component' }) });
    auth.mockResolvedValue({
      sessionClaims: { metadata: { role: 'admin' } },
      getToken: vi.fn().mockResolvedValue('admin-token'),
    });

    const page = await ComponentPage({
      params: Promise.resolve({ slug: 'draft-component' }),
      searchParams: Promise.resolve({ preview: '1' }),
    });

    expect(findJsonLdScript(page)).toBeUndefined();
  });
});
