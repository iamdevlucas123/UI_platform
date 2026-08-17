import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../errors.js';

describe('AppError', () => {
  it('é uma instância de Error com statusCode/code/message/details', () => {
    const error = new AppError(418, 'TEAPOT', "I'm a teapot", [
      { path: 'x', message: 'boom' },
    ]);

    expect(error).toBeInstanceOf(Error);
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe('TEAPOT');
    expect(error.message).toBe("I'm a teapot");
    expect(error.details).toEqual([{ path: 'x', message: 'boom' }]);
  });
});

describe('ValidationError', () => {
  it('usa 400/VALIDATION_ERROR e aceita details', () => {
    const error = new ValidationError('Invalid payload', [
      { path: 'slug', message: 'Required' },
    ]);

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual([{ path: 'slug', message: 'Required' }]);
  });

  it('tem uma mensagem default', () => {
    expect(new ValidationError().message).toBe('Invalid payload');
  });
});

describe('NotFoundError', () => {
  it('usa 404/NOT_FOUND', () => {
    const error = new NotFoundError('Component not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });
});

describe('ConflictError', () => {
  it('usa 409/CONFLICT por default', () => {
    const error = new ConflictError('Slug already in use');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('aceita um código específico, como CATEGORY_IN_USE (seção 7 do MVP1)', () => {
    const error = new ConflictError('Category has components', 'CATEGORY_IN_USE', [
      { path: 'componentCount', message: '3' },
    ]);

    expect(error.code).toBe('CATEGORY_IN_USE');
    expect(error.details).toEqual([{ path: 'componentCount', message: '3' }]);
  });
});

describe('UnauthorizedError', () => {
  it('usa 401/UNAUTHORIZED', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });
});

describe('ForbiddenError', () => {
  it('usa 403/FORBIDDEN', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});
