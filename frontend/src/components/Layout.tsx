import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  /** When true: main fills viewport without padding and without outer scroll.
   *  The page is responsible for its own overflow/padding. */
  fullHeight?: boolean;
}

export function Layout({ children, title, fullHeight }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title={title} />
        <main className={fullHeight ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto p-6'}>
          {children}
        </main>
      </div>
    </div>
  );
}
