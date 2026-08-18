import { ImageResponse } from 'next/og';

import { serverApi } from '@/lib/api-client';

/**
 * Imagem Open Graph da categoria (seção 5.2 do MVP2), gerada em runtime com
 * `ImageResponse` — sem upload nem dependência de imagem externa.
 *
 * Necessária porque `opengraph-image.tsx` **não cascateia** para segmentos
 * filhos como `loading.tsx`/`error.tsx` (confirmado manualmente: sem este
 * arquivo, `/category/[slug]` não emitia nenhuma tag `og:image`, mesmo com
 * `app/opengraph-image.tsx` na raiz) — cada rota precisa do seu próprio.
 */
export const alt = 'Category preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function CategoryOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: categories } = await serverApi.getCategories({ revalidate: 300, tags: ['components'] });
  const category = categories.find((item) => item.slug === slug);

  const title = category?.name ?? 'Category not found';
  const description =
    category?.description?.trim() ||
    (category ? `Browse ${category.name} components in the library.` : '');

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #262626 100%)',
          color: '#fafafa',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 600, opacity: 0.6, letterSpacing: 2 }}>
          UI LIBRARY
        </div>
        <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, marginTop: 20 }}>{title}</div>
        {description && (
          <div style={{ display: 'flex', fontSize: 30, marginTop: 24, opacity: 0.8, maxWidth: 960 }}>
            {description}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
