import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../src/app.js';
import { env } from '../../src/config/env.js';
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

/**
 * Testes de integração de `POST`/`PUT`/`DELETE /api/admin/categories`
 * (seção 7 e 13 do MVP1), protegidos pelo middleware provisório (seção 9).
 */
describe('/api/admin/categories', () => {
  const adminHeader = () => ['Authorization', `Bearer ${env.DEV_ADMIN_TOKEN}`] as const;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "components", "categories" RESTART IDENTITY CASCADE',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('nega acesso sem token de admin válido em todas as rotas', async () => {
    const category = await prisma.category.create({
      data: { name: 'Buttons', slug: 'buttons', position: 0 },
    });

    const noToken = await request(app).post('/api/admin/categories').send({ name: 'Cards' });
    const invalidToken = await request(app)
      .put(`/api/admin/categories/${category.id}`)
      .set('Authorization', 'Bearer token-invalido')
      .send({ position: 1 });
    const deleteWithoutToken = await request(app).delete(
      `/api/admin/categories/${category.id}`,
    );

    expect(noToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
    expect(deleteWithoutToken.status).toBe(401);
  });

  describe('POST /api/admin/categories', () => {
    it('cria a categoria derivando o slug do name (normalizado) e responde 201', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set(...adminHeader())
        .send({ name: 'Botões Neon' });

      expect(response.status).toBe(201);
      expect(response.body.data).toEqual({
        id: expect.any(String),
        name: 'Botões Neon',
        slug: 'botoes-neon',
        description: null,
        position: 0,
        componentCount: 0,
      });
    });

    it('aceita slug explícito (em vez de derivado do name) e description, com position default 0', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set(...adminHeader())
        .send({ name: 'Loaders Animados', slug: 'loaders', description: 'Spinners e afins' });

      expect(response.status).toBe(201);
      expect(response.body.data.slug).toBe('loaders');
      expect(response.body.data.description).toBe('Spinners e afins');
      expect(response.body.data.position).toBe(0);
    });

    it('retorna 409 para name já em uso', async () => {
      await prisma.category.create({ data: { name: 'Buttons', slug: 'buttons', position: 0 } });

      const response = await request(app)
        .post('/api/admin/categories')
        .set(...adminHeader())
        .send({ name: 'Buttons' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('retorna 409 para slug já em uso, mesmo com name diferente', async () => {
      await prisma.category.create({ data: { name: 'Buttons', slug: 'buttons', position: 0 } });

      const response = await request(app)
        .post('/api/admin/categories')
        .set(...adminHeader())
        .send({ name: 'Botões', slug: 'buttons' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('retorna 400 para name abaixo do mínimo', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set(...adminHeader())
        .send({ name: 'A' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/admin/categories/:id', () => {
    it('atualiza campos parciais e responde 200', async () => {
      const category = await prisma.category.create({
        data: { name: 'Buttons', slug: 'buttons', position: 0 },
      });

      const response = await request(app)
        .put(`/api/admin/categories/${category.id}`)
        .set(...adminHeader())
        .send({ description: 'Botões diversos', position: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        id: category.id,
        name: 'Buttons',
        slug: 'buttons',
        description: 'Botões diversos',
        position: 2,
        componentCount: 0,
      });
    });

    it('não falseia 409 quando name/slug enviados são os mesmos já atuais', async () => {
      const category = await prisma.category.create({
        data: { name: 'Buttons', slug: 'buttons', position: 0 },
      });

      const response = await request(app)
        .put(`/api/admin/categories/${category.id}`)
        .set(...adminHeader())
        .send({ name: 'Buttons', slug: 'buttons', position: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.position).toBe(3);
    });

    it('retorna 409 ao mudar o name para um já usado por outra categoria', async () => {
      await prisma.category.create({ data: { name: 'Buttons', slug: 'buttons', position: 0 } });
      const cards = await prisma.category.create({
        data: { name: 'Cards', slug: 'cards', position: 1 },
      });

      const response = await request(app)
        .put(`/api/admin/categories/${cards.id}`)
        .set(...adminHeader())
        .send({ name: 'Buttons' });

      expect(response.status).toBe(409);
    });

    it('retorna 404 para id inexistente', async () => {
      const response = await request(app)
        .put('/api/admin/categories/nao-existe')
        .set(...adminHeader())
        .send({ position: 1 });

      expect(response.status).toBe(404);
    });

    it('retorna 400 para body vazio', async () => {
      const category = await prisma.category.create({
        data: { name: 'Buttons', slug: 'buttons', position: 0 },
      });

      const response = await request(app)
        .put(`/api/admin/categories/${category.id}`)
        .set(...adminHeader())
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/categories/:id', () => {
    it('apaga a categoria vazia (hard delete) e responde 204', async () => {
      const category = await prisma.category.create({
        data: { name: 'Buttons', slug: 'buttons', position: 0 },
      });

      const response = await request(app)
        .delete(`/api/admin/categories/${category.id}`)
        .set(...adminHeader());

      expect(response.status).toBe(204);

      const stillExists = await prisma.category.findUnique({ where: { id: category.id } });
      expect(stillExists).toBeNull();
    });

    it('bloqueia com 409 CATEGORY_IN_USE quando há componentes associados, mesmo só DRAFT', async () => {
      const category = await prisma.category.create({
        data: { name: 'Buttons', slug: 'buttons', position: 0 },
      });
      await prisma.component.create({
        data: {
          name: 'Draft Button',
          slug: 'draft-button',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<button></button>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .delete(`/api/admin/categories/${category.id}`)
        .set(...adminHeader());

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CATEGORY_IN_USE');
      expect(response.body.error.details).toEqual({ componentCount: 1 });

      const stillExists = await prisma.category.findUnique({ where: { id: category.id } });
      expect(stillExists).not.toBeNull();
    });

    it('retorna 404 para id inexistente', async () => {
      const response = await request(app)
        .delete('/api/admin/categories/nao-existe')
        .set(...adminHeader());

      expect(response.status).toBe(404);
    });
  });
});
