import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** `<textarea>` nativo estilizado — mesmo critério de `<Input>`, para os campos multi-linha do `ComponentForm` (description, html, css, js, promptTemplate). */
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200',
        className,
      )}
      {...props}
    />
  );
}
