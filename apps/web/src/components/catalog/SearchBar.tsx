'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { buildCatalogHref } from '@/lib/catalog-url';

const DEBOUNCE_MS = 300;

/**
 * Busca por nome/descrição (seção 5.1 do MVP2): debounce de 300ms, estado
 * refletido em `?q=`, sem criar uma entrada de histórico por tecla digitada.
 *
 * `router.replace` (nunca `push`) garante o "sem histórico por tecla":
 * `replace` sobrescreve a entrada atual em vez de empilhar uma nova, então
 * não importa quantas vezes o debounce disparar — o histórico do navegador
 * nunca cresce por causa da digitação.
 *
 * `startTransition` é o que permite que o conteúdo atual do grid continue
 * visível enquanto a nova busca carrega no servidor, em vez de cair no
 * fallback de `app/loading.tsx` — essencial para `CatalogGrid` conseguir
 * manter o resultado anterior visível se a nova busca falhar (seção 5.1:
 * "conteúdo ISR já em cache não deve sumir por uma indisponibilidade
 * transitória").
 */
export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantém o input em sincronia se a URL mudar por outra via (voltar/avançar do navegador).
  useEffect(() => {
    setValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function handleChange(nextValue: string): void {
    setValue(nextValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const href = buildCatalogHref(pathname, searchParams, { q: nextValue.trim() || undefined });
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    }, DEBOUNCE_MS);
  }

  return (
    <div className="relative w-full sm:max-w-xs">
      <label htmlFor="catalog-search" className="sr-only">
        Search components by name or description
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
      />
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Search components..."
        aria-busy={isPending}
        className="w-full rounded-full border border-neutral-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-neutral-400"
      />
    </div>
  );
}
