import type {
  AdminComponentDto,
  ApiErrorDetail,
  ApiErrorResponse,
  ApiItemResponse,
  ApiListResponse,
  CategoryDto,
  ComponentDetailDto,
  ComponentListItemDto,
  ComponentPromptDto,
  ComponentPromptQuery,
  CreateCategoryInput,
  CreateComponentInput,
  HealthCheckDto,
  ListComponentsQuery,
  PaginationMeta,
  UpdateCategoryInput,
  UpdateComponentInput,
} from '@uilib/shared';

import { env, publicEnv } from './env';

/**
 * Camada única de comunicação com a API REST (seção 4/10 do MVP2). Três
 * grupos de funções, cada um com sua própria base URL — misturá-las quebra
 * a regra da seção 10 ("confundir as duas [URLs] é a causa mais comum de
 * 'funciona no client mas quebra no SSR'"):
 *
 * - `serverApi`  — Server Components / rotas do Next; usa `INTERNAL_API_URL`
 *   (rede interna do Docker). Nunca deve ser chamada do browser — `env`
 *   (ver `./env.ts`) já lança se isso acontecer.
 * - `browserApi` — endpoints públicos chamados do browser (ex.: troca de
 *   stack no seletor de prompt); usa `NEXT_PUBLIC_API_URL`, sem token.
 * - `adminApi`   — CRUD administrativo, sempre chamado do browser (seção 3:
 *   TanStack Query só existe em `/admin`); usa `NEXT_PUBLIC_API_URL` e
 *   exige que o chamador forneça o token de sessão do Clerk — este módulo
 *   nunca lê `CLERK_SECRET_KEY` nem gera tokens sozinho.
 */

/** Erro de domínio da API, com os quatro campos do envelope (seção 4). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ApiErrorDetail[] | Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetail[] | Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

/**
 * Serializa parâmetros em querystring (`?a=1&b=2`), descartando chaves
 * `undefined`/`null` — permite que os métodos abaixo aceitem objetos
 * parcialmente preenchidos sem o chamador precisar filtrar campos ausentes.
 */
export function buildQueryString(params?: QueryParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}

/** Opções de cache do fetch estendido pelo Next.js (App Router, seção 7). */
export interface NextFetchOptions {
  revalidate?: number | false;
  tags?: string[];
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ParseAs = 'item' | 'list' | 'raw';

interface RequestOptions {
  baseUrl: string;
  path: string;
  method?: HttpMethod;
  query?: QueryParams;
  body?: unknown;
  token?: string;
  parseAs?: ParseAs;
  next?: NextFetchOptions;
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const error = (value as { error: unknown }).error;
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { code, message } = error as { code?: unknown; message?: unknown };
  return typeof code === 'string' && typeof message === 'string';
}

function hasDataProperty(value: unknown): value is { data: unknown } {
  return typeof value === 'object' && value !== null && 'data' in value;
}

function isPaginationMeta(value: unknown): value is PaginationMeta {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const meta = value as Record<string, unknown>;
  return (
    typeof meta.page === 'number' &&
    typeof meta.limit === 'number' &&
    typeof meta.total === 'number' &&
    typeof meta.totalPages === 'number'
  );
}

/**
 * Valida e converte a resposta HTTP no envelope esperado (seção 4). Erros
 * de rede/parsing/formato nunca vazam como `SyntaxError`/`TypeError` crus —
 * tudo vira `ApiError`, para a UI sempre lidar com um único tipo de falha.
 */
async function parseResponse<T>(response: Response, parseAs: ParseAs): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let json: unknown;
  try {
    json = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'API returned a response body that is not valid JSON',
    );
  }

  if (!response.ok) {
    if (isApiErrorResponse(json)) {
      throw new ApiError(response.status, json.error.code, json.error.message, json.error.details);
    }
    throw new ApiError(response.status, 'UNKNOWN_ERROR', response.statusText || 'Request failed');
  }

  if (parseAs === 'raw') {
    return json as T;
  }

  if (!hasDataProperty(json)) {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'API response is missing the "data" field');
  }

  if (parseAs === 'list' && !isPaginationMeta((json as { meta?: unknown }).meta)) {
    throw new ApiError(
      response.status,
      'INVALID_RESPONSE',
      'API list response is missing a valid "meta" field',
    );
  }

  return json as T;
}

async function request<T>(options: RequestOptions): Promise<T> {
  const { baseUrl, path, method = 'GET', query, body, token, parseAs = 'item', next } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}${buildQueryString(query)}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(next ? { next } : {}),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Failed to reach the API');
  }

  return parseResponse<T>(response, parseAs);
}

/** Subconjunto de `ListComponentsQuery` (seção 4) aceito pelo chamador — cada campo é opcional. */
export type ComponentsQuery = Partial<
  Pick<ListComponentsQuery, 'q' | 'category' | 'page' | 'limit' | 'sort'>
>;

/** `ComponentPromptQuery` (seção 4) com framework/styling opcionais — a API aplica os defaults. */
export type ComponentPromptQueryInput = Partial<ComponentPromptQuery>;

/**
 * Endpoints públicos consumidos por Server Components (`INTERNAL_API_URL`).
 * Nunca importar/chamar a partir de um Client Component.
 */
