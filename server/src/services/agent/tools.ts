import { z } from 'zod';
import prisma from '../../db/prisma';
import { appointmentService } from '../appointment.service';
import { reminderService } from '../reminder.service';
import { sesEmailService } from '../aws/ses.service';
import { socialMessagingService } from '../aws/social-messaging.service';
import { format } from 'date-fns';

export interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  bedrockSpec: {
    toolSpec: {
      name: string;
      description: string;
      inputSchema: {
        json: {
          type: 'object';
          properties: Record<string, any>;
          required: string[];
        };
      };
    };
  };
  execute: (input: any, context?: any) => Promise<any>;
}

export const agentTools: Record<string, ToolDefinition> = {
  getPatientAppointments: {
    name: 'getPatientAppointments',
    description: 'Retrieve upcoming and historical appointments for a verified patient.',
    schema: z.object({
      patientId: z.string().describe('The ID of the verified patient'),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'getPatientAppointments',
        description: 'Retrieve upcoming and historical appointments for a verified patient.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              patientId: {
                type: 'string',
                description: 'The unique UUID of the verified patient',
              },
            },
            required: ['patientId'],
          },
        },
      },
    },
    execute: async ({ patientId }: { patientId: string }) => {
      const appointments = await prisma.appointment.findMany({
        where: { patientId },
        orderBy: { dateTime: 'asc' },
        include: {
          doctor: { select: { id: true, name: true, specialty: true, roomNumber: true } },
        },
      });

      return {
        count: appointments.length,
        appointments: appointments.map(apt => ({
          id: apt.id,
          doctorName: apt.doctor.name,
          specialty: apt.specialty,
          room: apt.doctor.roomNumber,
          dateTime: apt.dateTime.toISOString(),
          dateTimeFormatted: format(new Date(apt.dateTime), 'EEEE, MMMM d, yyyy @ h:mm a'),
          status: apt.status,
          reason: apt.reason,
        })),
      };
    },
  },

  getAvailableSlots: {
    name: 'getAvailableSlots',
    description: 'Check actual doctor availability and return open appointment slots for a specific date and optional specialty.',
    schema: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Target date in YYYY-MM-DD format'),
      specialty: z.string().optional().describe('Medical specialty (e.g. Cardiology, Family Medicine, Pediatrics)'),
      doctorId: z.string().optional().describe('Optional specific doctor ID'),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'getAvailableSlots',
        description: 'Check actual doctor availability and return open appointment slots for a specific date and optional specialty.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Target date in YYYY-MM-DD format (e.g. 2026-11-05)',
              },
              specialty: {
                type: 'string',
                description: 'Medical specialty (e.g. General Practice, Cardiology, Dermatology)',
              },
              doctorId: {
                type: 'string',
                description: 'Optional specific doctor ID',
              },
            },
            required: ['date'],
          },
        },
      },
    },
    execute: async (input: { date: string; specialty?: string; doctorId?: string }) => {
      const slots = await appointmentService.getAvailableSlots({
        date: input.date,
        specialty: input.specialty,
        doctorId: input.doctorId,
      });

      return {
        date: input.date,
        specialty: input.specialty || 'All Specialties',
        availableSlotsCount: slots.length,
        slots: slots.slice(0, 10), // Limit to top 10 for conversational brevity
      };
    },
  },

  bookAppointment: {
    name: 'bookAppointment',
    description: 'Book a new appointment for a patient after selecting a verified available slot. Double booking is strictly prevented.',
    schema: z.object({
      patientId: z.string(),
      doctorId: z.string(),
      specialty: z.string().optional(),
      dateTime: z.string().describe('ISO-8601 string for slot start time'),
      reason: z.string().optional(),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'bookAppointment',
        description: 'Book a new appointment for a patient after selecting a verified available slot.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              patientId: { type: 'string', description: 'Patient UUID' },
              doctorId: { type: 'string', description: 'Doctor UUID' },
              specialty: { type: 'string', description: 'Medical specialty' },
              dateTime: { type: 'string', description: 'Selected appointment ISO 8601 datetime' },
              reason: { type: 'string', description: 'Non-sensitive visit reason (e.g. routine checkup)' },
            },
            required: ['patientId', 'doctorId', 'dateTime'],
          },
        },
      },
    },
    execute: async (input: {
      patientId: string;
      doctorId: string;
      specialty?: string;
      dateTime: string;
      reason?: string;
    }) => {
      try {
        const appointment = await appointmentService.createAppointment({
          patientId: input.patientId,
          doctorId: input.doctorId,
          specialty: input.specialty || '',
          dateTime: input.dateTime,
          reason: input.reason || 'General Visit',
          source: 'AI_AGENT',
        });

        return {
          success: true,
          appointmentId: appointment.id,
          doctorName: appointment.doctor.name,
          specialty: appointment.specialty,
          dateTime: appointment.dateTime.toISOString(),
          dateTimeFormatted: format(new Date(appointment.dateTime), 'EEEE, MMMM d, yyyy @ h:mm a'),
          status: appointment.status,
          message: 'Appointment successfully booked and confirmation notifications dispatched.',
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
        };
      }
    },
  },

  rescheduleAppointment: {
    name: 'rescheduleAppointment',
    description: 'Reschedule an existing appointment to a new available time slot.',
    schema: z.object({
      appointmentId: z.string(),
      newDateTime: z.string().describe('New ISO-8601 slot start time'),
      reason: z.string().optional(),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'rescheduleAppointment',
        description: 'Reschedule an existing appointment to a new available time slot.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              appointmentId: { type: 'string', description: 'ID of appointment to reschedule' },
              newDateTime: { type: 'string', description: 'New verified ISO datetime slot' },
              reason: { type: 'string', description: 'Patient reason for rescheduling' },
            },
            required: ['appointmentId', 'newDateTime'],
          },
        },
      },
    },
    execute: async (input: { appointmentId: string; newDateTime: string; reason?: string }) => {
      try {
        const updated = await appointmentService.rescheduleAppointment(
          {
            appointmentId: input.appointmentId,
            newDateTime: input.newDateTime,
            reason: input.reason,
          },
          'AI_AGENT'
        );

        return {
          success: true,
          appointmentId: updated.id,
          doctorName: updated.doctor.name,
          newDateTime: updated.dateTime.toISOString(),
          newDateTimeFormatted: format(new Date(updated.dateTime), 'EEEE, MMMM d, yyyy @ h:mm a'),
          status: updated.status,
          message: 'Appointment rescheduled successfully. Confirmation notifications sent via WhatsApp and Email.',
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
        };
      }
    },
  },

  cancelAppointment: {
    name: 'cancelAppointment',
    description: 'Cancel an existing appointment. Note: Require explicit confirmation from the patient before calling this tool!',
    schema: z.object({
      appointmentId: z.string(),
      reason: z.string().optional(),
      confirmed: z.boolean().describe('Must be true to confirm patient explicitly approved cancellation'),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'cancelAppointment',
        description: 'Cancel an existing appointment. Note: Only call when patient has confirmed cancellation.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              appointmentId: { type: 'string', description: 'ID of appointment to cancel' },
              reason: { type: 'string', description: 'Reason for cancellation' },
              confirmed: { type: 'boolean', description: 'Explicit patient confirmation' },
            },
            required: ['appointmentId', 'confirmed'],
          },
        },
      },
    },
    execute: async (input: { appointmentId: string; reason?: string; confirmed: boolean }) => {
      if (!input.confirmed) {
        return {
          success: false,
          error: 'Cancellation cannot proceed without explicit patient confirmation.',
        };
      }

      try {
        const cancelled = await appointmentService.cancelAppointment(
          input.appointmentId,
          input.reason,
          'AI_AGENT'
        );

        return {
          success: true,
          appointmentId: cancelled.id,
          doctorName: cancelled.doctor.name,
          status: 'CANCELLED',
          message: 'Appointment has been safely cancelled and cancellation email sent.',
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
        };
      }
    },
  },

  sendAppointmentConfirmation: {
    name: 'sendAppointmentConfirmation',
    description: 'Send or re-send appointment confirmation to the patient via their preferred channel and email.',
    schema: z.object({
      appointmentId: z.string(),
      channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']).optional(),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'sendAppointmentConfirmation',
        description: 'Send or re-send appointment confirmation to the patient via their preferred channel.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              appointmentId: { type: 'string', description: 'Appointment ID' },
              channel: { type: 'string', enum: ['WHATSAPP', 'SMS', 'EMAIL'] },
            },
            required: ['appointmentId'],
          },
        },
      },
    },
    execute: async ({ appointmentId }: { appointmentId: string }) => {
      const apt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true, doctor: true },
      });

      if (!apt) return { success: false, error: 'Appointment not found' };

      const formatted = format(new Date(apt.dateTime), 'EEEE, MMMM d, yyyy @ h:mm a');

      // WhatsApp
      let waStatus = 'SKIPPED';
      if (apt.patient.phoneNumber) {
        const wa = await socialMessagingService.sendAppointmentConfirmation(apt.patient.phoneNumber, {
          patientName: apt.patient.firstName,
          doctorName: apt.doctor.name,
          dateTimeFormatted: formatted,
          status: apt.status,
        });
        waStatus = wa.status;
      }

      // Email
      let emailStatus = 'SKIPPED';
      if (apt.patient.email) {
        const ses = await sesEmailService.sendAppointmentConfirmationEmail({
          patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
          patientEmail: apt.patient.email,
          doctorName: apt.doctor.name,
          specialty: apt.doctor.specialty,
          dateTimeFormatted: formatted,
          actionType: 'BOOKED',
        });
        emailStatus = ses.status;
      }

      return {
        success: true,
        appointmentId,
        whatsappStatus: waStatus,
        emailStatus: emailStatus,
        message: 'Confirmation dispatched across active communication channels.',
      };
    },
  },

  sendAppointmentReminder: {
    name: 'sendAppointmentReminder',
    description: 'Manually dispatch an appointment reminder notice to the patient across their preferred channel.',
    schema: z.object({
      appointmentId: z.string(),
    }),
    bedrockSpec: {
      toolSpec: {
        name: 'sendAppointmentReminder',
        description: 'Dispatch an appointment reminder notice to the patient.',
        inputSchema: {
          json: {
            type: 'object',
            properties: {
              appointmentId: { type: 'string', description: 'Appointment ID' },
            },
            required: ['appointmentId'],
          },
        },
      },
    },
    execute: async ({ appointmentId }: { appointmentId: string }) => {
      try {
        const res = await reminderService.sendReminderForAppointment(appointmentId, 'MANUAL');
        return res;
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  },
};
