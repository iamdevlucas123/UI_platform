'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { copyToClipboard, formatComponentCode, type ComponentCodeSections } from '@/lib/copy-to-clipboard';

export type CopyCodeButtonProps = ComponentCodeSections;

type CopyStatus = 'idle' | 'success' | 'error';

const STATUS_RESET_MS = 2000;

/**
 * Botão "Copy Code" (seção 5.2 do MVP2): copia HTML+CSS+JS concatenados
 * (seção 5.2/`formatComponentCode`) e mostra um status transitório de
 * sucesso/erro — mesmo padrão de mensagem `role="status"`/`role="alert"` já
 * usado no banner de erro recuperável do catálogo (`CatalogGrid`), sem
 * depender de uma lib de toast externa.
 */
export function CopyCodeButton({ html, css, js }: CopyCodeButtonProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function handleClick(): Promise<void> {
    const ok = await copyToClipboard(formatComponentCode({ html, css, js }));
    setStatus(ok ? 'success' : 'error');

    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => setStatus('idle'), STATUS_RESET_MS);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 sm:text-sm"
      >
        {status === 'success' ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Copy code
      </button>
      {status === 'success' && (
        <span role="status" className="text-xs text-emerald-600">
          Copied to clipboard
        </span>
      )}
      {status === 'error' && (
        <span role="alert" className="text-xs text-red-600">
          Couldn&apos;t copy — try selecting the code manually.
        </span>
      )}
    </div>
  );
}
