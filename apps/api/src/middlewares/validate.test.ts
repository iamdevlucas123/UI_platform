import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { errorHandler } from './error-handler.js';
import { requestId } from './request-id.js';
import { validate } from './validate.js';

const bodySchema = z.object({
  name: z.string().min(2),
  // Testa que o resultado transformado (não o cru) é o que chega no handler.
  tags: z.array(z.string()).transform((tags) => Array.from(new Set(tags))),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.post('/body', validate('body', bodySchema), (req, res) => res.json(req.body));
  app.get('/query', validate('query', querySchema), (req, res) => res.json(req.query));
  app.use(errorHandler);
  return app;
}

describe('validate middleware', () => {
  it('substitui req.body pelo resultado parseado/transformado do schema', async () => {
    const response = await request(buildApp())
      .post('/body')
      .send({ name: 'Neon Toggle', tags: ['HTML', 'CSS', 'HTML'] });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ name: 'Neon Toggle', tags: ['HTML', 'CSS'] });
  });

  it('retorna 400 com o envelope de erro e um detail por campo inválido', async () => {
    const response = await request(buildApp()).post('/body').send({ name: 'a', tags: [] });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'name' })]),
    );
  });

  it('substitui req.query mesmo sendo um getter sem setter no Express 5', async () => {
    const response = await request(buildApp()).get('/query').query({ page: '3' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ page: 3 });
  });

  it('aplica o default de query quando o param é omitido', async () => {
    const response = await request(buildApp()).get('/query');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ page: 1 });
  });

  it('retorna 400 quando a query é inválida', async () => {
    const response = await request(buildApp()).get('/query').query({ page: '0' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
