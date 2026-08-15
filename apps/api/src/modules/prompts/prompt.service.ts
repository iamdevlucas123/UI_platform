import { DEFAULT_PROMPT_TEMPLATE } from './default-template.js';

/** Dados de um componente necessários para renderizar o prompt (seção 8 do MVP1). */
export interface RenderPromptInput {
  name: string;
  category: string;
  description: string;
  technologies: string[];
  html: string;
  css: string;
  js: string | null;
  /** Template próprio do componente; `null` usa o {@link DEFAULT_PROMPT_TEMPLATE}. */
  promptTemplate: string | null;
  targetFramework: string;
  targetStyling: string;
  sourceUrl: string;
}

/**
 * Resolve o bloco condicional `{{#js}}...{{/js}}` (mantém o conteúdo só
 * quando `hasJs`) e substitui as variáveis `{{var}}` (seção 8 do MVP1).
 * Implementação manual: a stack do MVP1 (seção 3) não lista nenhuma lib de
 * templating — é só troca de string, não justificaria uma dependência.
 * Placeholders sem valor correspondente ficam intactos (útil para depurar
 * um `promptTemplate` customizado com uma variável digitada errado).
 */
function applyTemplate(
  template: string,
  variables: Record<string, string>,
  hasJs: boolean,
): string {
  const withConditionalBlocks = template.replace(
    /\{\{#js\}\}([\s\S]*?)\{\{\/js\}\}/g,
    hasJs ? '$1' : '',
  );

  return withConditionalBlocks.replace(
    /\{\{(\w+)\}\}/g,
    (match, key: string) => variables[key] ?? match,
  );
}

/**
 * Renderiza o prompt de IA de um componente para uma stack de destino.
 * Usa o `promptTemplate` do próprio componente quando existir; senão
 * aplica o template global padrão (seção 8 do MVP1).
 */
export function renderPrompt(input: RenderPromptInput): string {
  const template = input.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;

  return applyTemplate(
    template,
    {
      name: input.name,
      category: input.category,
      description: input.description,
      technologies: input.technologies.join(', '),
      html: input.html,
      css: input.css,
      js: input.js ?? '',
      targetFramework: input.targetFramework,
      targetStyling: input.targetStyling,
      sourceUrl: input.sourceUrl,
    },
    Boolean(input.js),
  );
}
