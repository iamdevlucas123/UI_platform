import pino, { type LoggerOptions } from 'pino';

import { env } from '../config/env.js';

/**
 * Opções do logger isoladas em função (em vez de embutidas direto no
 * `pino(...)` abaixo) para permitir testar a redaction instanciando um
 * logger próprio com um stream capturado, sem depender do stdout real usado
 * pelo `logger` exportado.
 *
 * Redação de `authorization`, `cookie` e `password` (seção 10 do MVP1):
 * evita vazar segredos em log mesmo que algum objeto logado os contenha.
 */
export function buildLoggerOptions(): LoggerOptions {
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password'],
      censor: '[REDACTED]',
    },
  };
}

/** Logger estruturado (JSON) usado por toda a aplicação (seção 3 do MVP1). */
export const logger = pino(buildLoggerOptions());
