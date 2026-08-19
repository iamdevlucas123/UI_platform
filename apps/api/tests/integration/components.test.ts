import type { Category } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { ADMIN_BEARER_TOKEN, NON_ADMIN_BEARER_TOKEN } from '../support/clerk-mock.js';

/**
 * Mocka `verifyToken` (`@clerk/backend`) para todo este arquivo — os testes
 * de `/api/admin/*` abaixo autenticam com `ADMIN_BEARER_TOKEN`/
 * `NON_ADMIN_BEARER_TOKEN` (seção 13 do MVP1: integração sem depender de
 * rede real do Clerk).
 */
vi.mock('@clerk/backend', async () => ({
  verifyToken: vi.fn((await import('../support/clerk-mock.js')).mockVerifyToken),
}));

/**
 * Testes de integração de `GET /api/components` e `GET /api/components/:slug`
 * (seção 7 e 13 do MVP1). Requerem um Postgres real acessível via
 * `DATABASE_URL`, com as migrations aplicadas. `TRUNCATE ... RESTART
 * IDENTITY CASCADE` a cada teste (seção 13) garante isolamento sem
 * depender do seed de exemplo.
 */
describe('components', () => {
  let category: Category;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "components", "categories", "users" RESTART IDENTITY CASCADE',
    );
    category = await prisma.category.create({
      data: { name: 'Toggle Switches', slug: 'toggle-switches', position: 0 },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/components', () => {
    it('retorna apenas componentes PUBLISHED — DRAFT fica oculto', async () => {
      await prisma.component.create({
        data: {
          name: 'Published One',
          slug: 'published-one',
          description: 'Descrição pública válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });
      await prisma.component.create({
        data: {
          name: 'Draft One',
          slug: 'draft-one',
          description: 'Descrição de rascunho válida com dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('published-one');
      expect(response.body.meta.total).toBe(1);
    });

    it('devolve exatamente os campos do DTO da listagem, com category e preview aninhados', async () => {
      await prisma.component.create({
        data: {
          name: 'Neon Toggle Switch',
          slug: 'neon-toggle-switch',
          description: 'Um toggle com glow neon e transição suave.',
          html: '<label class="switch"></label>',
          css: '.switch { display: block; }',
          js: null,
          technologies: ['HTML', 'CSS'],
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components');

      expect(response.body.data[0]).toEqual({
        id: expect.any(String),
        name: 'Neon Toggle Switch',
        slug: 'neon-toggle-switch',
        description: 'Um toggle com glow neon e transição suave.',
        technologies: ['HTML', 'CSS'],
        category: { name: 'Toggle Switches', slug: 'toggle-switches' },
        preview: {
          html: '<label class="switch"></label>',
          css: '.switch { display: block; }',
          js: null,
        },
        createdAt: expect.any(String),
      });
    });

    it('pagina com page/limit e calcula meta.totalPages corretamente', async () => {
      await prisma.component.createMany({
        data: Array.from({ length: 3 }, (_, i) => ({
          name: `Component ${i}`,
          slug: `component-${i}`,
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED' as const,
          categoryId: category.id,
        })),
      });

      const response = await request(app).get('/api/components').query({ page: 2, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });

    it('pesquisa q com ILIKE em name OU description', async () => {
      await prisma.component.create({
        data: {
          name: 'Neon Toggle Switch',
          slug: 'neon-toggle-switch',
          description: 'Um toggle com efeito de glow',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });
      await prisma.component.create({
        data: {
          name: 'Simple Button',
          slug: 'simple-button',
          description: 'Um botão com efeito NEON discreto',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });
      await prisma.component.create({
        data: {
          name: 'Unrelated Card',
          slug: 'unrelated-card',
          description: 'Um cartão sem relação nenhuma com o termo buscado',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components').query({ q: 'neon' });

      expect(response.status).toBe(200);
      const slugs = response.body.data.map((item: { slug: string }) => item.slug).sort();
      expect(slugs).toEqual(['neon-toggle-switch', 'simple-button']);
    });

    it('ordena por createdAt desc (recent, default) e por name (sort=name)', async () => {
      const older = await prisma.component.create({
        data: {
          name: 'Zebra Card',
          slug: 'zebra-card',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      });
      const newer = await prisma.component.create({
        data: {
          name: 'Alpha Card',
          slug: 'alpha-card',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
          createdAt: new Date('2026-02-01T00:00:00.000Z'),
        },
      });

      const recent = await request(app).get('/api/components');
      expect(recent.body.data.map((item: { slug: string }) => item.slug)).toEqual([
        newer.slug,
        older.slug,
      ]);

      const byName = await request(app).get('/api/components').query({ sort: 'name' });
      expect(byName.body.data.map((item: { slug: string }) => item.slug)).toEqual([
        newer.slug, // "Alpha Card"
        older.slug, // "Zebra Card"
      ]);
    });

    it('filtra por category (slug)', async () => {
      const otherCategory = await prisma.category.create({
        data: { name: 'Buttons', slug: 'buttons', position: 1 },
      });
      await prisma.component.create({
        data: {
          name: 'In Toggle Category',
          slug: 'in-toggle-category',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });
      await prisma.component.create({
        data: {
          name: 'In Buttons Category',
          slug: 'in-buttons-category',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'PUBLISHED',
          categoryId: otherCategory.id,
        },
      });

      const response = await request(app)
        .get('/api/components')
        .query({ category: 'toggle-switches' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].slug).toBe('in-toggle-category');
    });

    it('retorna 404 quando a categoria do filtro não existe', async () => {
      const response = await request(app)
        .get('/api/components')
        .query({ category: 'nao-existe' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('retorna 400 quando a query é inválida (ex.: limit acima do teto)', async () => {
      const response = await request(app).get('/api/components').query({ limit: '49' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/components/:slug', () => {
    it('retorna 404 para slug inexistente', async () => {
      const response = await request(app).get('/api/components/nao-existe');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('retorna o detalhe de um componente PUBLISHED com html, css, js, category e prompt', async () => {
      await prisma.component.create({
        data: {
          name: 'Neon Toggle Switch',
          slug: 'neon-toggle-switch',
          description: 'Um toggle com glow neon e transição suave.',
          html: '<label class="switch"></label>',
          css: '.switch { display: block; }',
          js: null,
          technologies: ['HTML', 'CSS'],
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components/neon-toggle-switch');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        name: 'Neon Toggle Switch',
        slug: 'neon-toggle-switch',
        html: '<label class="switch"></label>',
        css: '.switch { display: block; }',
        js: null,
        category: { name: 'Toggle Switches', slug: 'toggle-switches' },
      });
      expect(response.body.data.prompt).toContain('Name: Neon Toggle Switch');
      expect(response.body.data.prompt).toContain('Framework: react');
      expect(response.body.data.prompt).toContain('Styling: tailwind');
    });

    it('nunca inclui authorId ou promptTemplate na resposta pública', async () => {
      await prisma.component.create({
        data: {
          name: 'Neon Toggle Switch',
          slug: 'neon-toggle-switch',
          description: 'Um toggle com glow neon e transição suave.',
          html: '<label></label>',
          css: '',
          promptTemplate: 'Custom template for {{name}}',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components/neon-toggle-switch');

      expect(response.body.data).not.toHaveProperty('authorId');
      expect(response.body.data).not.toHaveProperty('promptTemplate');
      // O promptTemplate customizado é usado para renderizar, mas nunca aparece cru.
      expect(response.body.data.prompt).toBe('Custom template for Neon Toggle Switch');
    });

    it('retorna 404 para componente DRAFT sem preview', async () => {
      await prisma.component.create({
        data: {
          name: 'Draft Toggle',
          slug: 'draft-toggle',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components/draft-toggle');

      expect(response.status).toBe(404);
    });

    it('retorna 404 para DRAFT com preview=1 mas sem token de admin', async () => {
      await prisma.component.create({
        data: {
          name: 'Draft Toggle',
          slug: 'draft-toggle',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components/draft-toggle?preview=1');

      expect(response.status).toBe(404);
    });

    it('retorna 404 para DRAFT com preview=1 e token de admin inválido', async () => {
      await prisma.component.create({
        data: {
          name: 'Draft Toggle',
          slug: 'draft-toggle',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .get('/api/components/draft-toggle?preview=1')
        .set('Authorization', 'Bearer token-invalido');

      expect(response.status).toBe(404);
    });

    it('mostra o DRAFT quando preview=1 vem com um token de admin válido', async () => {
      await prisma.component.create({
        data: {
          name: 'Draft Toggle',
          slug: 'draft-toggle',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .get('/api/components/draft-toggle?preview=1')
        .set('Authorization', `Bearer ${ADMIN_BEARER_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.data.slug).toBe('draft-toggle');
    });

    it('encaminha falha do banco ao error-handler', async () => {
      vi.spyOn(prisma.component, 'findFirst').mockRejectedValueOnce(new Error('db down'));

      const response = await request(app).get('/api/components/qualquer-slug');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/components/:slug/prompt', () => {
    it('usa os defaults react/tailwind quando framework/styling são omitidos', async () => {
      await prisma.component.create({
        data: {
          name: 'Neon Toggle Switch',
          slug: 'neon-toggle-switch',
          description: 'Um toggle com glow neon e transição suave.',
          html: '<label class="switch"></label>',
          css: '.switch { display: block; }',
          js: null,
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components/neon-toggle-switch/prompt');

      expect(response.status).toBe(200);
      expect(Object.keys(response.body)).toEqual(['data']);
      expect(Object.keys(response.body.data)).toEqual(['prompt']);
      expect(response.body.data.prompt).toContain('Name: Neon Toggle Switch');
      expect(response.body.data.prompt).toContain('Framework: react');
      expect(response.body.data.prompt).toContain('Styling: tailwind');
    });

    it('renderiza para framework/styling explícitos e inclui o bloco de JS quando o componente tem js', async () => {
      await prisma.component.create({
        data: {
          name: 'Neon Toggle Switch',
          slug: 'neon-toggle-switch',
          description: 'Um toggle com glow neon e transição suave.',
          html: '<label class="switch"></label>',
          css: '.switch { display: block; }',
          js: 'console.log("toggled")',
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .get('/api/components/neon-toggle-switch/prompt')
        .query({ framework: 'vue', styling: 'css-modules' });

      expect(response.status).toBe(200);
      expect(response.body.data.prompt).toContain('Framework: vue');
      expect(response.body.data.prompt).toContain('Styling: css-modules');
      expect(response.body.data.prompt).toContain('```js');
      expect(response.body.data.prompt).toContain('console.log("toggled")');
    });

    it('omite o bloco de JS quando o componente não tem js', async () => {
      await prisma.component.create({
        data: {
          name: 'Simple Toggle',
          slug: 'simple-toggle',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          js: null,
          status: 'PUBLISHED',
          categoryId: category.id,
        },
      });

      const response = await request(app).get('/api/components/simple-toggle/prompt');

      expect(response.status).toBe(200);
      expect(response.body.data.prompt).not.toContain('```js');
      expect(response.body.data.prompt).not.toContain('{{#js}}');
    });

    it('retorna 400 para framework fora do enum aceito', async () => {
      const response = await request(app)
        .get('/api/components/qualquer-slug/prompt')
        .query({ framework: 'jquery' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 400 para styling fora do enum aceito', async () => {
      const response = await request(app)
        .get('/api/components/qualquer-slug/prompt')
        .query({ styling: 'sass' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('retorna 404 para slug inexistente', async () => {
      const response = await request(app).get('/api/components/nao-existe/prompt');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('retorna 404 para componente DRAFT — este endpoint não aceita preview', async () => {
      await prisma.component.create({
        data: {
          name: 'Draft Toggle',
          slug: 'draft-toggle',
          description: 'Descrição válida com mais de dez caracteres',
          html: '<div></div>',
          css: '',
          status: 'DRAFT',
          categoryId: category.id,
        },
      });

      const response = await request(app)
        .get('/api/components/draft-toggle/prompt')
        .set('Authorization', `Bearer ${ADMIN_BEARER_TOKEN}`);

      expect(response.status).toBe(404);
    });

    it('encaminha falha do banco ao error-handler', async () => {
      vi.spyOn(prisma.component, 'findFirst').mockRejectedValueOnce(new Error('db down'));

      const response = await request(app).get('/api/components/qualquer-slug/prompt');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('/api/admin/components', () => {
    const adminHeader = () => ['Authorization', `Bearer ${ADMIN_BEARER_TOKEN}`] as const;

    const validBody = () => ({
      name: 'Neon Toggle Switch',
      slug: 'neon-toggle-switch',
      description: 'Descrição válida com mais de dez caracteres',
      categoryId: category.id,
      html: '<div></div>',
      css: '',
      status: 'DRAFT' as const,
    });

    it('retorna 401 em todas as rotas sem token de admin válido', async () => {
      const noToken = await request(app).get('/api/admin/components');
      const invalidToken = await request(app)
        .get('/api/admin/components')
        .set('Authorization', 'Bearer token-invalido');
      const postWithoutToken = await request(app)
        .post('/api/admin/components')
        .send(validBody());

      expect(noToken.status).toBe(401);
      expect(noToken.body.error.code).toBe('UNAUTHORIZED');
      expect(invalidToken.status).toBe(401);
      expect(postWithoutToken.status).toBe(401);
    });

    it('retorna 403 quando o token é válido mas sem role admin (seção 9 do MVP2)', async () => {
      const response = await request(app)
        .get('/api/admin/components')
        .set('Authorization', `Bearer ${NON_ADMIN_BEARER_TOKEN}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('retorna 200 quando o token é válido e tem claims de role admin', async () => {
      const response = await request(app).get('/api/admin/components').set(...adminHeader());

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    describe('GET /api/admin/components', () => {
      it('lista todos os componentes, inclusive DRAFT', async () => {
        await prisma.component.create({
          data: { ...validBody(), status: 'PUBLISHED', publishedAt: new Date() },
        });
        await prisma.component.create({
          data: { ...validBody(), slug: 'draft-toggle', status: 'DRAFT' },
        });

        const response = await request(app).get('/api/admin/components').set(...adminHeader());

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data.map((item: { status: string }) => item.status).sort()).toEqual([
          'DRAFT',
          'PUBLISHED',
        ]);
      });
    });

    describe('GET /api/admin/components/:id', () => {
      it('carrega o componente pelo id, com categoryId e status', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .get(`/api/admin/components/${created.id}`)
          .set(...adminHeader());

        expect(response.status).toBe(200);
        expect(response.body.data.id).toBe(created.id);
        expect(response.body.data.categoryId).toBe(category.id);
        expect(response.body.data.status).toBe('DRAFT');
      });

      it('retorna 404 para id inexistente', async () => {
        const response = await request(app)
          .get('/api/admin/components/nao-existe')
          .set(...adminHeader());

        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/admin/components', () => {
      it('cria o componente, define authorId a partir do token e responde 201', async () => {
        const response = await request(app)
          .post('/api/admin/components')
          .set(...adminHeader())
          .send(validBody());

        expect(response.status).toBe(201);
        expect(response.body.data.slug).toBe('neon-toggle-switch');
        expect(response.body.data.status).toBe('DRAFT');
        expect(response.body.data.publishedAt).toBeNull();
        expect(response.body.data.authorId).toEqual(expect.any(String));

        const author = await prisma.user.findUnique({ where: { clerkId: 'user_test_admin' } });
        expect(author?.email).toBe('admin@dev.local');
        expect(response.body.data.authorId).toBe(author?.id);
      });

      it('normaliza o slug (minúsculas, sem acentos) antes de checar unicidade', async () => {
        await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .post('/api/admin/components')
          .set(...adminHeader())
          .send({ ...validBody(), name: 'Outro Componente', slug: 'neon-toggle-switch' });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('CONFLICT');
      });

      it('define publishedAt na criação já como PUBLISHED', async () => {
        const response = await request(app)
          .post('/api/admin/components')
          .set(...adminHeader())
          .send({ ...validBody(), status: 'PUBLISHED' });

        expect(response.status).toBe(201);
        expect(response.body.data.publishedAt).not.toBeNull();
      });

      it('retorna 409 para slug já em uso', async () => {
        await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .post('/api/admin/components')
          .set(...adminHeader())
          .send({ ...validBody(), name: 'Outro Componente' });

        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('CONFLICT');
      });

      it('retorna 422 quando categoryId não existe', async () => {
        const response = await request(app)
          .post('/api/admin/components')
          .set(...adminHeader())
          .send({ ...validBody(), categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxx' });

        expect(response.status).toBe(422);
        expect(response.body.error.code).toBe('UNPROCESSABLE_ENTITY');
      });

      it('retorna 400 para body inválido', async () => {
        const response = await request(app)
          .post('/api/admin/components')
          .set(...adminHeader())
          .send({ ...validBody(), name: 'A' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });
    });

    describe('PUT /api/admin/components/:id', () => {
      it('atualiza campos parciais e responde 200', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({ description: 'Nova descrição válida com dez caracteres' });

        expect(response.status).toBe(200);
        expect(response.body.data.description).toBe('Nova descrição válida com dez caracteres');
        expect(response.body.data.name).toBe(created.name);
      });

      it('define publishedAt na transição DRAFT → PUBLISHED', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({ status: 'PUBLISHED' });

        expect(response.status).toBe(200);
        expect(response.body.data.publishedAt).not.toBeNull();
      });

      it('preserva publishedAt na transição PUBLISHED → DRAFT', async () => {
        const publishedAt = new Date('2026-01-01T00:00:00.000Z');
        const created = await prisma.component.create({
          data: { ...validBody(), status: 'PUBLISHED', publishedAt },
        });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({ status: 'DRAFT' });

        expect(response.status).toBe(200);
        expect(response.body.data.publishedAt).toBe(publishedAt.toISOString());
      });

      it('mantém a primeira publishedAt ao republicar após um ciclo DRAFT', async () => {
        const publishedAt = new Date('2026-01-01T00:00:00.000Z');
        const created = await prisma.component.create({
          data: { ...validBody(), status: 'DRAFT', publishedAt },
        });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({ status: 'PUBLISHED' });

        expect(response.status).toBe(200);
        expect(response.body.data.publishedAt).toBe(publishedAt.toISOString());
      });

      it('retorna 409 ao mudar o slug para um já usado por outro componente', async () => {
        await prisma.component.create({ data: validBody() });
        const other = await prisma.component.create({
          data: { ...validBody(), slug: 'outro-slug' },
        });

        const response = await request(app)
          .put(`/api/admin/components/${other.id}`)
          .set(...adminHeader())
          .send({ slug: 'neon-toggle-switch' });

        expect(response.status).toBe(409);
      });

      it('não falseia 409 quando o slug enviado é o mesmo já atual', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({ slug: created.slug, name: 'Neon Toggle Switch Renomeado' });

        expect(response.status).toBe(200);
      });

      it('retorna 422 quando categoryId não existe', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({ categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxx' });

        expect(response.status).toBe(422);
      });

      it('retorna 404 para id inexistente', async () => {
        const response = await request(app)
          .put('/api/admin/components/nao-existe')
          .set(...adminHeader())
          .send({ description: 'Nova descrição válida com dez caracteres' });

        expect(response.status).toBe(404);
      });

      it('retorna 400 para body vazio', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .put(`/api/admin/components/${created.id}`)
          .set(...adminHeader())
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('DELETE /api/admin/components/:id', () => {
      it('apaga o componente (hard delete) e responde 204', async () => {
        const created = await prisma.component.create({ data: validBody() });

        const response = await request(app)
          .delete(`/api/admin/components/${created.id}`)
          .set(...adminHeader());

        expect(response.status).toBe(204);

        const stillExists = await prisma.component.findUnique({ where: { id: created.id } });
        expect(stillExists).toBeNull();
      });

      it('retorna 404 para id inexistente', async () => {
        const response = await request(app)
          .delete('/api/admin/components/nao-existe')
          .set(...adminHeader());

        expect(response.status).toBe(404);
      });
    });
  });
});
