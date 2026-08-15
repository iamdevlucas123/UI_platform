import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { ValidationError } from '../lib/errors.js';
import { errorHandler } from './error-handler.js';
import { requestId } from './request-id.js';

function buildApp() {
  const app = express();
  app.use(requestId);
  app.get('/known', (_req, _res, next) => {
    next(new ValidationError('Invalid payload', [{ path: 'slug', message: 'Required' }]));
  });
  app.get('/unknown', () => {
    throw new Error('leaky internal detail: db password is hunter2');
  });
  app.get('/unknown-async', async () => {
    // Express 5 encaminha rejeições de handlers async automaticamente ao
    // error-handler, sem precisar de wrapper (seção 3 do MVP1).
    throw new Error('async leaky internal detail');
  });
  app.get('/exposed-http-error', () => {
    // Formato usado por body-parser (ex.: PayloadTooLargeError do limite de
    // express.json({ limit: '1mb' })): status próprio + expose: true.
    const error = Object.assign(new Error('request entity too large'), {
      statusCode: 413,
      expose: true,
    });
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('usa statusCode/code/message/details de um AppError', async () => {
    const response = await request(buildApp()).get('/known');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid payload',
        details: [{ path: 'slug', message: 'Required' }],
      },
    });
  });

  it('preserva o status de erros HTTP conhecidos do Express (ex.: 413 do body-parser)', async () => {
    const response = await request(buildApp()).get('/exposed-http-error');

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: { code: 'BAD_REQUEST', message: 'request entity too large' },
    });
  });

  it('converte erro inesperado (síncrono) em 500 genérico, sem vazar a mensagem original', async () => {
    const response = await request(buildApp()).get('/unknown');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
  });

  it('converte erro inesperado (assíncrono) em 500 genérico', async () => {
    const response = await request(buildApp()).get('/unknown-async');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('nunca inclui stack trace no corpo da resposta', async () => {
    const known = await request(buildApp()).get('/known');
    const unknown = await request(buildApp()).get('/unknown');

    expect(known.body.error).not.toHaveProperty('stack');
    expect(unknown.body.error).not.toHaveProperty('stack');
  });
});
