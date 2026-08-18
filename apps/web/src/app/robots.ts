import type { MetadataRoute } from 'next';

import { publicEnv } from '@/lib/env';

/**
 * `robots.txt` (seção 7 do MVP2): libera só a área pública. `/admin` e
 * `/sign-in` ficam fora do índice mesmo antes de existirem no app — a rota
 * (`/admin(.*)` do `clerkMiddleware`, seção 9) já reserva esses prefixos, e
 * um `Disallow` antecipado é inofensivo. Quando `/admin/*` existir, cada
 * página lá também deve emitir `robots: {index:false}` na própria
 * `generateMetadata`/`metadata` — este arquivo cobre o crawler no nível do
 * site, não substitui isso.
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
