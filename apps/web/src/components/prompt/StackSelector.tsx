'use client';

import type { ComponentPromptQuery } from '@uilib/shared';
import { promptFrameworkSchema, promptStylingSchema } from '@uilib/shared';
import { useRef, useState, type ChangeEvent } from 'react';

import { browserApi } from '@/lib/api-client';

type PromptFramework = ComponentPromptQuery['framework'];
type PromptStyling = ComponentPromptQuery['styling'];

// Mesmos defaults de `componentPromptQuerySchema` (seção 7 do MVP1) usados
// para renderizar o `prompt` inicial em `GET /:slug` — o seletor começa
// alinhado com o que já está na tela antes de qualquer troca.
const DEFAULT_FRAMEWORK: PromptFramework = 'react';
const DEFAULT_STYLING: PromptStyling = 'tailwind';

// Rótulos são só apresentação; os valores em si vêm de `promptFrameworkSchema`/
// `promptStylingSchema` (reaproveitados abaixo) — um `Record` tipado contra
// `PromptFramework`/`PromptStyling` obriga todas as chaves presentes, então o
// compilador acusa se o schema compartilhado ganhar/perder uma opção.
const FRAMEWORK_LABELS: Record<PromptFramework, string> = {
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  angular: 'Angular',
  html: 'HTML',
};

const STYLING_LABELS: Record<PromptStyling, string> = {
  tailwind: 'Tailwind CSS',
  css: 'CSS',
  'css-modules': 'CSS Modules',
  'styled-components': 'Styled Components',
};

export interface StackSelectorProps {
  slug: string;
  /** Chamado só quando uma resposta bem-sucedida e ainda válida chega (seção 5.3 do MVP2). */
  onPromptChange: (prompt: string) => void;
  /** Reflete se há uma busca em andamento — o pai usa isso para desabilitar o "Copy AI Prompt". */
  onLoadingChange?: (isLoading: boolean) => void;
}

/**
 * Seletor de stack de destino (seção 5.2/5.3 do MVP2): ao trocar framework
 * ou estilização, busca `GET /api/components/:slug/prompt?framework=&styling=`
 * via `browserApi` (`NEXT_PUBLIC_API_URL`, sem token) — inteiramente no
 * cliente, então trocar a stack nunca invalida o cache ISR da página (seção
 * 7 do MVP2: nada aqui lê/escreve `searchParams` ou dispara uma nova
 * renderização do Server Component).
 *
 * Condição de corrida: cada busca recebe um `requestId` monotônico
 * (`latestRequestId`); uma resposta — sucesso ou erro — só é aplicada se
 * `requestId` ainda for o mais recente no momento em que ela chega. Uma
 * resposta atrasada de uma seleção antiga nunca sobrescreve uma seleção mais
 * nova, e um erro nunca apaga o último prompt válido: `onPromptChange` só é
 * chamado no caminho de sucesso.
 */
export function StackSelector({ slug, onPromptChange, onLoadingChange }: StackSelectorProps) {
  const [framework, setFramework] = useState<PromptFramework>(DEFAULT_FRAMEWORK);
  const [styling, setStyling] = useState<PromptStyling>(DEFAULT_STYLING);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const latestRequestId = useRef(0);

  async function fetchPrompt(nextFramework: PromptFramework, nextStyling: PromptStyling): Promise<void> {
    const requestId = (latestRequestId.current += 1);
    setIsLoading(true);
    onLoadingChange?.(true);
    setHasError(false);

    try {
      const response = await browserApi.getComponentPrompt(slug, {
        framework: nextFramework,
        styling: nextStyling,
      });

      if (requestId !== latestRequestId.current) {
        return; // uma seleção mais nova já está em andamento — descarta.
      }
      onPromptChange(response.data.prompt);
    } catch {
      if (requestId !== latestRequestId.current) {
        return;
      }
      setHasError(true);
    } finally {
      if (requestId === latestRequestId.current) {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }
  }

  function handleFrameworkChange(event: ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value as PromptFramework;
    setFramework(next);
    void fetchPrompt(next, styling);
  }

  function handleStylingChange(event: ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value as PromptStyling;
    setStyling(next);
    void fetchPrompt(framework, next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="stack-selector-framework" className="flex items-center gap-1.5 text-xs text-neutral-600">
          Framework
          <select
            id="stack-selector-framework"
            value={framework}
            onChange={handleFrameworkChange}
            className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-800"
          >
            {promptFrameworkSchema.options.map((value) => (
              <option key={value} value={value}>
                {FRAMEWORK_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="stack-selector-styling" className="flex items-center gap-1.5 text-xs text-neutral-600">
          Styling
          <select
            id="stack-selector-styling"
            value={styling}
            onChange={handleStylingChange}
            className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-800"
          >
            {promptStylingSchema.options.map((value) => (
              <option key={value} value={value}>
                {STYLING_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        {isLoading && (
          <span role="status" className="text-xs text-neutral-400">
            Updating prompt…
          </span>
        )}
      </div>
      {hasError && (
        <p role="alert" className="text-xs text-red-600">
          Couldn&apos;t update the prompt for this stack — showing the previous version.
        </p>
      )}
    </div>
  );
}