export const serverApi = {
  getHealth(next?: NextFetchOptions): Promise<HealthCheckDto> {
    return request<HealthCheckDto>({
      baseUrl: env.INTERNAL_API_URL,
      path: '/api/health',
      parseAs: 'raw',
      next,
    });
  },

  getCategories(next?: NextFetchOptions): Promise<ApiItemResponse<CategoryDto[]>> {
    return request({ baseUrl: env.INTERNAL_API_URL, path: '/api/categories', next });
  },

  getComponents(
    query?: ComponentsQuery,
    next?: NextFetchOptions,
  ): Promise<ApiListResponse<ComponentListItemDto>> {
    return request({
      baseUrl: env.INTERNAL_API_URL,
      path: '/api/components',
      query,
      parseAs: 'list',
      next,
    });
  },

  /**
   * `GET /api/components/:slug` (seção 4/7 do MVP2). `token` é opcional e só
   * deve ser passado quando `preview` também é `true` — o chamador (página
   * de detalhe) já garante isso ao só resolver um token quando a sessão tem
   * `role: 'admin'` (seção 9); `preview=1` sem token válido equivale a uma
   * consulta pública (a API decide isso, este cliente só repassa os dois).
   */
  getComponent(
    slug: string,
    options?: { preview?: boolean; token?: string },
    next?: NextFetchOptions,
  ): Promise<ApiItemResponse<ComponentDetailDto>> {
    return request({
      baseUrl: env.INTERNAL_API_URL,
      path: `/api/components/${encodeURIComponent(slug)}`,
      query: { preview: options?.preview ? '1' : undefined },
      token: options?.token,
      next,
    });
  },

  getComponentPrompt(
    slug: string,
    query?: ComponentPromptQueryInput,
    next?: NextFetchOptions,
  ): Promise<ApiItemResponse<ComponentPromptDto>> {
    return request({
      baseUrl: env.INTERNAL_API_URL,
      path: `/api/components/${encodeURIComponent(slug)}/prompt`,
      query,
      next,
    });
  },
};

/**
 * Endpoints públicos chamados a partir do browser (`NEXT_PUBLIC_API_URL`),
 * sem autenticação — ex.: re-renderizar o prompt ao trocar a stack de
 * destino (seção 5.2) e listar categorias na tela admin de categorias
 * (não existe `GET /api/admin/categories`; a API pública já basta).
 */
export const browserApi = {
  getCategories(): Promise<ApiItemResponse<CategoryDto[]>> {
    return request({ baseUrl: publicEnv.NEXT_PUBLIC_API_URL, path: '/api/categories' });
  },

  getComponentPrompt(
    slug: string,
    query?: ComponentPromptQueryInput,
  ): Promise<ApiItemResponse<ComponentPromptDto>> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: `/api/components/${encodeURIComponent(slug)}/prompt`,
      query,
    });
  },
};

/**
 * CRUD administrativo (`NEXT_PUBLIC_API_URL`, Bearer do Clerk). `token` é
 * obrigatório em toda função — o chamador (hook/form no client) é quem
 * obtém o token via `useAuth().getToken()`; este módulo nunca o gera nem
 * usa segredo de servidor para autenticar chamadas do browser.
 */
export const adminApi = {
  listComponents(token: string): Promise<ApiItemResponse<AdminComponentDto[]>> {
    return request({ baseUrl: publicEnv.NEXT_PUBLIC_API_URL, path: '/api/admin/components', token });
  },

  getComponent(id: string, token: string): Promise<ApiItemResponse<AdminComponentDto>> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: `/api/admin/components/${encodeURIComponent(id)}`,
      token,
    });
  },

  createComponent(
    input: CreateComponentInput,
    token: string,
  ): Promise<ApiItemResponse<AdminComponentDto>> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: '/api/admin/components',
      method: 'POST',
      body: input,
      token,
    });
  },

  updateComponent(
    id: string,
    input: UpdateComponentInput,
    token: string,
  ): Promise<ApiItemResponse<AdminComponentDto>> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: `/api/admin/components/${encodeURIComponent(id)}`,
      method: 'PUT',
      body: input,
      token,
    });
  },

  deleteComponent(id: string, token: string): Promise<void> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: `/api/admin/components/${encodeURIComponent(id)}`,
      method: 'DELETE',
      token,
    });
  },

  createCategory(input: CreateCategoryInput, token: string): Promise<ApiItemResponse<CategoryDto>> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: '/api/admin/categories',
      method: 'POST',
      body: input,
      token,
    });
  },

  updateCategory(
    id: string,
    input: UpdateCategoryInput,
    token: string,
  ): Promise<ApiItemResponse<CategoryDto>> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: `/api/admin/categories/${encodeURIComponent(id)}`,
      method: 'PUT',
      body: input,
      token,
    });
  },

  deleteCategory(id: string, token: string): Promise<void> {
    return request({
      baseUrl: publicEnv.NEXT_PUBLIC_API_URL,
      path: `/api/admin/categories/${encodeURIComponent(id)}`,
      method: 'DELETE',
      token,
    });
  },
};
