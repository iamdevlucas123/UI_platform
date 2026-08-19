'use client';

import { useEffect, useState } from 'react';

/** Devolve `value` com atraso de `delayMs` — usado pelo preview vivo do `ComponentForm` (seção 5.4 do MVP2) para não remontar o iframe a cada tecla. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
