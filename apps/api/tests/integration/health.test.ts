import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

/**
 * Teste de integração de `GET /api/health` (seção 7 e 13 do MVP1). Requer
 * um Postgres real acessível via `DATABASE_URL` — sem banco, o caminho de
 * sucesso falha (esperado: o endpoint existe justamente para reportar essa
 * indisponibilidade, não para escondê-la).
 */
describe('GET /api/health', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna 200 com status/db "ok" e uptime numérico quando o banco responde', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      uptime: expect.any(Number),
      db: 'ok',
    });
  });

  it('encaminha falha do banco ao error-handler em vez de mascarar a indisponibilidade', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('connection refused'));

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.',
      },
    });
    // A causa real do erro vai só para o log, nunca para o cliente (seção 10).
    expect(JSON.stringify(response.body)).not.toContain('connection refused');
  });
});
