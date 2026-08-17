import { describe, expect, it } from 'vitest';

import {
  componentPromptQuerySchema,
  createComponentSchema,
  updateComponentSchema,
} from '../component.js';

/** Payload mínimo válido para criação, usado como base nos testes. */
const validPayload = {
  name: 'Neon Toggle Switch',
  slug: 'neon-toggle-switch',
  description: 'Um toggle com glow neon e transição suave.',
  categoryId: 'clx1a2b3c4d5e6f7g8h9i0j1',
  html: '<label class="switch"></label>',
  css: '.switch { display: block; }',
};

describe('createComponentSchema', () => {
  it('aceita o payload mínimo e aplica os defaults de technologies e status', () => {
    const result = createComponentSchema.parse(validPayload);

    expect(result.technologies).toEqual([]);
    expect(result.status).toBe('DRAFT');
  });

  it('deduplica technologies preservando a primeira ocorrência', () => {
    const result = createComponentSchema.parse({
      ...validPayload,
      technologies: ['HTML', 'CSS', 'HTML'],
    });

    expect(result.technologies).toEqual(['HTML', 'CSS']);
  });

  it('rejeita mais de 10 technologies', () => {
    const result = createComponentSchema.safeParse({
      ...validPayload,
      technologies: Array.from({ length: 11 }, (_, i) => `tech-${i}`),
    });

    expect(result.success).toBe(false);
  });

  it.each(['Neon Toggle', 'neon--toggle', 'neon_toggle', 'n'])(
    'rejeita slug fora do formato: %s',
    (slug) => {
      const result = createComponentSchema.safeParse({ ...validPayload, slug });
      expect(result.success).toBe(false);
    },
  );

  it('aceita slug nos limites de 2 e 80 caracteres', () => {
    const min = createComponentSchema.safeParse({ ...validPayload, slug: 'ab' });
    const max = createComponentSchema.safeParse({ ...validPayload, slug: 'a'.repeat(80) });

    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });

  it('rejeita description fora do intervalo 10-500', () => {
    const tooShort = createComponentSchema.safeParse({
      ...validPayload,
      description: 'curta',
    });
    const tooLong = createComponentSchema.safeParse({
      ...validPayload,
      description: 'a'.repeat(501),
    });

    expect(tooShort.success).toBe(false);
    expect(tooLong.success).toBe(false);
  });

  it('rejeita categoryId que não é um cuid', () => {
    const result = createComponentSchema.safeParse({
      ...validPayload,
      categoryId: 'not-a-cuid',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita html vazio, mas aceita css vazio', () => {
    const emptyHtml = createComponentSchema.safeParse({ ...validPayload, html: '' });
    const emptyCss = createComponentSchema.safeParse({ ...validPayload, css: '' });

    expect(emptyHtml.success).toBe(false);
    expect(emptyCss.success).toBe(true);
  });

  it('aceita js e promptTemplate ausentes, nulos ou preenchidos', () => {
    const omitted = createComponentSchema.safeParse(validPayload);
    const nulls = createComponentSchema.safeParse({ ...validPayload, js: null, promptTemplate: null });
    const filled = createComponentSchema.safeParse({
      ...validPayload,
      js: 'console.log(1)',
      promptTemplate: 'template custom',
    });

    expect(omitted.success).toBe(true);
    expect(nulls.success).toBe(true);
    expect(filled.success).toBe(true);
  });

  it('rejeita status fora do enum DRAFT/PUBLISHED', () => {
    const result = createComponentSchema.safeParse({ ...validPayload, status: 'ARCHIVED' });
    expect(result.success).toBe(false);
  });
});

describe('updateComponentSchema', () => {
  it('rejeita body vazio', () => {
    const result = updateComponentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('aceita um único campo válido sem exigir os demais campos de criação', () => {
    const result = updateComponentSchema.safeParse({ name: 'Novo nome' });
    expect(result.success).toBe(true);
  });

  it('não aplica defaults de criação a campos omitidos (technologies e status ficam ausentes)', () => {
    const result = updateComponentSchema.parse({ name: 'Novo nome' });

    expect(result).not.toHaveProperty('technologies');
    expect(result).not.toHaveProperty('status');
  });

  it('ainda valida o formato de campos fornecidos parcialmente', () => {
    const result = updateComponentSchema.safeParse({ slug: 'Slug Inválido' });
    expect(result.success).toBe(false);
  });
});

describe('componentPromptQuerySchema', () => {
  it('aplica os defaults react/tailwind quando omitido', () => {
    const result = componentPromptQuerySchema.parse({});
    expect(result).toEqual({ framework: 'react', styling: 'tailwind' });
  });

  it('aceita combinações explícitas válidas', () => {
    const result = componentPromptQuerySchema.parse({ framework: 'vue', styling: 'css-modules' });
    expect(result).toEqual({ framework: 'vue', styling: 'css-modules' });
  });

  it('rejeita framework ou styling fora do enum', () => {
    const badFramework = componentPromptQuerySchema.safeParse({ framework: 'jquery' });
    const badStyling = componentPromptQuerySchema.safeParse({ styling: 'sass' });

    expect(badFramework.success).toBe(false);
    expect(badStyling.success).toBe(false);
  });
});
