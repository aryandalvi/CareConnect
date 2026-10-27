export type Channel = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'WEB_SIMULATOR';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'CANCELLED'
  | 'COMPLETED';

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED' | 'SKIPPED';

export type ConsentStatus = 'CONSENTED' | 'REVOKED' | 'PENDING';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  preferredChannel: Channel;
  consentStatus: ConsentStatus;
  createdAt: string;
  appointments?: Appointment[];
  consents?: CommunicationConsent[];
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone?: string;
  roomNumber?: string;
  bio?: string;
  active: boolean;
  availabilities?: DoctorAvailability[];
  _count?: { appointments: number };
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  active: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  specialty: string;
  dateTime: string;
  endTime: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  reminderStatus: ReminderStatus;
  patient: Patient;
  doctor: Doctor;
  notifications?: Notification[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  patientId: string;
  patient: Patient;
  channel: Channel;
  status: string;
  lastMessageAt: string;
  messages: Message[];
}

export interface ToolCallPayload {
  toolName: string;
  input: any;
  output: any;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'PATIENT' | 'AGENT' | 'SYSTEM';
  content: string;
  channel: Channel;
  status: string;
  metadata?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  patientId: string;
  appointmentId?: string;
  channel: Channel;
  type: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  recipient: string;
  subject?: string;
  content: string;
  externalMessageId?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: string;
  createdAt: string;
  patient?: { firstName: string; lastName: string; email: string; phoneNumber: string };
  appointment?: { doctor: { name: string; specialty: string } };
}

export interface CommunicationConsent {
  id: string;
  patientId: string;
  channel: Channel;
  consented: boolean;
  consentDate: string;
  source: string;
}

export interface AWSStatus {
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

export interface AvailableSlot {
  doctorId: string;
  doctorName: string;
  specialty: string;
  startTime: string;
  endTime: string;
  timeFormatted: string;
}
