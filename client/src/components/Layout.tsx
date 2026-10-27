import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DevModeBanner } from './DevModeBanner';
import { AWSStatus } from '../types';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  awsStatus: AWSStatus | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentTab,
  setCurrentTab,
  awsStatus,
  onRefresh,
  isRefreshing,
  children,
}) => {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          awsStatus={awsStatus}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
        <DevModeBanner
          awsStatus={awsStatus}
          onNavigateSettings={() => setCurrentTab('settings')}
        />
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
