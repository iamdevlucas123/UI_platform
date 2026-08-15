import { Writable } from 'node:stream';

import pino from 'pino';
import { describe, expect, it } from 'vitest';

import { buildLoggerOptions } from './logger.js';

/**
 * Logger que escreve em um array em memória em vez de stdout, para
 * inspecionar o JSON logado. Força `level: 'trace'` (as opções reais usam
 * `env.LOG_LEVEL`, que em teste é `'error'` — nível que suprimiria os
 * `logger.info(...)` abaixo antes mesmo de chegar à redaction).
 */
function createCapturingLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });

  return { logger: pino({ ...buildLoggerOptions(), level: 'trace' }, stream), lines };
}

describe('buildLoggerOptions', () => {
  it('redige req.headers.authorization e req.headers.cookie', () => {
    const { logger, lines } = createCapturingLogger();

    logger.info({
      req: { headers: { authorization: 'Bearer super-secret', cookie: 'session=abc123' } },
    });

    const logged = JSON.parse(lines[0] ?? '{}');
    expect(logged.req.headers.authorization).toBe('[REDACTED]');
    expect(logged.req.headers.cookie).toBe('[REDACTED]');
  });

  it('redige password em qualquer objeto logado, direto ou aninhado um nível', () => {
    const { logger, lines } = createCapturingLogger();

    logger.info({ password: 'hunter2', user: { password: 'hunter2' } });

    const logged = JSON.parse(lines[0] ?? '{}');
    expect(logged.password).toBe('[REDACTED]');
    expect(logged.user.password).toBe('[REDACTED]');
  });

  it('não redige campos que não estão na lista de redaction', () => {
    const { logger, lines } = createCapturingLogger();

    logger.info({ msg: 'hello', userId: 'dev-admin' });

    const logged = JSON.parse(lines[0] ?? '{}');
    expect(logged.userId).toBe('dev-admin');
  });
});
