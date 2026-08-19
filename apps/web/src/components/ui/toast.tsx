'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

export type ToastVariant = 'default' | 'destructive';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
}

const TOAST_DURATION_MS = 5000;

/**
 * `toast()` (subset shadcn — seção 3 do MVP2) é uma função simples, não um
 * hook: precisa ser chamável de fora de um componente React — em particular
 * do `onError` global do `QueryClient` (`app/admin/providers.tsx`), que não
 * roda dentro da árvore de componentes. Por isso o estado vive num módulo
 * (listeners externos ao React), não em Context — mesmo padrão usado pela
 * implementação de referência do shadcn/ui.
 */
let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit(): void {
  for (const listener of listeners) {
    listener(toasts);
  }
}

function dismiss(id: string): void {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

export function toast(input: ToastInput): void {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, variant: 'default', ...input }];
  emit();
  setTimeout(() => dismiss(id), TOAST_DURATION_MS);
}

function useToastItems(): ToastItem[] {
  const [items, setItems] = useState(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  return items;
}

/** Monta a pilha de toasts — um único `<Toaster />` por árvore (montado em `AdminProviders`). */
export function Toaster() {
  const items = useToastItems();

  return (
    <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          role={item.variant === 'destructive' ? 'alert' : 'status'}
          className={cn(
            'flex items-start justify-between gap-3 rounded-lg border p-3 shadow-lg',
            item.variant === 'destructive'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-neutral-200 bg-white text-neutral-800',
          )}
        >
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            {item.description && <p className="mt-0.5 text-xs opacity-80">{item.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Dismiss notification"
            className="text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
