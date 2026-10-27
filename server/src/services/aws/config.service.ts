import { config } from '../../config/env';

export interface AWSIntegrationStatus {
  isConfigured: boolean;
  region: string;
  hasCredentials: boolean;
  bedrock: {
    configured: boolean;
    modelId: string;
    status: 'ACTIVE' | 'DEV_MODE';
    message: string;
  };
  socialMessaging: {
    configured: boolean;
    phoneNumberId: string;
    wabaId: string;
    status: 'ACTIVE' | 'DEV_MODE';
    message: string;
  };
  sms: {
    configured: boolean;
    originationIdentity: string;
    status: 'ACTIVE' | 'DEV_MODE';
    message: string;
  };
  ses: {
    configured: boolean;
    fromEmail: string;
    status: 'ACTIVE' | 'DEV_MODE';
    message: string;
  };
}

export function getAWSStatus(): AWSIntegrationStatus {
  const hasCreds = config.aws.hasCredentials;

  const bedrockConfigured = hasCreds && Boolean(config.bedrock.modelId);
  const socialConfigured = hasCreds && Boolean(config.socialMessaging.phoneNumberId);
  const smsConfigured = hasCreds && Boolean(config.sms.originationIdentity);
  const sesConfigured = hasCreds && Boolean(config.ses.fromEmail);

  return {
    isConfigured: hasCreds,
    region: config.aws.region,
    hasCredentials: hasCreds,
    bedrock: {
      configured: bedrockConfigured,
      modelId: config.bedrock.modelId,
      status: bedrockConfigured ? 'ACTIVE' : 'DEV_MODE',
      message: bedrockConfigured
        ? `Connected to Amazon Bedrock (${config.bedrock.modelId}) in ${config.aws.region}`
        : 'Running in Development Simulation Mode. Configure AWS_ACCESS_KEY_ID to use live Bedrock.',
    },
    socialMessaging: {
      configured: socialConfigured,
      phoneNumberId: config.socialMessaging.phoneNumberId || 'Not specified',
      wabaId: config.socialMessaging.wabaId || 'Not specified',
      status: socialConfigured ? 'ACTIVE' : 'DEV_MODE',
      message: socialConfigured
        ? `AWS End User Messaging Social active (Phone ID: ${config.socialMessaging.phoneNumberId})`
        : 'Development Mode: WhatsApp messaging calls will be captured and displayed in the sandbox.',
    },
    sms: {
      configured: smsConfigured,
      originationIdentity: config.sms.originationIdentity || 'Not specified',
      status: smsConfigured ? 'ACTIVE' : 'DEV_MODE',
      message: smsConfigured
        ? `AWS End User Messaging SMS active with origination: ${config.sms.originationIdentity}`
        : 'Development Mode: SMS sending will log payloads and update audit records without incurring carrier costs.',
    },
    ses: {
      configured: sesConfigured,
      fromEmail: config.ses.fromEmail,
      status: sesConfigured ? 'ACTIVE' : 'DEV_MODE',
      message: sesConfigured
        ? `Amazon SES configured with sender: ${config.ses.fromEmail}`
        : 'Development Mode: Emails will be generated, rendered and logged in the Notifications tab.',
    },
  };
}
