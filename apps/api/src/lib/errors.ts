import type { ApiErrorDetail } from '@uilib/shared';

/**
 * Erro base de domínio: toda falha esperada da aplicação estende esta
 * classe. O `error-handler` usa `statusCode`/`code`/`details` para montar o
 * envelope padronizado do MVP1 (seção 7); qualquer erro que não seja
 * `AppError` é tratado como falha inesperada (500), sem detalhes expostos
 * ao cliente.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** 400 — payload de request inválido (body/query/params não passou no Zod). */
export class ValidationError extends AppError {
  constructor(message = 'Invalid payload', details?: ApiErrorDetail[]) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

/** 404 — recurso não encontrado. */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

/**
 * 409 — conflito de estado (ex.: slug duplicado, categoria em uso). `code`
 * é sobrescrevível porque o MVP1 define códigos específicos por caso — ex.:
 * `CATEGORY_IN_USE` (seção 7) — além do genérico `CONFLICT`.
 */
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', details?: ApiErrorDetail[]) {
    super(409, code, message, details);
  }
}

/** 401 — autenticação ausente ou inválida (token errado/faltando). */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

/** 403 — autenticado, mas sem permissão para executar a ação. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}
