import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { getStatusBadge } from '../components/Badge';
import {
  Bell,
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Eye,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';
import { Notification } from '../types';

export const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Preview Modal
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Retry state
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications({
        channel: channelFilter !== 'ALL' ? channelFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setNotifications(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [channelFilter, statusFilter]);

  const handleRetry = async (notificationId: string) => {
    try {
      setRetryingId(notificationId);
      setRetryResult(null);
      await api.retryNotification(notificationId);
      setRetryResult('Notification resent successfully via AWS integration.');
      loadNotifications();
    } catch (err: any) {
      setRetryResult(`Retry failed: ${err.message}`);
    } finally {
      setRetryingId(null);
      setTimeout(() => setRetryResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {retryResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <span>{retryResult}</span>
          <button onClick={() => setRetryResult(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Communication Channels</option>
            <option value="WHATSAPP">WhatsApp (Social Messaging)</option>
            <option value="EMAIL">Amazon SES Email</option>
            <option value="SMS">End User Messaging SMS</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Delivery Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        <Button size="sm" variant="outline" onClick={loadNotifications} isLoading={loading}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title={`AWS Messaging Audit Logs (${notifications.length})`}
          subtitle="Real-time delivery receipts from AWS End User Messaging & Amazon SES"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-medium">
              <tr>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Recipient</th>
                <th className="px-5 py-3">Content / Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Sent At</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading notifications...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No notification logs found.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        {n.channel === 'WHATSAPP' && (
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        {n.channel === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-sky-600" />}
                        {n.channel === 'SMS' && (
                          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        {n.channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-600">{n.type}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">{n.recipient}</td>
                    <td className="px-5 py-3.5 max-w-[260px] truncate text-slate-600">
                      {n.subject || n.content}
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(n.status)}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {n.sentAt ? format(new Date(n.sentAt), 'MMM d, h:mm a') : 'Pending'}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedNotification(n);
                          setIsPreviewOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md"
                        title="View Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleRetry(n.id)}
                        disabled={retryingId === n.id}
                        className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-md disabled:opacity-50"
                        title="Retry Dispatch"
                      >
                        <RotateCcw
                          className={`w-3.5 h-3.5 ${retryingId === n.id ? 'animate-spin' : ''}`}
                        />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Message Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="AWS CDS Notification Record"
        subtitle={`External ID: ${selectedNotification?.externalMessageId || 'Pending ID'}`}
        maxWidth="lg"
      >
        {selectedNotification && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 font-medium">Channel & Service</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedNotification.channel}
                </div>
                <div className="text-slate-500 mt-1">Recipient: {selectedNotification.recipient}</div>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Delivery Status</span>
                <div className="mt-1">{getStatusBadge(selectedNotification.status)}</div>
                <div className="text-slate-500 mt-1">
                  Retries: {selectedNotification.retryCount}
                </div>
              </div>
            </div>

            {selectedNotification.subject && (
              <div>
                <span className="text-slate-400 font-medium">Subject</span>
                <div className="font-semibold text-slate-800 mt-0.5">
                  {selectedNotification.subject}
                </div>
              </div>
            )}

            <div>
              <span className="text-slate-400 font-medium">Message Body Content</span>
              <div className="p-3 bg-white border border-slate-200 rounded-lg mt-1 font-mono text-[11px] whitespace-pre-wrap max-h-60 overflow-y-auto">
                {selectedNotification.content}
              </div>
            </div>

            {selectedNotification.errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                <span className="font-bold">Error Message:</span> {selectedNotification.errorMessage}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => handleRetry(selectedNotification.id)}
                isLoading={retryingId === selectedNotification.id}
              >
                Resend Message
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
