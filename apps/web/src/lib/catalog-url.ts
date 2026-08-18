import { listComponentsQuerySchema, type ListComponentsQuery } from '@uilib/shared';

/**
 * Converte o `searchParams` resolvido de uma Server Component (seção 7 do
 * MVP2: `/?q=...` é dinâmica) em `URLSearchParams` — a partir daqui, o
 * mesmo `URLSearchParams` alimenta tanto o parsing (abaixo) quanto a
 * construção de hrefs (`buildCatalogHref`), sem duas representações
 * divergentes do mesmo estado de URL.
 */
export function toURLSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      if (value[0] !== undefined) {
        params.set(key, value[0]);
      }
    } else {
      params.set(key, value);
    }
  }
  return params;
}

/**
 * Valida/normaliza a query da home reaproveitando `listComponentsQuerySchema`
 * de `@uilib/shared` — o mesmo schema que a API usa para `GET
 * /api/components` (seção 4/7 do MVP2). Uma query inválida (ex.: `page`
 * não numérico) cai nos defaults do schema em vez de quebrar a página.
 */
export function parseCatalogQuery(params: URLSearchParams): ListComponentsQuery {
  const raw = Object.fromEntries(params.entries());
  const parsed = listComponentsQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : listComponentsQuerySchema.parse({});
}

export interface CatalogFilterChanges {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
}

/**
 * Constrói a URL canônica da home preservando os demais parâmetros ao
 * atualizar apenas um filtro (seção 5.1 do MVP2). Regras de canonicidade:
 * - `sort=recent` (default) e `page=1` (default) nunca aparecem na URL;
 * - mudar `q`/`category`/`sort` volta para a página 1 (novo conjunto de
 *   resultados, a paginação antiga deixa de fazer sentido); só passar
 *   `page` explicitamente muda a página sem resetar os demais filtros.
 */
export function buildCatalogHref(
  pathname: string,
  current: URLSearchParams,
  changes: CatalogFilterChanges,
): string {
  const next = new URLSearchParams(current);
  const isFilterChange = 'q' in changes || 'category' in changes || 'sort' in changes;

  if ('q' in changes) setOrDelete(next, 'q', changes.q);
  if ('category' in changes) setOrDelete(next, 'category', changes.category);
  if ('sort' in changes) {
    setOrDelete(next, 'sort', changes.sort === 'recent' ? undefined : changes.sort);
  }

  if ('page' in changes) {
    setOrDelete(next, 'page', changes.page && changes.page > 1 ? String(changes.page) : undefined);
  } else if (isFilterChange) {
    next.delete('page');
  }

  const query = next.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined): void {
  if (value === undefined || value.length === 0) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
}
