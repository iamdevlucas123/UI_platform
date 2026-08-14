import { z } from 'zod';

/**
 * Formato de slug usado por `Component` e `Category`: minúsculas, dígitos e
 * hífens simples entre blocos (ex.: "neon-toggle-switch"). Regra definida no
 * MVP1 (seção 7) para o campo `slug` de `Component`; reutilizada por
 * `Category` porque as duas entidades compartilham o mesmo conceito de slug
 * de URL (seção 5).
 */
export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain only lowercase letters, numbers and hyphens',
  );

/** Status de publicação de um componente (Prisma `ComponentStatus`, seção 6). */
export const componentStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

/** Frameworks de destino aceitos pelo gerador de prompt (seção 7). */
export const promptFrameworkSchema = z.enum(['react', 'vue', 'svelte', 'angular', 'html']);

/** Abordagens de estilização aceitas pelo gerador de prompt (seção 7). */
export const promptStylingSchema = z.enum([
  'tailwind',
  'css',
  'css-modules',
  'styled-components',
]);

/**
 * Remove duplicatas preservando a primeira ocorrência. Regra do MVP1
 * (seção 7): a lista de tags de tecnologia não deve repetir itens.
 */
function dedupeTechnologies(technologies: string[]): string[] {
  return Array.from(new Set(technologies));
}

/** Lista de tags de tecnologia exibidas no card do componente (seção 7). */
const technologiesShape = z
  .array(z.string().min(1).max(30))
  .max(10, 'A component can have at most 10 technologies')
  .transform(dedupeTechnologies);

/**
 * Campos de `Component` compartilhados entre criação e atualização.
 * Propositalmente sem `.default()`: `updateComponentSchema` deriva deste
 * shape via `.partial()`, e um campo ausente na atualização deve significar
 * "não alterar", nunca "aplicar o valor padrão de criação".
 */
const componentShape = {
  name: z.string().min(2).max(80),
  slug: slugSchema,
  description: z.string().min(10).max(500),
  // Formato cuid clássico (Prisma `@default(cuid())`), não cuid2.
  categoryId: z.cuid('categoryId must be a valid cuid'),
  html: z.string().min(1).max(50_000),
  css: z.string().max(50_000),
  js: z.string().max(20_000).nullish(),
  technologies: technologiesShape,
  promptTemplate: z.string().max(20_000).nullish(),
  status: componentStatusSchema,
};

/**
 * `POST /api/admin/components` — corpo de criação (seção 7). `authorId` não
 * faz parte do schema: vem do token de autenticação, nunca do body. A
 * checagem de unicidade do `slug` (409) e a existência de `categoryId`
 * (422) dependem do banco e são responsabilidade do service, não do schema.
 */
export const createComponentSchema = z.object({
  ...componentShape,
  technologies: componentShape.technologies.default([]),
  status: componentShape.status.default('DRAFT'),
});

export type CreateComponentInput = z.infer<typeof createComponentSchema>;

/**
 * `PUT /api/admin/components/:id` — mesmo corpo do POST com todos os campos
 * opcionais (seção 7, `schema.partial()`). Um body vazio é rejeitado: a
 * atualização precisa alterar ao menos um campo.
 */
export const updateComponentSchema = z
  .object(componentShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export type UpdateComponentInput = z.infer<typeof updateComponentSchema>;

/**
 * `GET /api/components/:slug/prompt` — query params para renderizar o
 * prompt numa stack de destino diferente do default (React + Tailwind CSS).
 */
export const componentPromptQuerySchema = z.object({
  framework: promptFrameworkSchema.default('react'),
  styling: promptStylingSchema.default('tailwind'),
});

export type ComponentPromptQuery = z.infer<typeof componentPromptQuerySchema>;
