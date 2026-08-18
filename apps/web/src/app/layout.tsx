import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { publicEnv } from '@/lib/env';

import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: 'UI Library',
  description: 'Biblioteca web pública de componentes de interface.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-neutral-950 antialiased">{children}</body>
    </html>
  );
}
