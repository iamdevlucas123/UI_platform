import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createRateLimiter } from '../rate-limit.js';

function buildApp(limit: number) {
  const app = express();
  app.use(createRateLimiter(limit));
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('createRateLimiter', () => {
  it('permite requisições dentro do limite', async () => {
    const app = buildApp(2);

    const first = await request(app).get('/ping');
    const second = await request(app).get('/ping');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('responde 429 com o envelope de erro padronizado ao exceder o limite', async () => {
    const app = buildApp(2);

    await request(app).get('/ping');
    await request(app).get('/ping');
    const third = await request(app).get('/ping');

    expect(third.status).toBe(429);
    expect(third.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
      },
    });
  });
});
