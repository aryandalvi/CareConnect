import React from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { getStatusBadge } from '../components/Badge';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  MessageSquare,
  ArrowUpRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';

interface DashboardProps {
  metrics: any;
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ metrics, onNavigate, onRefresh }) => {
  const [isProcessingReminders, setIsProcessingReminders] = React.useState(false);
  const [processMessage, setProcessMessage] = React.useState<string | null>(null);

  const stats = metrics?.stats || {
    totalAppointments: 0,
    todayAppointments: 0,
    upcomingAppointments: 0,
    pendingConfirmations: 0,
    totalPatients: 0,
  };

  const reminderStats = metrics?.reminderStats || {
    total: 0,
    delivered: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    byChannel: { whatsapp: 0, sms: 0, email: 0 },
  };

  const recentActivity = metrics?.recentActivity || [];
  const recentAppointments = metrics?.recentAppointments || [];

  const handleProcessDueReminders = async () => {
    try {
      setIsProcessingReminders(true);
      setProcessMessage(null);
      const res = await api.processDueReminders();
      setProcessMessage(`Processed ${res.processedCount || 0} due reminder(s)`);
      onRefresh();
    } catch (err: any) {
      setProcessMessage(`Error: ${err.message}`);
    } finally {
      setIsProcessingReminders(false);
      setTimeout(() => setProcessMessage(null), 5000);
    }
  };

  const statCards = [
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      subtitle: 'Active visits scheduled today',
      icon: Clock,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      title: 'Upcoming Visits',
      value: stats.upcomingAppointments,
      subtitle: 'Confirmed future appointments',
      icon: Calendar,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'Pending Confirmations',
      value: stats.pendingConfirmations,
      subtitle: 'Awaiting patient response',
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'Active Patients',
      value: stats.totalPatients,
      subtitle: 'Consented patient records',
      icon: Users,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">
            CareConnect AI Healthcare Agent &bull; Operations Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated WhatsApp reminders, Amazon SES confirmation emails, and Bedrock appointment assistance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {processMessage && (
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
              {processMessage}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessDueReminders}
            isLoading={isProcessingReminders}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Run Due Reminders</span>
          </Button>
          <Button size="sm" onClick={() => onNavigate('appointments')}>
            <Calendar className="w-3.5 h-3.5" />
            <span>Manage Appointments</span>
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx}>
              <CardBody className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">{card.title}</span>
                  <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-slate-800 tracking-tight">
                    {card.value}
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">{card.subtitle}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Grid: CDS Delivery Stats & Recent Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reminder & Notification Delivery Stats (1 column) */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="AWS CDS Delivery Statistics"
            subtitle="Cross-channel delivery metrics"
            action={
              <button
                onClick={() => onNavigate('notifications')}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5"
              >
                Logs <ArrowUpRight className="w-3 h-3" />
              </button>
            }
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <div className="text-lg font-bold text-emerald-700">
                  {reminderStats.delivered}
                </div>
                <div className="text-[11px] font-medium text-emerald-600">Delivered</div>
              </div>
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-100">
                <div className="text-lg font-bold text-sky-700">{reminderStats.sent}</div>
                <div className="text-[11px] font-medium text-sky-600">Sent</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-100">
                <div className="text-lg font-bold text-rose-700">{reminderStats.failed}</div>
                <div className="text-[11px] font-medium text-rose-600">Failed</div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Distribution by Channel
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    WhatsApp (AWS Social Messaging)
                  </span>
                  <span className="font-semibold text-slate-800">
                    {reminderStats.byChannel?.whatsapp || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Amazon Simple Email Service (SES)
                  </span>
                  <span className="font-semibold text-slate-800">
                    {reminderStats.byChannel?.email || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    AWS End User Messaging SMS
                  </span>
                  <span className="font-semibold text-slate-800">
                    {reminderStats.byChannel?.sms || 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-start gap-2 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Consent enforcement active. Automated reminders check communication opt-in before dispatch.
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Recent Appointments (2 columns) */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent & Upcoming Appointments"
            subtitle="Latest patient visits across clinic specialties"
            action={
              <button
                onClick={() => onNavigate('appointments')}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5"
              >
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100 font-medium">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Doctor & Specialty</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      No appointments found.
                    </td>
                  </tr>
                ) : (
                  recentAppointments.map((apt: any) => (
                    <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {apt.patient.firstName} {apt.patient.lastName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {apt.patient.phoneNumber}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-700">Dr. {apt.doctor.name}</div>
                        <div className="text-[11px] text-slate-400">{apt.specialty}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-slate-700">
                          {format(new Date(apt.dateTime), 'MMM d, yyyy')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {format(new Date(apt.dateTime), 'h:mm a')}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{getStatusBadge(apt.status)}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(apt.reminderStatus)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent Activity Log Feed */}
      <Card>
        <CardHeader
          title="Clinical Activity & Audit Trail"
          subtitle="Real-time log of AI agent tool executions, appointments created/rescheduled, and reminders"
        />
        <div className="divide-y divide-slate-100">
          {recentActivity.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No activity recorded yet.</div>
          ) : (
            recentActivity.map((log: any) => (
              <div key={log.id} className="p-4 px-5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-sky-500"></div>
                  <div>
                    <span className="font-semibold text-slate-800 mr-2">{log.action}</span>
                    <span className="text-slate-500">
                      by <strong className="font-medium text-slate-700">{log.performedBy}</strong>
                    </span>
                    {log.details && (
                      <span className="text-slate-400 ml-2 font-mono text-[11px]">
                        {log.details.length > 80 ? `${log.details.slice(0, 80)}...` : log.details}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
