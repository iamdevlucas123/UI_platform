import { describe, expect, it } from 'vitest';

import { createCategorySchema, updateCategorySchema } from './category.js';

describe('createCategorySchema', () => {
  it('aceita apenas o name e aplica position = 0 por default', () => {
    const result = createCategorySchema.parse({ name: 'Buttons' });

    expect(result.position).toBe(0);
    expect(result.slug).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('rejeita name fora do intervalo 2-50', () => {
    const tooShort = createCategorySchema.safeParse({ name: 'A' });
    const tooLong = createCategorySchema.safeParse({ name: 'a'.repeat(51) });

    expect(tooShort.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });

  it('rejeita slug fora do formato quando fornecido explicitamente', () => {
    const result = createCategorySchema.safeParse({ name: 'Buttons', slug: 'Botões Legais' });
    expect(result.success).toBe(false);
  });

  it('aceita slug explícito válido, sobrepondo a derivação automática', () => {
    const result = createCategorySchema.parse({ name: 'Buttons', slug: 'buttons' });
    expect(result.slug).toBe('buttons');
  });

  it('rejeita description acima de 300 caracteres', () => {
    const result = createCategorySchema.safeParse({
      name: 'Buttons',
      description: 'a'.repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it('rejeita position não inteiro', () => {
    const result = createCategorySchema.safeParse({ name: 'Buttons', position: 1.5 });
    expect(result.success).toBe(false);
  });
});

describe('updateCategorySchema', () => {
  it('rejeita body vazio', () => {
    const result = updateCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('aceita um único campo sem exigir os demais campos de criação', () => {
    const result = updateCategorySchema.safeParse({ position: 3 });
    expect(result.success).toBe(true);
  });

  it('não aplica o default de position a campos omitidos', () => {
    const result = updateCategorySchema.parse({ name: 'Novo nome' });
    expect(result).not.toHaveProperty('position');
  });
});
