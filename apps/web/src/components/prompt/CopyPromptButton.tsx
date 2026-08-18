'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { copyToClipboard } from '@/lib/copy-to-clipboard';

export interface CopyPromptButtonProps {
  /** Texto exato retornado pela API (`prompt` de `GET /:slug` ou `GET /:slug/prompt`) — seção 5.3 do MVP2. */
  prompt: string;
  /** `true` enquanto `StackSelector` busca um prompt novo — nunca copiar um prompt em transição (seção 5.3 do MVP2). */
  disabled?: boolean;
}

type CopyStatus = 'idle' | 'success' | 'error';

const STATUS_RESET_MS = 2000;

/**
 * Botão "Copy AI Prompt" (seção 5.3 do MVP2): só `navigator.clipboard.writeText(prompt)`
 * e um status transitório de confirmação — sem SDK, chave ou chamada a
 * provedor de LLM. `prompt` é copiado exatamente como chega via props, sem
 * nenhuma interpolação/formatação no frontend (diferente de `CopyCodeButton`,
 * que concatena HTML/CSS/JS — aqui o texto já vem pronto da API).
 */
export function CopyPromptButton({ prompt, disabled = false }: CopyPromptButtonProps) {
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
    const ok = await copyToClipboard(prompt);
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
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
      >
        {status === 'success' ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Copy AI Prompt
      </button>
      {status === 'success' && (
        <span role="status" className="text-xs text-emerald-600">
          Copied to clipboard
        </span>
      )}
      {status === 'error' && (
        <span role="alert" className="text-xs text-red-600">
          Couldn&apos;t copy — try selecting the text manually.
        </span>
      )}
    </div>
  );
}
