import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import type { ApiError } from '@/lib/api-client';

/**
 * Mapeia `error.details` (seção 4/7 do MVP1: array de `{path, message}` —
 * 409 de slug duplicado, 422 de categoria inexistente) para os campos do
 * formulário via `setError`, sem apagar os valores já digitados (RHF só
 * anota o erro, nunca chama `reset`). Sempre devolve a mensagem para um
 * banner acima do botão de salvar também — garante que o erro fica
 * "igualmente acionável" mesmo se o campo already estiver fora da área
 * visível, e cobre erros sem `details` mapeável (ex.: 500).
 */
export function applyApiErrorToForm<T extends FieldValues>(
  error: ApiError,
  setError: UseFormSetError<T>,
): string {
  if (Array.isArray(error.details)) {
    for (const detail of error.details) {
      setError(detail.path as Path<T>, { type: 'server', message: detail.message });
    }
  }
  return error.message;
}
