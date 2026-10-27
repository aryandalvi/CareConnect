import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Settings as SettingsIcon,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Server,
  Key,
  Shield,
  HelpCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { AWSStatus } from '../types';

interface SettingsProps {
  awsStatus: AWSStatus | null;
  onRefresh: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ awsStatus, onRefresh }) => {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoadingLogs(true);
    api
      .getAuditLogs()
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setLoadingLogs(false));
  }, []);

  const handleCopyEnvExample = () => {
    const envText = `AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
AWS_WHATSAPP_PHONE_NUMBER_ID=phone_number_id
AWS_WHATSAPP_WABA_ID=waba_id
AWS_SMS_ORIGINATION_IDENTITY=+18005550199
AWS_SES_FROM_EMAIL=appointments@careconnect.health`;

    navigator.clipboard.writeText(envText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards for each AWS Service */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amazon Bedrock */}
        <Card>
          <CardHeader
            title="Amazon Bedrock / AgentCore"
            subtitle="Generative AI conversational reasoning & tool orchestration"
            action={
              awsStatus?.bedrock.status === 'ACTIVE' ? (
                <Badge variant="success">Active (Live AWS)</Badge>
              ) : (
                <Badge variant="neutral">Dev Simulation Mode</Badge>
              )
            }
          />
          <CardBody className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Model ID:</span>
              <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                {awsStatus?.bedrock.modelId || 'anthropic.claude-3-5-sonnet-20241022-v2:0'}
              </code>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Tool Integration:</span>
              <span className="font-medium text-emerald-700">7 Validated Tools Active</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
              {awsStatus?.bedrock.message}
            </p>
          </CardBody>
        </Card>

        {/* AWS End User Messaging Social (WhatsApp) */}
        <Card>
          <CardHeader
            title="AWS End User Messaging Social (WhatsApp)"
            subtitle="Two-way messaging with WhatsApp Business Platform"
            action={
              awsStatus?.socialMessaging.status === 'ACTIVE' ? (
                <Badge variant="success">Active (Live AWS)</Badge>
              ) : (
                <Badge variant="neutral">Dev Simulation Mode</Badge>
              )
            }
          />
          <CardBody className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Phone Number ID:</span>
              <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                {awsStatus?.socialMessaging.phoneNumberId || 'Not configured'}
              </code>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>WABA ID:</span>
              <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                {awsStatus?.socialMessaging.wabaId || 'Not configured'}
              </code>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
              {awsStatus?.socialMessaging.message}
            </p>
          </CardBody>
        </Card>

        {/* AWS End User Messaging SMS */}
        <Card>
          <CardHeader
            title="AWS End User Messaging SMS"
            subtitle="Transactional SMS notifications & conversational texting"
            action={
              awsStatus?.sms.status === 'ACTIVE' ? (
                <Badge variant="success">Active (Live AWS)</Badge>
              ) : (
                <Badge variant="neutral">Dev Simulation Mode</Badge>
              )
            }
          />
          <CardBody className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Origination Identity:</span>
              <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                {awsStatus?.sms.originationIdentity || 'Not configured'}
              </code>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Region:</span>
              <span className="font-medium text-slate-700">{awsStatus?.region || 'us-east-1'}</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
              {awsStatus?.sms.message}
            </p>
          </CardBody>
        </Card>

        {/* Amazon SES Email */}
        <Card>
          <CardHeader
            title="Amazon Simple Email Service (SES)"
            subtitle="Transactional appointment confirmations and preparation guides"
            action={
              awsStatus?.ses.status === 'ACTIVE' ? (
                <Badge variant="success">Active (Live AWS)</Badge>
              ) : (
                <Badge variant="neutral">Dev Simulation Mode</Badge>
              )
            }
          />
          <CardBody className="space-y-3 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>Sender Identity (From Email):</span>
              <code className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                {awsStatus?.ses.fromEmail || 'appointments@careconnect.health'}
              </code>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Email Templates:</span>
              <span className="font-medium text-emerald-700">Responsive HTML Clinical Template</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
              {awsStatus?.ses.message}
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Guide: How to connect Live AWS Credentials */}
      <Card>
        <CardHeader
          title="AWS Configuration & Deployment Guide"
          subtitle="Instructions for setting up production AWS Communication Developer Services credentials"
          action={
            <Button variant="outline" size="sm" onClick={handleCopyEnvExample}>
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied to Clipboard!' : 'Copy .env snippet'}</span>
            </Button>
          }
        />
        <CardBody className="space-y-4 text-xs text-slate-600 leading-relaxed">
          <p>
            CareConnect AI is built directly using the AWS SDK for JavaScript v3 (
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">
              @aws-sdk/client-bedrock-runtime
            </code>
            ,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">
              @aws-sdk/client-socialmessaging
            </code>
            ,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">
              @aws-sdk/client-pinpoint-sms-voice-v2
            </code>
            ,{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">
              @aws-sdk/client-ses
            </code>
            ).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">1. Amazon Bedrock</strong>
              <p className="text-[11px] text-slate-500">
                Ensure your AWS IAM user or role has the{' '}
                <code className="font-mono">bedrock:InvokeModel</code> permission and model access is
                enabled for Claude 3.5 Sonnet in the Bedrock console.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">2. Social Messaging (WhatsApp)</strong>
              <p className="text-[11px] text-slate-500">
                Link your Meta WhatsApp Business Account (WABA) in AWS End User Messaging Social and
                provide the resulting phone number ID in <code className="font-mono">.env</code>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong className="block text-slate-800 mb-1">3. Amazon SES</strong>
              <p className="text-[11px] text-slate-500">
                Verify your sender identity (email domain or address) in the Amazon SES console and
                configure <code className="font-mono">AWS_SES_FROM_EMAIL</code>.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* System Audit Logs */}
      <Card>
        <CardHeader
          title={`Clinical System Audit Trail (${auditLogs.length})`}
          subtitle="Immutable record of security events, appointment modifications, and AI operations"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-medium">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Entity Type</th>
                <th className="px-5 py-3">Performed By</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingLogs ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{log.action}</td>
                    <td className="px-5 py-3 text-slate-600">{log.entityType}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">
                        {log.performedBy}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-xs truncate text-slate-500 font-mono text-[11px]">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
