/**
 * Template global padrão de prompt de IA (MVP1, seção 8), aplicado quando o
 * componente não tem `promptTemplate` próprio. Texto e variáveis
 * `{{...}}`/`{{#js}}...{{/js}}` copiados literalmente da seção 8 — qualquer
 * alteração de redação deve ser feita lá primeiro.
 */
export const DEFAULT_PROMPT_TEMPLATE = `You are working inside an existing codebase. Your task is to add ONE new UI
component, reproducing the reference implementation below as faithfully as
possible.

## Component
Name: {{name}}
Category: {{category}}
Description: {{description}}
Reference: {{sourceUrl}}

## Reference implementation (HTML + CSS{{#js}} + JS{{/js}})

\`\`\`html
{{html}}
\`\`\`

\`\`\`css
{{css}}
\`\`\`
{{#js}}
\`\`\`js
{{js}}
\`\`\`
{{/js}}

## Target stack
- Framework: {{targetFramework}}
- Styling: {{targetStyling}}

## Requirements
1. Port the reference implementation to {{targetFramework}} using
   {{targetStyling}}. Keep the exact visual result: identical dimensions,
   colors, spacing, typography, transitions, easing curves and timings.
2. If {{targetStyling}} cannot express something (complex keyframes, custom
   pseudo-elements, filters), keep that part as plain CSS in a co-located
   stylesheet or a <style> block instead of approximating it.
3. Create the component as a NEW self-contained file, following the naming and
   folder conventions already present in this codebase. Infer them from the
   existing code — do not invent a new structure.
4. Make the component reusable: extract text, colors and sizes that a consumer
   would reasonably want to change into props, with defaults matching the
   reference.
5. Scope all class names and styles so they cannot leak into or collide with
   existing styles.
6. Do NOT modify unrelated files, do NOT reformat existing code, do NOT add
   dependencies unless strictly required — and if one is required, state why
   before adding it.
7. Preserve accessibility: keep semantic elements, focus states, ARIA
   attributes and keyboard interaction from the reference; add them if missing.
8. After creating the file, show a minimal usage example.

Output the complete, ready-to-use code. Do not summarize or omit sections.
`;
