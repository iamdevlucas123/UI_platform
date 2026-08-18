import { describe, expect, it } from 'vitest';

import robots from '../robots';

describe('robots (seção 7 do MVP2: libera a área pública, /admin e /sign-in fora do índice)', () => {
  it('permite tudo por padrão, exceto /admin e /sign-in', () => {
    const result = robots();

    expect(result.rules).toEqual({
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/sign-in'],
    });
  });

  it('aponta para o sitemap sob NEXT_PUBLIC_SITE_URL', () => {
    const result = robots();

    expect(result.sitemap).toBe('http://localhost:3000/sitemap.xml');
  });
});
