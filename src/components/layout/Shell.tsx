import type { ReactNode } from 'react';
import { Header } from './Header';
import { TabNav } from './TabNav';

interface ShellProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

export function Shell({ activeTab, onTabChange, children }: ShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      <TabNav activeTab={activeTab} onTabChange={onTabChange} />
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
