import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Notifica o Next.js (`/api/revalidate`, seção 7 do MVP2) para invalidar o
 * cache público (`revalidateTag('components')`) depois de qualquer mutação
 * administrativa de componente ou categoria — as duas entidades alimentam
 * páginas cacheadas com essa mesma tag (home, categoria, detalhe). Chamado
 * pelos services, depois da escrita no banco já ter sido confirmada.
 *
 * *Best-effort*: uma falha aqui nunca deve propagar para o chamador — a
 * mutação em si já foi persistida com sucesso, e o cache público de
 * qualquer forma expira sozinho via `revalidate: 300` (seção 7). Só loga,
 * para investigação, sem derrubar a resposta 200/201/204 já ganha.
 */
export async function revalidate(): Promise<void> {
  try {
    const response = await fetch(`${env.WEB_ORIGIN}/api/revalidate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.REVALIDATE_SECRET}` },
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, 'Revalidation request was rejected');
    }
  } catch (error) {
    logger.warn({ err: error }, 'Could not reach the revalidation endpoint');
  }
}
