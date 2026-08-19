import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** `<Input>` (subset shadcn — seção 3 do MVP2): `<input>` nativo estilizado, sem dependência de Radix. */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200',
        className,
      )}
      {...props}
    />
  );
}
