import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'sm';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: 'bg-neutral-900 text-white hover:bg-neutral-700',
  outline: 'border border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
  ghost: 'text-neutral-600 hover:bg-neutral-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

export interface ButtonVariantProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * Classes de botão (subset shadcn — seção 3 do MVP2), exportadas separadas
 * do componente `<Button>` para poderem ser aplicadas em outros elementos
 * (ex.: `<Link className={buttonVariants({...})}>`) sem depender de um
 * primitivo `Slot` do Radix, que este projeto não instala de propósito
 * ("código copiado para o repo, sem dependência pesada", seção 3).
 */
export function buttonVariants({ variant = 'default', size = 'default' }: ButtonVariantProps = {}): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantProps {}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
