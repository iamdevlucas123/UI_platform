import type { MetadataRoute } from 'next';

import { serverApi } from '@/lib/api-client';
import { fetchAllPublishedComponents } from '@/lib/catalog-data';
import { publicEnv } from '@/lib/env';

/**
 * `sitemap.xml` (seção 7 do MVP2): só URLs públicas reais — home, cada
 * categoria (`GET /api/categories`, sempre público) e cada componente
 * *publicado* (`fetchAllPublishedComponents`, mesma lista usada pelo
 * `generateStaticParams` de `/component/[slug]`, que só devolve
 * `PUBLISHED` — um DRAFT nunca entra aqui). `/admin`, `/sign-in` e
 * `?preview=1` nunca aparecem: não há nenhum código abaixo que os gere.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;

  const [categoriesResponse, components] = await Promise.all([
    serverApi.getCategories({ revalidate: 300, tags: ['components'] }),
    fetchAllPublishedComponents({ revalidate: 300, tags: ['components'] }),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = categoriesResponse.data.map((category) => ({
    url: `${siteUrl}/category/${category.slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const componentEntries: MetadataRoute.Sitemap = components.map((component) => ({
    url: `${siteUrl}/component/${component.slug}`,
    lastModified: component.createdAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    { url: siteUrl, changeFrequency: 'daily', priority: 1 },
    ...categoryEntries,
    ...componentEntries,
  ];
}
