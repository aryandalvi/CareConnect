import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import { config } from '../../config/env';

export interface SendEmailResult {
  success: boolean;
  messageId: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'SENT_DEV_MODE';
  isDevMode: boolean;
  channel: 'EMAIL';
  subject: string;
  error?: string;
  recipient: string;
  htmlContent: string;
}

export class SESEmailService {
  private client: SESClient | null = null;

  constructor() {
    if (config.aws.hasCredentials) {
      this.client = new SESClient({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
          ...(config.aws.sessionToken ? { sessionToken: config.aws.sessionToken } : {}),
        },
      });
    }
  }

  async sendEmail(
    recipientEmail: string,
    subject: string,
    htmlBody: string,
    textBody?: string
  ): Promise<SendEmailResult> {
    const isLive = Boolean(this.client && config.ses.fromEmail);

    if (!isLive) {
      console.log(`[Amazon SES - DEV MODE] Email to ${recipientEmail} with subject: "${subject}"`);
      return {
        success: true,
        messageId: `dev-ses-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'SENT_DEV_MODE',
        isDevMode: true,
        channel: 'EMAIL',
        subject,
        recipient: recipientEmail,
        htmlContent: htmlBody,
      };
    }

    try {
      const input: SendEmailCommandInput = {
        Source: config.ses.fromEmail,
        Destination: {
          ToAddresses: [recipientEmail],
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: htmlBody,
              Charset: 'UTF-8',
            },
            Text: {
              Data: textBody || htmlBody.replace(/<[^>]*>/g, ''),
              Charset: 'UTF-8',
            },
          },
        },
        ...(config.ses.configurationSet
          ? { ConfigurationSetName: config.ses.configurationSet }
          : {}),
      };

      const command = new SendEmailCommand(input);
      const response = await this.client!.send(command);

      return {
        success: true,
        messageId: response.MessageId || `ses-${Date.now()}`,
        status: 'SENT',
        isDevMode: false,
        channel: 'EMAIL',
        subject,
        recipient: recipientEmail,
        htmlContent: htmlBody,
      };
    } catch (err: any) {
      console.error('[Amazon SES Error]:', err.message);
      return {
        success: false,
        messageId: '',
        status: 'FAILED',
        isDevMode: false,
        channel: 'EMAIL',
        subject,
        error: err.message || 'Failed to send email via Amazon SES',
        recipient: recipientEmail,
        htmlContent: htmlBody,
      };
    }
  }

  // Pre-formatted transactional healthcare emails
  async sendAppointmentConfirmationEmail(params: {
    patientName: string;
    patientEmail: string;
    doctorName: string;
    specialty: string;
    roomNumber?: string;
    dateTimeFormatted: string;
    actionType: 'BOOKED' | 'RESCHEDULED';
    preparationNotes?: string;
  }): Promise<SendEmailResult> {
    const title = params.actionType === 'RESCHEDULED' 
      ? 'Your Appointment Has Been Rescheduled' 
      : 'Appointment Confirmation';
    
    const subject = `[CareConnect] ${title} - Dr. ${params.doctorName} (${params.dateTimeFormatted})`;

    const prepInstructions = params.preparationNotes || 
      'Please arrive 10-15 minutes prior to your appointment. Bring a valid government photo ID, your insurance card, and a list of current medications.';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0284c7; color: white; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px; }
    .badge { display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; text-align: right; }
    .prep-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .prep-box h3 { margin: 0 0 6px; font-size: 14px; color: #065f46; }
    .prep-box p { margin: 0; font-size: 13px; color: #047857; line-height: 1.5; }
    .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CareConnect Health</h1>
      <p>Automated Clinical Messaging Powered by AWS CDS & Bedrock</p>
    </div>
    <div class="content">
      <div class="badge">${params.actionType === 'RESCHEDULED' ? 'Appointment Rescheduled' : 'Confirmed'}</div>
      <h2>Hello ${params.patientName},</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">
        ${params.actionType === 'RESCHEDULED' 
          ? 'Your appointment has been successfully updated with the clinic.' 
          : 'Your clinic appointment is confirmed. Here are the details for your upcoming visit:'}
      </p>

      <div class="info-grid">
        <div class="info-row">
          <span class="label">Practitioner</span>
          <span class="value">Dr. ${params.doctorName}</span>
        </div>
        <div class="info-row">
          <span class="label">Specialty</span>
          <span class="value">${params.specialty}</span>
        </div>
        <div class="info-row">
          <span class="label">Date & Time</span>
          <span class="value">${params.dateTimeFormatted}</span>
        </div>
        ${params.roomNumber ? `
        <div class="info-row">
          <span class="label">Clinic Room</span>
          <span class="value">Suite ${params.roomNumber}</span>
        </div>` : ''}
      </div>

      <div class="prep-box">
        <h3>📋 Appointment Preparation Instructions</h3>
        <p>${prepInstructions}</p>
      </div>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
        Need to make changes? You can reply directly to our WhatsApp or SMS messages at any time. Our AI assistant will check doctor availability and assist you immediately.
      </p>
    </div>
    <div class="footer">
      <p>CareConnect AI Demonstration &bull; Fictional Healthcare Agent &bull; Not for Medical Emergencies</p>
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail(params.patientEmail, subject, htmlBody);
  }

  async sendCancellationEmail(params: {
    patientName: string;
    patientEmail: string;
    doctorName: string;
    dateTimeFormatted: string;
  }): Promise<SendEmailResult> {
    const subject = `[CareConnect] Appointment Cancellation Notice`;
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #ef4444; color: white; padding: 20px 32px; }
    .content { padding: 32px; }
    .footer { padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 style="margin: 0; font-size: 18px;">Appointment Cancelled</h2>
    </div>
    <div class="content">
      <p>Hello ${params.patientName},</p>
      <p>Your appointment with Dr. ${params.doctorName} on <strong>${params.dateTimeFormatted}</strong> has been cancelled as requested.</p>
      <p>When you're ready to rebook, you can contact us through WhatsApp, SMS, or our online patient portal.</p>
    </div>
    <div class="footer">
      CareConnect AI Healthcare Agent
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail(params.patientEmail, subject, htmlBody);
  }
}

export const sesEmailService = new SESEmailService();
