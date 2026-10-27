import { format } from 'date-fns';
import prisma from '../db/prisma';
import { socialMessagingService } from './aws/social-messaging.service';
import { smsService } from './aws/sms.service';
import { sesEmailService } from './aws/ses.service';
import { config } from '../config/env';

export class ReminderService {
  async processDueReminders() {
    const now = new Date();
    // Fetch pending reminders scheduled for now or in the past
    const dueReminders = await prisma.reminder.findMany({
      where: {
        status: 'PENDING' as any,
        scheduledFor: { lte: now },
      },
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
          },
        },
      },
      take: 20,
    });

    const results = [];

    for (const reminder of dueReminders) {
      const apt = reminder.appointment;
      // Skip if appointment is cancelled or completed
      if (apt.status === 'CANCELLED' || apt.status === 'COMPLETED') {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'CANCELLED' as any },
        });
        continue;
      }

      // Check consent
      if (apt.patient.consentStatus === 'REVOKED') {
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: { status: 'CANCELLED' as any, error: 'Patient revoked communication consent' },
        });
        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderStatus: 'SKIPPED' as any },
        });
        continue;
      }

      const res = await this.sendReminderForAppointment(apt.id, 'AUTOMATED');
      results.push(res);
    }

    return results;
  }

  async sendReminderForAppointment(appointmentId: string, triggerSource: 'MANUAL' | 'AUTOMATED' = 'MANUAL') {
    const apt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!apt) throw new Error('Appointment not found');

    const formattedTime = format(new Date(apt.dateTime), 'EEEE, MMMM d, yyyy @ h:mm a');
    const channel = apt.patient.preferredChannel || 'WHATSAPP';

    let success = false;
    let messageId = '';
    let errorMessage = '';

    if (channel === 'WHATSAPP' && apt.patient.phoneNumber) {
      const waResult = await socialMessagingService.sendAppointmentReminderTemplate(
        apt.patient.phoneNumber,
        {
          patientName: apt.patient.firstName,
          doctorName: apt.doctor.name,
          specialty: apt.specialty,
          dateTimeFormatted: formattedTime,
          clinicName: config.clinic.name,
        }
      );
      success = waResult.success;
      messageId = waResult.messageId;
      errorMessage = waResult.error || '';
    } else if (channel === 'SMS' && apt.patient.phoneNumber) {
      const msg = `CareConnect Reminder: You have an appointment with Dr. ${apt.doctor.name} on ${formattedTime}. Reply to this text to confirm or reschedule.`;
      const smsResult = await smsService.sendSMS(apt.patient.phoneNumber, msg);
      success = smsResult.success;
      messageId = smsResult.messageId;
      errorMessage = smsResult.error || '';
    } else if (apt.patient.email) {
      const emailResult = await sesEmailService.sendAppointmentConfirmationEmail({
        patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
        patientEmail: apt.patient.email,
        doctorName: apt.doctor.name,
        specialty: apt.doctor.specialty,
        roomNumber: apt.doctor.roomNumber || undefined,
        dateTimeFormatted: formattedTime,
        actionType: 'BOOKED',
      });
      success = emailResult.success;
      messageId = emailResult.messageId;
      errorMessage = emailResult.error || '';
    }

    const newReminderStatus = success ? 'DELIVERED' : 'FAILED';

    // Update appointment reminder status
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminderStatus: newReminderStatus as any },
    });

    // Update or create reminder record
    await prisma.reminder.upsert({
      where: { id: (await prisma.reminder.findFirst({ where: { appointmentId } }))?.id || 'none' },
      update: {
        status: newReminderStatus as any,
        sentAt: new Date(),
        error: errorMessage || null,
      },
      create: {
        appointmentId,
        scheduledFor: new Date(),
        channel: channel as any,
        status: newReminderStatus as any,
        sentAt: new Date(),
        error: errorMessage || null,
      },
    });

    // Log notification
    await prisma.notification.create({
      data: {
        patientId: apt.patient.id,
        appointmentId: apt.id,
        channel: channel as any,
        type: 'REMINDER',
        status: success ? 'DELIVERED' : 'FAILED',
        recipient: apt.patient.phoneNumber || apt.patient.email,
        content: `Appointment reminder for Dr. ${apt.doctor.name} at ${formattedTime}`,
        externalMessageId: messageId,
        errorMessage: errorMessage || null,
        sentAt: new Date(),
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'REMINDER_SENT',
        entityType: 'APPOINTMENT',
        entityId: apt.id,
        performedBy: triggerSource,
        details: JSON.stringify({
          channel,
          success,
          recipient: apt.patient.phoneNumber || apt.patient.email,
        }),
      },
    });

    return {
      success,
      appointmentId: apt.id,
      patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
      channel,
      messageId,
      status: newReminderStatus,
      errorMessage,
    };
  }
}

export const reminderService = new ReminderService();
