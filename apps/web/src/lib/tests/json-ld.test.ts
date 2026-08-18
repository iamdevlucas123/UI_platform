import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from '../json-ld';

describe('serializeJsonLd (seção 5.2 do MVP2: dados estruturados serializados com segurança)', () => {
  it('produz JSON válido que faz round-trip para os dados originais', () => {
    const data = { '@type': 'Thing', name: 'Neon Toggle', tags: ['react', 'tailwind'] };

    const serialized = serializeJsonLd(data);

    expect(JSON.parse(serialized)).toEqual(data);
  });

  it('neutraliza uma sequência "</script>" embutida em um campo de texto', () => {
    const data = { description: 'Break out </script><img src=x onerror=alert(1)> now' };

    const serialized = serializeJsonLd(data);

    expect(serialized).not.toContain('</script>');
    // Só o `<` precisa ser escapado — é o que o parser HTML do navegador
    // procura para reconhecer uma tag de fechamento; sem ele, a sequência
    // "/script>" sozinha é só texto inofensivo dentro do <script>.
    expect(serialized).toContain('\\u003c/script>');
    // Continua sendo o mesmo dado depois de parseado — nada foi perdido, só
    // deixou de ser perigoso dentro de um <script>.
    expect(JSON.parse(serialized)).toEqual(data);
  });

  it('escapa todo "<" do JSON, não só em "</script>"', () => {
    const serialized = serializeJsonLd({ value: '1 < 2' });

    expect(serialized).not.toContain('<');
    expect(JSON.parse(serialized)).toEqual({ value: '1 < 2' });
  });
});
