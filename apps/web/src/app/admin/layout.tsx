import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminNav } from '@/components/admin/AdminNav';

import { AdminProviders } from './providers';

/**
 * `/admin/*` é sempre dinâmica (seção 7 do MVP2: "dados sempre frescos,
 * sessão obrigatória") — nunca cacheada nem pré-renderizada estaticamente.
 */
export const dynamic = 'force-dynamic';

/** `noindex` explícito na área administrativa (seção 5.2/7 do MVP2), somado ao bloqueio de crawler já feito em `robots.ts`. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Guard de `/admin/*` (seção 9 do MVP2, fluxo 3). Autenticação já é
 * garantida por `clerkMiddleware`/`auth.protect()` (`middleware.ts`) — quem
 * chega aqui sem sessão já foi redirecionado a `/sign-in` antes deste
 * componente rodar. Este layout cobre a AUTORIZAÇÃO: sessão válida mas sem
 * `role: 'admin'` em `publicMetadata` (exposta via claim customizada
 * `metadata` no session token, seção 9) recebe `notFound()` — nunca um
 * dashboard parcialmente acessível nem um redirect que revelaria a
 * existência da área administrativa a quem não tem permissão.
 *
 * `AdminProviders` (TanStack Query + toast, seção 3) só é montado aqui —
 * depois do guard, só para quem já passou por ele — nunca no layout raiz.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { sessionClaims } = await auth();

  if (sessionClaims?.metadata?.role !== 'admin') {
    notFound();
  }

  return (
    <AdminProviders>
      <div className="min-h-screen bg-neutral-50">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-8">
          <AdminNav />
          <UserButton />
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </AdminProviders>
  );
}
