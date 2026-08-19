import type { MetadataRoute } from 'next';

import { publicEnv } from '@/lib/env';

/**
 * `robots.txt` (seção 7 do MVP2): libera só a área pública. `/admin` e
 * `/sign-in` ficam fora do índice a nível de crawler; cada página de
 * `/admin/*` também emite `robots: {index:false}` na própria metadata
 * (`app/admin/layout.tsx`, seção 9) — este arquivo é defesa em
 * profundidade, não a única camada.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/sign-in'],
    },
    sitemap: `${publicEnv.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
