import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from './app.js';
import { env } from './config/env.js';

describe('app', () => {
  it('devolve o envelope de erro padronizado em rota inexistente, sem stack trace', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error).not.toHaveProperty('stack');
  });

  it('aplica headers de segurança do helmet', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('reflete exatamente env.WEB_ORIGIN no CORS, nunca um wildcard', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.headers['access-control-allow-origin']).toBe(env.WEB_ORIGIN);
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('devolve o header X-Request-Id em toda resposta', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('aplica o rate limit público (120/min) nas rotas fora de /api/admin', async () => {
    const response = await request(app).get('/api/does-not-exist');
    expect(response.headers['ratelimit-limit']).toBe('120');
  });

  it('aplica o rate limit administrativo (30/min) em /api/admin/*', async () => {
    const response = await request(app).get('/api/admin/does-not-exist');
    expect(response.headers['ratelimit-limit']).toBe('30');
  });

  it('limita o body JSON a 1MB', async () => {
    const response = await request(app)
      .post('/api/does-not-exist')
      .send({ big: 'x'.repeat(2 * 1024 * 1024) });

    expect(response.status).toBe(413);
  });
});
