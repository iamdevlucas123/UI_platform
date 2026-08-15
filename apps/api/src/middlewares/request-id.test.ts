import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { requestId } from './request-id.js';

function buildApp() {
  const app = express();
  app.use(requestId);
  app.get('/ping', (req, res) => res.json({ id: req.id }));
  return app;
}

describe('requestId middleware', () => {
  it('define req.id e devolve o mesmo valor no header X-Request-Id', async () => {
    const response = await request(buildApp()).get('/ping');

    expect(response.status).toBe(200);
    expect(response.headers['x-request-id']).toBeDefined();
    expect(response.body.id).toBe(response.headers['x-request-id']);
  });

  it('gera um id diferente a cada requisição', async () => {
    const app = buildApp();

    const first = await request(app).get('/ping');
    const second = await request(app).get('/ping');

    expect(first.body.id).not.toBe(second.body.id);
  });
});
