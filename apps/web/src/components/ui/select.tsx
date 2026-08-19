import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * `<Select>` (subset shadcn — seção 3 do MVP2): `<select>` nativo estilizado
 * em vez do primitivo Radix — mais acessível por padrão (teclado, leitor de
 * tela, mobile) e sem dependência pesada extra, mesmo critério de `<Input>`.
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
