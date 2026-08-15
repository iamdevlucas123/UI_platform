import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

/**
 * Teste de integração de `GET /api/categories` (seção 7 e 13 do MVP1).
 * Requer um Postgres real acessível via `DATABASE_URL`, com as migrations
 * aplicadas. `TRUNCATE ... RESTART IDENTITY CASCADE` a cada teste (seção
 * 13) garante isolamento sem depender do seed de exemplo.
 */
describe('GET /api/categories', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "components", "categories" RESTART IDENTITY CASCADE',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('retorna lista vazia quando não há categorias', async () => {
    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it('ordena por position e conta só componentes PUBLISHED, sem expor campos internos', async () => {
    const buttons = await prisma.category.create({
      data: { name: 'Buttons', slug: 'buttons', position: 1 },
    });
    const animation = await prisma.category.create({
      data: { name: 'Animation', slug: 'animation', description: 'Categoria de animação', position: 0 },
    });

    await prisma.component.createMany({
      data: [
        {
          name: 'Published One',
          slug: 'published-one',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: animation.id,
        },
        {
          name: 'Published Two',
          slug: 'published-two',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: animation.id,
        },
        {
          name: 'Draft One',
          slug: 'draft-one',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: animation.id,
        },
      ],
    });

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        {
          id: animation.id,
          name: 'Animation',
          slug: 'animation',
          description: 'Categoria de animação',
          position: 0,
          componentCount: 2,
        },
        {
          id: buttons.id,
          name: 'Buttons',
          slug: 'buttons',
          description: null,
          position: 1,
          componentCount: 0,
        },
      ],
    });
    // Só os 6 campos do DTO — nada de createdAt/updatedAt/_count vazando.
    expect(Object.keys(response.body.data[0])).toEqual([
      'id',
      'name',
      'slug',
      'description',
      'position',
      'componentCount',
    ]);
  });

  it('encaminha falha do banco ao error-handler', async () => {
    vi.spyOn(prisma.category, 'findMany').mockRejectedValueOnce(new Error('db down'));

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.',
      },
    });
  });
});
