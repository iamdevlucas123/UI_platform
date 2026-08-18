'use client';

import { useEffect } from 'react';

/**
 * Rede de segurança para falhas verdadeiramente inesperadas — `page.tsx`
 * já trata `ApiError` internamente (erro recuperável / banner discreto,
 * seção 5.1 do MVP2) e nunca deveria chegar até aqui. Error boundaries do
 * App Router precisam ser Client Components.
 */
export default function HomeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-6xl flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-neutral-700">Something went wrong.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        Try again
      </button>
    </main>
  );
}
