import React, { useState } from 'react';
import { AWSStatus } from '../types';
import { Info, X, ExternalLink } from 'lucide-react';

interface DevModeBannerProps {
  awsStatus: AWSStatus | null;
  onNavigateSettings: () => void;
}

export const DevModeBanner: React.FC<DevModeBannerProps> = ({
  awsStatus,
  onNavigateSettings,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !awsStatus || awsStatus.hasCredentials) {
    return null;
  }

  return (
    <div className="bg-sky-50 border-b border-sky-200/70 px-8 py-2.5 text-xs text-sky-800 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Info className="w-4 h-4 text-sky-600 shrink-0" />
        <span>
          <strong className="font-semibold text-sky-900">Development Mode Active:</strong> AWS credentials are not set in <code className="bg-sky-100/80 px-1.5 py-0.5 rounded text-sky-950 font-mono">server/.env</code>. The conversational agent and AWS messaging will operate in a zero-cost local simulation sandbox.
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        <button
          onClick={onNavigateSettings}
          className="font-medium underline hover:text-sky-950 flex items-center gap-1 cursor-pointer"
        >
          View AWS Integration Status
          <ExternalLink className="w-3 h-3" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-sky-500 hover:text-sky-700 p-0.5"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
