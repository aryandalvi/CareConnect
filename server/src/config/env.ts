import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: process.env.AWS_SESSION_TOKEN || '',
    hasCredentials: Boolean(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ),
  },

  bedrock: {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  },

  socialMessaging: {
    phoneNumberId: process.env.AWS_WHATSAPP_PHONE_NUMBER_ID || '',
    wabaId: process.env.AWS_WHATSAPP_WABA_ID || '',
  },

  sms: {
    originationIdentity: process.env.AWS_SMS_ORIGINATION_IDENTITY || '',
  },

  ses: {
    fromEmail: process.env.AWS_SES_FROM_EMAIL || 'appointments@careconnect.health',
    configurationSet: process.env.AWS_SES_CONFIGURATION_SET || '',
  },

  auth: {
    dashboardApiKey: process.env.DASHBOARD_API_KEY || 'careconnect-demo-key-2025',
    webhookSecret: process.env.WEBHOOK_SECRET || 'careconnect-webhook-secret-token',
  },

  clinic: {
    name: process.env.CLINIC_NAME || 'CareConnect Community Health Clinic',
    phone: process.env.CLINIC_PHONE || '+1 (800) 555-0199',
    timezone: process.env.CLINIC_TIMEZONE || 'America/New_York',
  },
};
