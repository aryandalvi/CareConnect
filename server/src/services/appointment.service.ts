import { addMinutes, format, parseISO, startOfDay, endOfDay, isBefore } from 'date-fns';
import prisma from '../db/prisma';
import { sesEmailService } from './aws/ses.service';
import { socialMessagingService } from './aws/social-messaging.service';
import { smsService } from './aws/sms.service';

export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  specialty: string;
  dateTime: string; // ISO string
  reason?: string;
  notes?: string;
  source?: string;
}

export interface RescheduleAppointmentDTO {
  appointmentId: string;
  newDateTime: string; // ISO string
  reason?: string;
}

export interface AvailableSlotsQuery {
  doctorId?: string;
  specialty?: string;
  date: string; // YYYY-MM-DD
}

export class AppointmentService {
  async getAllAppointments(filter?: {
    status?: string;
    doctorId?: string;
    patientId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const where: any = {};

    if (filter?.status && filter.status !== 'ALL') {
      where.status = filter.status;
    }
    if (filter?.doctorId && filter.doctorId !== 'ALL') {
      where.doctorId = filter.doctorId;
    }
    if (filter?.patientId) {
      where.patientId = filter.patientId;
    }
    if (filter?.startDate || filter?.endDate) {
      where.dateTime = {};
      if (filter.startDate) where.dateTime.gte = new Date(filter.startDate);
      if (filter.endDate) where.dateTime.lte = new Date(filter.endDate);
    }
    if (filter?.search) {
      const s = filter.search.toLowerCase();
      where.OR = [
        { patient: { firstName: { contains: s } } },
        { patient: { lastName: { contains: s } } },
        { patient: { phoneNumber: { contains: s } } },
        { doctor: { name: { contains: s } } },
        { specialty: { contains: s } },
      ];
    }

    return prisma.appointment.findMany({
      where,
      orderBy: { dateTime: 'desc' },
      include: {
        patient: true,
        doctor: true,
        notifications: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getAppointmentById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: {
          include: { availabilities: true },
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
        },
        reminders: true,
      },
    });
  }

  async getAvailableSlots(query: AvailableSlotsQuery) {
    const targetDate = parseISO(query.date);
    const dayOfWeek = targetDate.getDay(); // 0-6

    // Find doctors matching specialty or doctorId
    const doctorWhere: any = { active: true };
    if (query.doctorId) {
      doctorWhere.id = query.doctorId;
    } else if (query.specialty) {
      doctorWhere.specialty = { contains: query.specialty };
    }

    const doctors = await prisma.doctor.findMany({
      where: doctorWhere,
      include: {
        availabilities: {
          where: { dayOfWeek, active: true },
        },
      },
    });

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const availableSlots: Array<{
      doctorId: string;
      doctorName: string;
      specialty: string;
      startTime: string; // ISO string
      endTime: string;   // ISO string
      timeFormatted: string; // e.g. "09:30 AM"
    }> = [];

    for (const doc of doctors) {
      const availability = doc.availabilities[0];
      if (!availability) continue;

      // Existing booked appointments for this doctor on this day
      const booked = await prisma.appointment.findMany({
        where: {
          doctorId: doc.id,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] as any },
          dateTime: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const bookedRanges = booked.map(b => ({
        start: new Date(b.dateTime).getTime(),
        end: new Date(b.endTime).getTime(),
      }));

      // Generate slots from startTime to endTime
      const [startHour, startMin] = availability.startTime.split(':').map(Number);
      const [endHour, endMin] = availability.endTime.split(':').map(Number);

      const slotDuration = availability.slotDurationMinutes || 30;

      let currentSlot = new Date(targetDate);
      currentSlot.setHours(startHour, startMin, 0, 0);

      const doctorDayEnd = new Date(targetDate);
      doctorDayEnd.setHours(endHour, endMin, 0, 0);

      const now = new Date();

      while (currentSlot < doctorDayEnd) {
        const slotEnd = addMinutes(currentSlot, slotDuration);

        // Check if slot is in the past
        if (isBefore(currentSlot, now)) {
          currentSlot = slotEnd;
          continue;
        }

        // Check collision with booked appointments
        const slotStartMs = currentSlot.getTime();
        const slotEndMs = slotEnd.getTime();

        const isColliding = bookedRanges.some(
          b => (slotStartMs >= b.start && slotStartMs < b.end) || (slotEndMs > b.start && slotEndMs <= b.end)
        );

        if (!isColliding) {
          availableSlots.push({
            doctorId: doc.id,
            doctorName: doc.name,
            specialty: doc.specialty,
            startTime: currentSlot.toISOString(),
            endTime: slotEnd.toISOString(),
            timeFormatted: format(currentSlot, 'hh:mm a'),
          });
        }

        currentSlot = slotEnd;
      }
    }

    return availableSlots;
  }

  async createAppointment(dto: CreateAppointmentDTO) {
    const slotStart = new Date(dto.dateTime);
    if (isNaN(slotStart.getTime())) {
      throw new Error('Invalid appointment date format');
    }
    if (isBefore(slotStart, new Date())) {
      throw new Error('Cannot schedule an appointment in the past');
    }

    const slotEnd = addMinutes(slotStart, 30);

    // Double-booking check
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId: dto.doctorId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] as any },
        OR: [
          { dateTime: { equals: slotStart } },
          {
            AND: [
              { dateTime: { lte: slotStart } },
              { endTime: { gt: slotStart } },
            ],
          },
        ],
      },
    });

    if (existing) {
      throw new Error('Double-booking prevented: Doctor already has an active appointment at this time.');
    }

    // Verify patient and doctor exist
    const patient = await prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new Error('Patient not found');

    const doctor = await prisma.doctor.findUnique({ where: { id: dto.doctorId } });
    if (!doctor) throw new Error('Doctor not found');

    const appointment = await prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        specialty: dto.specialty || doctor.specialty,
        dateTime: slotStart,
        endTime: slotEnd,
        status: 'CONFIRMED',
        reason: dto.reason || 'General Consultation',
        notes: dto.notes,
        reminderStatus: 'PENDING',
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    // Schedule automated reminder (24 hours prior)
    const reminderTime = new Date(slotStart.getTime() - 24 * 60 * 60 * 1000);
    await prisma.reminder.create({
      data: {
        appointmentId: appointment.id,
        scheduledFor: reminderTime > new Date() ? reminderTime : new Date(),
        channel: (patient.preferredChannel as any) || 'WHATSAPP',
        status: 'PENDING',
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: 'APPOINTMENT_CREATED',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        performedBy: dto.source || 'USER',
        details: JSON.stringify({
          patient: `${patient.firstName} ${patient.lastName}`,
          doctor: doctor.name,
          time: slotStart.toISOString(),
        }),
      },
    });

    // Send notifications via Amazon SES & AWS Messaging
    const dateTimeFormatted = format(slotStart, 'EEEE, MMMM d, yyyy @ h:mm a');

    // Amazon SES Email
    if (patient.email) {
      try {
        const sesResult = await sesEmailService.sendAppointmentConfirmationEmail({
          patientName: `${patient.firstName} ${patient.lastName}`,
          patientEmail: patient.email,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          roomNumber: doctor.roomNumber || undefined,
          dateTimeFormatted,
          actionType: 'BOOKED',
        });

        await prisma.notification.create({
          data: {
            patientId: patient.id,
            appointmentId: appointment.id,
            channel: 'EMAIL',
            type: 'CONFIRMATION',
            status: sesResult.success ? 'DELIVERED' : 'FAILED',
            recipient: patient.email,
            subject: `[CareConnect] Appointment Confirmation - Dr. ${doctor.name}`,
            content: `Appointment confirmed for ${dateTimeFormatted}`,
            externalMessageId: sesResult.messageId,
            errorMessage: sesResult.error,
            sentAt: new Date(),
          },
        });
      } catch (e: any) {
        console.error('SES Notification error:', e.message);
      }
    }

    // AWS End User Messaging (WhatsApp or SMS)
    if (patient.phoneNumber) {
      try {
        if (patient.preferredChannel === 'WHATSAPP') {
          const waResult = await socialMessagingService.sendAppointmentConfirmation(
            patient.phoneNumber,
            {
              patientName: patient.firstName,
              doctorName: doctor.name,
              dateTimeFormatted,
              status: 'Confirmed',
            }
          );

          await prisma.notification.create({
            data: {
              patientId: patient.id,
              appointmentId: appointment.id,
              channel: 'WHATSAPP',
              type: 'CONFIRMATION',
              status: waResult.success ? 'DELIVERED' : 'FAILED',
              recipient: patient.phoneNumber,
              content: `Appointment confirmed with Dr. ${doctor.name} for ${dateTimeFormatted}`,
              externalMessageId: waResult.messageId,
              errorMessage: waResult.error,
              sentAt: new Date(),
            },
          });
        } else if (patient.preferredChannel === 'SMS') {
          const smsResult = await smsService.sendSMS(
            patient.phoneNumber,
            `CareConnect: Your appointment with Dr. ${doctor.name} on ${dateTimeFormatted} is confirmed.`
          );

          await prisma.notification.create({
            data: {
              patientId: patient.id,
              appointmentId: appointment.id,
              channel: 'SMS',
              type: 'CONFIRMATION',
              status: smsResult.success ? 'DELIVERED' : 'FAILED',
              recipient: patient.phoneNumber,
              content: `CareConnect appointment confirmed on ${dateTimeFormatted}`,
              externalMessageId: smsResult.messageId,
              errorMessage: smsResult.error,
              sentAt: new Date(),
            },
          });
        }
      } catch (e: any) {
        console.error('Messaging Notification error:', e.message);
      }
    }

    return appointment;
  }

  async rescheduleAppointment(dto: RescheduleAppointmentDTO, source = 'USER') {
    const appointment = await prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) throw new Error('Appointment not found');
    if (appointment.status === 'CANCELLED') {
      throw new Error('Cannot reschedule a cancelled appointment. Please book a new one.');
    }

    const newStart = new Date(dto.newDateTime);
    if (isNaN(newStart.getTime())) throw new Error('Invalid appointment date format');
    if (isBefore(newStart, new Date())) throw new Error('Cannot reschedule to a past date/time');

    const newEnd = addMinutes(newStart, 30);

    // Double booking check for doctor
    const existing = await prisma.appointment.findFirst({
      where: {
        id: { not: dto.appointmentId },
        doctorId: appointment.doctorId,
        status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] as any },
        OR: [
          { dateTime: { equals: newStart } },
          {
            AND: [
              { dateTime: { lte: newStart } },
              { endTime: { gt: newStart } },
            ],
          },
        ],
      },
    });

    if (existing) {
      throw new Error('Double booking prevented: The doctor already has a booked appointment at that time.');
    }

    const updated = await prisma.appointment.update({
      where: { id: dto.appointmentId },
      data: {
        dateTime: newStart,
        endTime: newEnd,
        status: 'RESCHEDULED',
        reason: dto.reason ? `${appointment.reason || ''} [Rescheduled: ${dto.reason}]` : appointment.reason,
        reminderStatus: 'PENDING',
      },
      include: { patient: true, doctor: true },
    });

    // Update or create reminder
    const reminderTime = new Date(newStart.getTime() - 24 * 60 * 60 * 1000);
    await prisma.reminder.deleteMany({
      where: { appointmentId: appointment.id, status: 'PENDING' },
    });
    await prisma.reminder.create({
      data: {
        appointmentId: appointment.id,
        scheduledFor: reminderTime > new Date() ? reminderTime : new Date(),
        channel: (appointment.patient.preferredChannel as any) || 'WHATSAPP',
        status: 'PENDING',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPOINTMENT_RESCHEDULED',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        performedBy: source,
        details: JSON.stringify({
          previousTime: appointment.dateTime.toISOString(),
          newTime: newStart.toISOString(),
          reason: dto.reason,
        }),
      },
    });

    // Send notifications
    const formatted = format(newStart, 'EEEE, MMMM d, yyyy @ h:mm a');
    if (appointment.patient.email) {
      const emailRes = await sesEmailService.sendAppointmentConfirmationEmail({
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        patientEmail: appointment.patient.email,
        doctorName: appointment.doctor.name,
        specialty: appointment.doctor.specialty,
        roomNumber: appointment.doctor.roomNumber || undefined,
        dateTimeFormatted: formatted,
        actionType: 'RESCHEDULED',
      });

      await prisma.notification.create({
        data: {
          patientId: appointment.patient.id,
          appointmentId: appointment.id,
          channel: 'EMAIL',
          type: 'RESCHEDULE_NOTICE',
          status: emailRes.success ? 'DELIVERED' : 'FAILED',
          recipient: appointment.patient.email,
          subject: `[CareConnect] Appointment Rescheduled - Dr. ${appointment.doctor.name}`,
          content: `Your appointment was rescheduled to ${formatted}`,
          externalMessageId: emailRes.messageId,
          errorMessage: emailRes.error,
          sentAt: new Date(),
        },
      });
    }

    if (appointment.patient.phoneNumber) {
      if (appointment.patient.preferredChannel === 'WHATSAPP') {
        const waRes = await socialMessagingService.sendAppointmentConfirmation(
          appointment.patient.phoneNumber,
          {
            patientName: appointment.patient.firstName,
            doctorName: appointment.doctor.name,
            dateTimeFormatted: formatted,
            status: 'Rescheduled',
          }
        );

        await prisma.notification.create({
          data: {
            patientId: appointment.patient.id,
            appointmentId: appointment.id,
            channel: 'WHATSAPP',
            type: 'RESCHEDULE_NOTICE',
            status: waRes.success ? 'DELIVERED' : 'FAILED',
            recipient: appointment.patient.phoneNumber,
            content: `Appointment rescheduled with Dr. ${appointment.doctor.name} to ${formatted}`,
            externalMessageId: waRes.messageId,
            errorMessage: waRes.error,
            sentAt: new Date(),
          },
        });
      }
    }

    return updated;
  }

  async cancelAppointment(id: string, reason?: string, source = 'USER') {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true, doctor: true },
    });

    if (!appointment) throw new Error('Appointment not found');

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${appointment.notes || ''}\nCancellation reason: ${reason}` : appointment.notes,
        reminderStatus: 'SKIPPED',
      },
      include: { patient: true, doctor: true },
    });

    // Cancel pending reminders
    await prisma.reminder.updateMany({
      where: { appointmentId: id, status: 'PENDING' },
      data: { status: 'CANCELLED' as any },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPOINTMENT_CANCELLED',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        performedBy: source,
        details: JSON.stringify({ reason }),
      },
    });

    // Send cancellation notifications
    const formatted = format(new Date(appointment.dateTime), 'MMMM d, yyyy @ h:mm a');
    if (appointment.patient.email) {
      const emailRes = await sesEmailService.sendCancellationEmail({
        patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        patientEmail: appointment.patient.email,
        doctorName: appointment.doctor.name,
        dateTimeFormatted: formatted,
      });

      await prisma.notification.create({
        data: {
          patientId: appointment.patient.id,
          appointmentId: appointment.id,
          channel: 'EMAIL',
          type: 'CANCELLATION_NOTICE',
          status: emailRes.success ? 'DELIVERED' : 'FAILED',
          recipient: appointment.patient.email,
          subject: '[CareConnect] Appointment Cancelled',
          content: `Your appointment with Dr. ${appointment.doctor.name} on ${formatted} was cancelled.`,
          externalMessageId: emailRes.messageId,
          errorMessage: emailRes.error,
          sentAt: new Date(),
        },
      });
    }

    return updated;
  }
}

export const appointmentService = new AppointmentService();
