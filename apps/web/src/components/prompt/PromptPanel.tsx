'use client';

import { useState } from 'react';

import { CopyPromptButton } from './CopyPromptButton';
import { StackSelector } from './StackSelector';

export interface PromptPanelProps {
  slug: string;
  /** `prompt` de `GET /api/components/:slug` — já renderizado pela API (seção 4/5.2 do MVP2). */
  initialPrompt: string;
}

/**
 * Une `CopyPromptButton` e `StackSelector` (seção 5.2/5.3 do MVP2): guarda o
 * prompt atual (começa como o já vindo do Server Component) e o estado de
 * carregamento, ambos atualizados pelo `StackSelector` via callback. Só essa
 * amarração fica aqui — a lógica de busca/condição de corrida/erro vive
 * inteiramente em `StackSelector`, testável isoladamente.
 */
export function PromptPanel({ slug, initialPrompt }: PromptPanelProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-neutral-700">AI Prompt</h2>
        <CopyPromptButton prompt={prompt} disabled={isLoading} />
      </div>
      <StackSelector slug={slug} onPromptChange={setPrompt} onLoadingChange={setIsLoading} />
    </section>
  );
}
