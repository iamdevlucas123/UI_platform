import type { ComponentListItemDto } from '@uilib/shared';

import { ComponentCard } from './ComponentCard';

export interface GridProps {
  items: ComponentListItemDto[];
}

/** Grid responsivo de cards (seção 5.1 do MVP2). `<ul>/<li>`: é uma lista de itens. */
export function Grid({ items }: GridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.id}>
          <ComponentCard component={item} />
        </li>
      ))}
    </ul>
  );
}
