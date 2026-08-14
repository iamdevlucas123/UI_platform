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

/** Envelope padronizado de erro (seção 7). */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}
