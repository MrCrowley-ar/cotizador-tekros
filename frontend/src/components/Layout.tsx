import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { FeedPanel } from '../features/feed/FeedPanel';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  /** When true: main fills viewport without padding and without outer scroll.
   *  The page is responsible for its own overflow/padding. */
  fullHeight?: boolean;
}

export function Layout({ children, title, fullHeight }: LayoutProps) {
  const [showFeed, setShowFeed] = useState(() => {
    return localStorage.getItem('showFeed') !== 'false';
  });

  function toggleFeed() {
    setShowFeed((prev) => {
      const next = !prev;
      localStorage.setItem('showFeed', String(next));
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title={title} onToggleFeed={toggleFeed} showFeed={showFeed} />
        <main className={fullHeight ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto p-6'}>
          {children}
        </main>
      </div>
      {showFeed && <FeedPanel />}
    </div>
  );
}
