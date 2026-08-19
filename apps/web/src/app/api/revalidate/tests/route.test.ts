import { beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();

vi.mock('next/cache', () => ({ revalidateTag }));

// Importado depois do mock acima, para pegar `next/cache` já mockado.
const { POST } = await import('../route');

function makeRequest(authorizationHeader?: string): Request {
  return new Request('http://localhost:3000/api/revalidate', {
    method: 'POST',
    headers: authorizationHeader ? { Authorization: authorizationHeader } : undefined,
  });
}

beforeEach(() => {
  revalidateTag.mockClear();
});

describe('POST /api/revalidate (seção 7/13 do MVP2)', () => {
  it('retorna 401 e não revalida nada sem o secret correto', async () => {
    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('retorna 401 e não revalida nada com um secret errado', async () => {
    const response = await POST(makeRequest('Bearer secret-errado'));

    expect(response.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('revalida a tag "components" e retorna 200 com o secret correto', async () => {
    const response = await POST(makeRequest('Bearer test-revalidate-secret'));

    expect(response.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('components');
    const body = await response.json();
    expect(body.revalidated).toBe(true);
  });
});
