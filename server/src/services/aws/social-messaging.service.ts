import {
  SocialMessagingClient,
  SendWhatsAppMessageCommand,
  SendWhatsAppMessageCommandInput,
} from '@aws-sdk/client-socialmessaging';
import { config } from '../../config/env';

export interface SendWhatsAppResult {
  success: boolean;
  messageId: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'SENT_DEV_MODE';
  isDevMode: boolean;
  channel: 'WHATSAPP';
  error?: string;
  recipient: string;
}

export class SocialMessagingService {
  private client: SocialMessagingClient | null = null;

  constructor() {
    if (config.aws.hasCredentials) {
      this.client = new SocialMessagingClient({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
          ...(config.aws.sessionToken ? { sessionToken: config.aws.sessionToken } : {}),
        },
      });
    }
  }

  async sendTextMessage(recipientPhone: string, text: string): Promise<SendWhatsAppResult> {
    const isLive = Boolean(this.client && config.socialMessaging.phoneNumberId);

    if (!isLive) {
      console.log(`[AWS SocialMessaging - DEV MODE] Sending WhatsApp to ${recipientPhone}: "${text}"`);
      return {
        success: true,
        messageId: `dev-wam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'SENT_DEV_MODE',
        isDevMode: true,
        channel: 'WHATSAPP',
        recipient: recipientPhone,
      };
    }

    try {
      // Structure WhatsApp message payload for AWS End User Messaging Social
      const messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientPhone.replace(/\D/g, ''),
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      };

      const input: SendWhatsAppMessageCommandInput = {
        originationPhoneNumberId: config.socialMessaging.phoneNumberId,
        message: new TextEncoder().encode(JSON.stringify(messagePayload)),
        metaApiVersion: 'v20.0',
      };

      const command = new SendWhatsAppMessageCommand(input);
      const response = await this.client!.send(command);

      return {
        success: true,
        messageId: response.messageId || `wam-${Date.now()}`,
        status: 'SENT',
        isDevMode: false,
        channel: 'WHATSAPP',
        recipient: recipientPhone,
      };
    } catch (err: any) {
      console.error('[AWS SocialMessaging Error]:', err.message);
      return {
        success: false,
        messageId: '',
        status: 'FAILED',
        isDevMode: false,
        channel: 'WHATSAPP',
        error: err.message || 'Failed to send WhatsApp message via AWS Social Messaging',
        recipient: recipientPhone,
      };
    }
  }

  async sendAppointmentReminderTemplate(
    recipientPhone: string,
    params: {
      patientName: string;
      doctorName: string;
      specialty: string;
      dateTimeFormatted: string;
      clinicName: string;
    }
  ): Promise<SendWhatsAppResult> {
    const message = 
      `Hello ${params.patientName}, this is a reminder from ${params.clinicName}.\n\n` +
      `📅 Appointment with: Dr. ${params.doctorName} (${params.specialty})\n` +
      `⏰ When: ${params.dateTimeFormatted}\n\n` +
      `Reply to this message anytime if you need to confirm, reschedule, or have questions. Our AI assistant is here to help!`;

    return this.sendTextMessage(recipientPhone, message);
  }

  async sendAppointmentConfirmation(
    recipientPhone: string,
    params: {
      patientName: string;
      doctorName: string;
      dateTimeFormatted: string;
      status: string;
    }
  ): Promise<SendWhatsAppResult> {
    const message =
      `✅ Appointment ${params.status}!\n\n` +
      `Hi ${params.patientName}, your appointment with Dr. ${params.doctorName} on ${params.dateTimeFormatted} is confirmed.\n\n` +
      `If your plans change, simply text us back here to reschedule.`;

    return this.sendTextMessage(recipientPhone, message);
  }
}

export const socialMessagingService = new SocialMessagingService();
