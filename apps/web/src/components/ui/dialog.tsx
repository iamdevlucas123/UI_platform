'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * `<Dialog>` (subset shadcn — seção 3 do MVP2): implementação própria, sem
 * Radix (mesmo critério de `<Input>`/`<Select>` — "sem dependência pesada").
 * Cobre o essencial de acessibilidade: `role="dialog"`/`aria-modal`, fecha
 * com Escape ou clique no overlay, foca o primeiro botão ao abrir.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.querySelector('button')?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="dialog-title" className="text-lg font-semibold text-neutral-900">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
