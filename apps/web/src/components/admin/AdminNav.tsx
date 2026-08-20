'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/components', label: 'Components' },
  { href: '/admin/categories', label: 'Categories' },
];

/** Navegação da área administrativa (seção 7 do MVP2). */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
