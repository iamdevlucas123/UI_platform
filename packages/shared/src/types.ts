import type { ComponentStatus } from './schemas/component.js';

/**
 * Metadados de paginação retornados nas listagens, conforme o envelope de
 * resposta padronizado do MVP1 (seção 7).
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Envelope de sucesso para respostas em lista (seção 7). */
export interface ApiListResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Envelope de sucesso para respostas de um único recurso (seção 7). */
export interface ApiItemResponse<T> {
  data: T;
}

/** Um item de `error.details`: aponta o campo inválido e a mensagem (seção 7). */
export interface ApiErrorDetail {
  path: string;
  message: string;
}

/**
 * Envelope padronizado de erro (seção 7). `details` normalmente lista campos
 * inválidos (erros de validação), mas alguns erros de negócio do MVP1 usam
 * um objeto específico — ex.: `CATEGORY_IN_USE` expõe `details.componentCount`
 * (seção 7) em vez do array de `{path, message}`.
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>;
  };
}

/**
 * DTOs de resposta consumidos pelo MVP2 (`apps/web/src/lib/api-client.ts`).
 * Espelham exatamente os mappers de `apps/api` (seção 4/7): não são schemas
 * Zod porque a API nunca valida seus próprios outputs — só os inputs
 * (schemas acima) passam por Zod nos dois lados.
 */

/** Referência resumida de categoria embutida nos DTOs de componente. */
export interface ComponentCategoryRef {
  name: string;
  slug: string;
}

/** `GET /api/components` — item da listagem pública (`components.mapper.ts`). */
export interface ComponentListItemDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  technologies: string[];
  category: ComponentCategoryRef;
  preview: { html: string; css: string; js: string | null };
  createdAt: string;
}

/**
 * `GET /api/components/:slug` — detalhe público, com o prompt já renderizado.
 * Sem `status`/`categoryId`/`authorId`/`promptTemplate` — internos, só na
 * visão administrativa (`AdminComponentDto`).
 */
export interface ComponentDetailDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  technologies: string[];
  category: ComponentCategoryRef;
  html: string;
  css: string;
  js: string | null;
  prompt: string;
  createdAt: string;
}

/** `GET /api/components/:slug/prompt` — corpo de `data` (seção 4). */
export interface ComponentPromptDto {
  prompt: string;
}

/**
 * `/api/admin/components[...]` — visão administrativa completa, inclusive
 * componentes `DRAFT`.
 */
export interface AdminComponentDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  category: ComponentCategoryRef;
  html: string;
  css: string;
  js: string | null;
  technologies: string[];
  promptTemplate: string | null;
  status: ComponentStatus;
  publishedAt: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /api/categories`, `/api/admin/categories[...]` — DTO de categoria. */
export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  componentCount: number;
}

/** `GET /api/health` — resposta sem envelope `{ data }` (seção 4/7). */
export interface HealthCheckDto {
  status: 'ok';
  uptime: number;
  db: 'ok';
}
