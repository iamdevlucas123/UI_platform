'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

export interface CodeTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface CodeTabsClientProps {
  tabs: CodeTabItem[];
}

/**
 * Shell interativo das abas de código (seção 5.2 do MVP2). Recebe
 * `tabs[].content` já renderizado pelo Server Component `CodeTabs` (o
 * highlight do Shiki já rodou no servidor) — este componente só decide qual
 * painel mostrar, nunca reprocessa código nem importa `shiki`.
 */
export function CodeTabsClient({ tabs }: CodeTabsClientProps) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);

  return (
    <div>
      <div role="tablist" aria-label="Component code" className="flex gap-1 border-b border-neutral-800 px-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`code-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`code-panel-${tab.id}`}
              onClick={() => setActiveId(tab.id)}
              className={[
                'border-b-2 px-3 py-2 text-xs font-medium transition-colors sm:text-sm',
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`code-panel-${tab.id}`}
          aria-labelledby={`code-tab-${tab.id}`}
          hidden={tab.id !== activeId}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
