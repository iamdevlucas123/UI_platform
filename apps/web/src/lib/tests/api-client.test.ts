import { afterEach, describe, expect, it, vi } from 'vitest';

import { adminApi, ApiError, browserApi, buildQueryString, serverApi } from '../api-client';

/** Monta um `Response` fake e injeta como `global.fetch` para o teste atual. */
function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const init = status === 204 ? null : JSON.stringify(body);
  const response = new Response(init, {
    status,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildQueryString', () => {
  it('retorna string vazia sem parâmetros', () => {
    expect(buildQueryString()).toBe('');
    expect(buildQueryString({})).toBe('');
  });

  it('serializa strings, números e booleanos', () => {
    expect(buildQueryString({ q: 'neon toggle', page: 2, active: true })).toBe(
      '?q=neon+toggle&page=2&active=true',
    );
  });

  it('descarta chaves undefined e null, preservando as demais', () => {
    expect(buildQueryString({ q: undefined, category: null, page: 1 })).toBe('?page=1');
  });
});

describe('serverApi', () => {
  it('getHealth() usa INTERNAL_API_URL e não exige envelope {data}', async () => {
    const fetchMock = stubFetch(200, { status: 'ok', uptime: 12.5, db: 'ok' });

    const result = await serverApi.getHealth();

    expect(result).toEqual({ status: 'ok', uptime: 12.5, db: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://api:4000/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('getComponents() monta a querystring e valida o envelope de lista', async () => {
    const meta = { page: 2, limit: 24, total: 1, totalPages: 1 };
    const fetchMock = stubFetch(200, { data: [{ id: 'c1' }], meta });

    const result = await serverApi.getComponents({ q: 'toggle', page: 2 });

    expect(result).toEqual({ data: [{ id: 'c1' }], meta });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('http://api:4000/api/components?q=toggle&page=2');
  });

  it('getComponents() rejeita com ApiError quando "meta" está ausente/inválido', async () => {
    stubFetch(200, { data: [] });

    await expect(serverApi.getComponents()).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('getComponent() envia preview=1 só quando solicitado', async () => {
    const fetchMock = stubFetch(200, { data: { slug: 'neon-toggle' } });

    await serverApi.getComponent('neon-toggle', { preview: true });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('http://api:4000/api/components/neon-toggle?preview=1');
  });
});

describe('browserApi', () => {
  it('getComponentPrompt() usa NEXT_PUBLIC_API_URL, sem Authorization', async () => {
    const fetchMock = stubFetch(200, { data: { prompt: 'Build a button...' } });

    const result = await browserApi.getComponentPrompt('neon-toggle', {
      framework: 'vue',
      styling: 'css',
    });

    expect(result).toEqual({ data: { prompt: 'Build a button...' } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/api/components/neon-toggle/prompt?framework=vue&styling=css');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

describe('adminApi', () => {
  it('createComponent() envia POST com Bearer token e body serializado', async () => {
    const fetchMock = stubFetch(201, { data: { id: 'c1', slug: 'neon-toggle' } });
    const input = { name: 'Neon Toggle', slug: 'neon-toggle' };

    await adminApi.createComponent(input as never, 'session-token');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/api/admin/components');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer session-token');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify(input));
  });

  it('deleteComponent() em 204 resolve sem corpo', async () => {
    stubFetch(204, undefined);

    await expect(adminApi.deleteComponent('c1', 'session-token')).resolves.toBeUndefined();
  });
});

describe('tratamento de erro', () => {
  it('preserva status, code, message e details do envelope de erro (409)', async () => {
    stubFetch(409, {
      error: {
        code: 'CONFLICT',
        message: 'Slug already in use',
        details: [{ path: 'slug', message: 'Slug already in use' }],
      },
    });

    await expect(adminApi.createComponent({} as never, 't')).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Slug already in use',
      details: [{ path: 'slug', message: 'Slug already in use' }],
    });
  });

  it.each([401, 403, 404, 422])('propaga o status %i mesmo sem details', async (status) => {
    stubFetch(status, { error: { code: 'X', message: 'nope' } });

    await expect(adminApi.getComponent('id', 't')).rejects.toMatchObject({ status, code: 'X' });
  });

  it('corpo de erro fora do formato esperado vira ApiError genérico', async () => {
    stubFetch(500, { oops: true });

    await expect(serverApi.getCategories()).rejects.toMatchObject({
      status: 500,
      code: 'UNKNOWN_ERROR',
    });
  });

  it('JSON inválido no corpo vira ApiError em vez de propagar o SyntaxError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async () => new Response('{not valid json', { status: 200 })),
    );

    await expect(serverApi.getCategories()).rejects.toBeInstanceOf(ApiError);
    await expect(serverApi.getCategories()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('falha de rede (fetch rejeita) vira ApiError com status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));

    await expect(serverApi.getCategories()).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('ApiError preserva os campos passados ao construtor', () => {
    const error = new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Category not found', [
      { path: 'categoryId', message: 'Category not found' },
    ]);

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(422);
    expect(error.code).toBe('UNPROCESSABLE_ENTITY');
    expect(error.message).toBe('Category not found');
    expect(error.details).toEqual([{ path: 'categoryId', message: 'Category not found' }]);
  });
});
