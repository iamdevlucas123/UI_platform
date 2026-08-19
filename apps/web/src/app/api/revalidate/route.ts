import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';

/**
 * `POST /api/revalidate` (seção 7/13 do MVP2): endpoint interno chamado
 * pelo `apps/api` (`lib/revalidate.ts`) depois de qualquer mutação
 * administrativa de componente/categoria — invalida `revalidateTag('components')`,
 * a tag usada por toda consulta pública cacheada (home, categoria, detalhe),
 * para a publicação aparecer quase instantaneamente em vez de esperar os
 * 300s de `revalidate` normais.
 *
 * Protegido por `REVALIDATE_SECRET` compartilhado (Bearer) — nunca por
 * sessão do Clerk, porque quem chama é o backend, não um navegador logado.
 * Não faz parte do envelope REST da seção 4 (não é um recurso de negócio),
 * então a resposta é um formato simples, não `{ data }`/`{ error }`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (token !== env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid revalidation secret' }, { status: 401 });
  }

  revalidateTag('components');

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
