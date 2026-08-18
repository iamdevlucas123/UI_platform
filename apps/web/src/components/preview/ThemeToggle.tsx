'use client';

import { Moon, Sun } from 'lucide-react';

import type { PreviewBackground } from './SandboxPreview';

export interface ThemeToggleProps {
  value: PreviewBackground;
  onChange: (value: PreviewBackground) => void;
  className?: string;
}

const OPTIONS: Array<{ value: PreviewBackground; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Light background', Icon: Sun },
  { value: 'dark', label: 'Dark background', Icon: Moon },
];

/**
 * Alterna o fundo da área externa ao componente entre claro/escuro (seção
 * 5.2 do MVP2). Controlado: quem guarda o estado é o pai (a página de
 * detalhe, futuramente), este componente só emite `onChange`.
 */
export function ThemeToggle({ value, onChange, className }: ThemeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Preview background"
      className={[
        'inline-flex items-center gap-1 rounded-full border border-neutral-200 p-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {OPTIONS.map(({ value: optionValue, label, Icon }) => {
        const isActive = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            onClick={() => onChange(optionValue)}
            className={[
              'flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              isActive ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
