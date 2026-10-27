import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Stethoscope,
  Bell,
  Settings,
  Activity,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'conversations', label: 'AI Conversations', icon: MessageSquare, badge: 'Agent' },
    { id: 'doctors', label: 'Doctors & Availability', icon: Stethoscope },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo & title */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800 tracking-tight text-base">CareConnect</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
              AI
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">AWS CDS Clinical Agent</p>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-50 text-sky-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-teal-600" />
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Hackathon banner footer */}
      <div className="p-4 m-3 bg-slate-50 border border-slate-200/70 rounded-xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-slate-700">AWS CDS Hackathon</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Powered by AWS End User Messaging Social (WhatsApp), SES & Bedrock Agent.
        </p>
      </div>
    </aside>
  );
};
