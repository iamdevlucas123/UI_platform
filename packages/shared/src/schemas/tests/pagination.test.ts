import { describe, expect, it } from 'vitest';

import { listComponentsQuerySchema } from '../pagination.js';

describe('listComponentsQuerySchema', () => {
  it('aplica os defaults quando todos os params são omitidos', () => {
    const result = listComponentsQuerySchema.parse({});

    expect(result).toEqual({ page: 1, limit: 24, sort: 'recent' });
  });

  it('coerciona page e limit a partir de strings de query', () => {
    const result = listComponentsQuerySchema.parse({ page: '2', limit: '48' });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(48);
  });

  it('rejeita page menor que 1', () => {
    const result = listComponentsQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejeita limit acima do teto de 48', () => {
    const result = listComponentsQuerySchema.safeParse({ limit: '49' });
    expect(result.success).toBe(false);
  });

  it('rejeita limit menor que 1', () => {
    const result = listComponentsQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejeita q fora do intervalo 1-100', () => {
    const empty = listComponentsQuerySchema.safeParse({ q: '' });
    const tooLong = listComponentsQuerySchema.safeParse({ q: 'a'.repeat(101) });

    expect(empty.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });

  it('aceita category em formato de slug e rejeita fora do formato', () => {
    const valid = listComponentsQuerySchema.safeParse({ category: 'toggle-switches' });
    const invalid = listComponentsQuerySchema.safeParse({ category: 'Toggle Switches' });

    expect(valid.success).toBe(true);
    expect(invalid.success).toBe(false);
  });

  it('rejeita sort fora do enum recent/name', () => {
    const result = listComponentsQuerySchema.safeParse({ sort: 'popular' });
    expect(result.success).toBe(false);
  });

  it('aceita sort = name explicitamente', () => {
    const result = listComponentsQuerySchema.parse({ sort: 'name' });
    expect(result.sort).toBe('name');
  });
});
