import type { AdminComponentRow, ComponentDetailRow, ComponentListRow } from './components.repository.js';

/** Item da listagem pública (seção 7 do MVP1) — exatamente os campos do exemplo do doc. */
export interface ComponentListItemDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  technologies: string[];
  category: { name: string; slug: string };
  preview: { html: string; css: string; js: string | null };
  createdAt: string;
}

/** Converte a linha do repository (entidade Prisma) no DTO da listagem pública. */
export function toComponentListItemDto(component: ComponentListRow): ComponentListItemDto {
  return {
    id: component.id,
    name: component.name,
    slug: component.slug,
    description: component.description,
    technologies: component.technologies,
    category: component.category,
    preview: { html: component.html, css: component.css, js: component.js },
    createdAt: component.createdAt.toISOString(),
  };
}

/**
 * Detalhe público de um componente (seção 7 do MVP1): inclui `html`/`css`/`js`
 * "soltos" (não aninhados em `preview`) e o `prompt` já renderizado.
 * Deliberadamente sem `authorId`, `promptTemplate`, `status` ou
 * `publishedAt` — são internos e não fazem parte da resposta pública.
 */
export interface ComponentDetailDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  technologies: string[];
  category: { name: string; slug: string };
  html: string;
  css: string;
  js: string | null;
  prompt: string;
  createdAt: string;
}

/** Converte a linha do repository + o prompt já renderizado no DTO de detalhe. */
export function toComponentDetailDto(
  component: ComponentDetailRow,
  prompt: string,
): ComponentDetailDto {
  return {
    id: component.id,
    name: component.name,
    slug: component.slug,
    description: component.description,
    technologies: component.technologies,
    category: component.category,
    html: component.html,
    css: component.css,
    js: component.js,
    prompt,
    createdAt: component.createdAt.toISOString(),
  };
}

/**
 * Visão administrativa de um componente (`/api/admin/components`, seção 7 do
 * MVP1): inclui `categoryId`, `status`, `publishedAt` e `authorId` — campos
 * internos necessários para editar o componente, ausentes dos DTOs públicos.
 */
export interface AdminComponentDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  category: { name: string; slug: string };
  html: string;
  css: string;
  js: string | null;
  technologies: string[];
  promptTemplate: string | null;
  status: AdminComponentRow['status'];
  publishedAt: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Converte a linha do repository (qualquer status) no DTO administrativo. */
export function toAdminComponentDto(component: AdminComponentRow): AdminComponentDto {
  return {
    id: component.id,
    name: component.name,
    slug: component.slug,
    description: component.description,
    categoryId: component.categoryId,
    category: component.category,
    html: component.html,
    css: component.css,
    js: component.js,
    technologies: component.technologies,
    promptTemplate: component.promptTemplate,
    status: component.status,
    publishedAt: component.publishedAt ? component.publishedAt.toISOString() : null,
    authorId: component.authorId,
    createdAt: component.createdAt.toISOString(),
    updatedAt: component.updatedAt.toISOString(),
  };
}
