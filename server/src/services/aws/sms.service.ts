import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
  SendTextMessageCommandInput,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { config } from '../../config/env';

export interface SendSMSResult {
  success: boolean;
  messageId: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'SENT_DEV_MODE';
  isDevMode: boolean;
  channel: 'SMS';
  error?: string;
  recipient: string;
}

export class SMSService {
  private client: PinpointSMSVoiceV2Client | null = null;

  constructor() {
    if (config.aws.hasCredentials) {
      this.client = new PinpointSMSVoiceV2Client({
        region: config.aws.region,
        credentials: {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
          ...(config.aws.sessionToken ? { sessionToken: config.aws.sessionToken } : {}),
        },
      });
    }
  }

  async sendSMS(recipientPhone: string, text: string): Promise<SendSMSResult> {
    const isLive = Boolean(this.client && config.sms.originationIdentity);

    if (!isLive) {
      console.log(`[AWS End User Messaging SMS - DEV MODE] Sending SMS to ${recipientPhone}: "${text}"`);
      return {
        success: true,
        messageId: `dev-sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        status: 'SENT_DEV_MODE',
        isDevMode: true,
        channel: 'SMS',
        recipient: recipientPhone,
      };
    }

    try {
      const input: SendTextMessageCommandInput = {
        DestinationPhoneNumber: recipientPhone,
        OriginationIdentity: config.sms.originationIdentity,
        MessageBody: text,
        MessageType: 'TRANSACTIONAL',
      };

      const command = new SendTextMessageCommand(input);
      const response = await this.client!.send(command);

      return {
        success: true,
        messageId: response.MessageId || `sms-${Date.now()}`,
        status: 'SENT',
        isDevMode: false,
        channel: 'SMS',
        recipient: recipientPhone,
      };
    } catch (err: any) {
      console.error('[AWS SMS Error]:', err.message);
      return {
        success: false,
        messageId: '',
        status: 'FAILED',
        isDevMode: false,
        channel: 'SMS',
        error: err.message || 'Failed to send SMS via AWS End User Messaging SMS',
        recipient: recipientPhone,
      };
    }
  }
}

export const smsService = new SMSService();
