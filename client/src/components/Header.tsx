import React from 'react';
import { AWSStatus } from '../types';
import { Cloud, Radio, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface HeaderProps {
  currentTab: string;
  awsStatus: AWSStatus | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  awsStatus,
  onRefresh,
  isRefreshing,
}) => {
  const titles: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Clinical Operations Dashboard',
      subtitle: 'Overview of scheduled appointments, patient engagement, and CDS delivery',
    },
    appointments: {
      title: 'Appointment Management',
      subtitle: 'Real-time scheduling, rescheduling, cancellations, and doctor availability slots',
    },
    patients: {
      title: 'Patient Directory & Consent',
      subtitle: 'Patient communication profiles, consent compliance, and booking history',
    },
    conversations: {
      title: 'AI Conversational Agent Sandbox',
      subtitle: 'Interactive test chat for Bedrock tools, WhatsApp simulation, and context retention',
    },
    doctors: {
      title: 'Doctors & Working Hours',
      subtitle: 'Specialties, clinical rooms, working schedules, and available appointment slots',
    },
    notifications: {
      title: 'AWS CDS Notifications & Delivery Logs',
      subtitle: 'Audit logs for WhatsApp, SMS, and Amazon SES emails with retry capabilities',
    },
    settings: {
      title: 'AWS Integrations & Settings',
      subtitle: 'Live AWS credentials status, Bedrock configuration, and developer environment info',
    },
  };

  const current = titles[currentTab] || {
    title: 'CareConnect AI',
    subtitle: 'Clinical Healthcare Communication Agent',
  };

  const isLiveAWS = awsStatus?.hasCredentials;

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">{current.title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* AWS Integration Mode Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-xs">
          <Cloud className={`w-3.5 h-3.5 ${isLiveAWS ? 'text-emerald-600' : 'text-sky-600'}`} />
          <span className="font-medium text-slate-700">AWS:</span>
          {isLiveAWS ? (
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live AWS SDK
            </span>
          ) : (
            <span className="font-semibold text-sky-700 flex items-center gap-1">
              <Radio className="w-3 h-3 text-sky-500" />
              Dev Mode (Sandbox)
            </span>
          )}
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          isLoading={isRefreshing}
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>
    </header>
  );
};
