import { describe, expect, it } from 'vitest';

import { resolvePublishedAt } from '../components.service.js';

describe('resolvePublishedAt', () => {
  it('define a data ao transicionar de DRAFT (nula) para PUBLISHED', () => {
    const result = resolvePublishedAt(null, 'PUBLISHED');

    expect(result).toBeInstanceOf(Date);
  });

  it('preserva a data original ao republicar (PUBLISHED → DRAFT → PUBLISHED)', () => {
    const firstPublish = new Date('2026-01-01T00:00:00.000Z');

    const result = resolvePublishedAt(firstPublish, 'PUBLISHED');

    expect(result).toBe(firstPublish);
  });

  it('mantém a data ao transicionar para DRAFT', () => {
    const firstPublish = new Date('2026-01-01T00:00:00.000Z');

    const result = resolvePublishedAt(firstPublish, 'DRAFT');

    expect(result).toBe(firstPublish);
  });

  it('permanece nula ao permanecer em DRAFT', () => {
    const result = resolvePublishedAt(null, 'DRAFT');

    expect(result).toBeNull();
  });
});
