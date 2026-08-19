import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../../config/env.js';
import { revalidate } from '../revalidate.js';

describe('revalidate (seção 7/13 do MVP2: notifica o Next.js após mutações admin)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('faz POST em /api/revalidate com o secret compartilhado no header Authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await revalidate();

    expect(fetchMock).toHaveBeenCalledWith(`${env.WEB_ORIGIN}/api/revalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.REVALIDATE_SECRET}` },
    });
  });

  it('nunca lança quando a resposta não é ok — só é best-effort', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(revalidate()).resolves.toBeUndefined();
  });

  it('nunca lança quando o fetch falha (rede indisponível) — a mutação já foi persistida', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(revalidate()).resolves.toBeUndefined();
  });
});
