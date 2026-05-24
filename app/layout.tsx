import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Allo Inventory Reservation',
  description: 'Inventory reservation with concurrency-safe stock holds',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
