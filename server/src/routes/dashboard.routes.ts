import { Router } from 'express';
import { startOfDay, endOfDay } from 'date-fns';
import prisma from '../db/prisma';
import { getAWSStatus } from '../services/aws/config.service';

const router = Router();

router.get('/metrics', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const [
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      pendingConfirmations,
      totalPatients,
      notifications,
      recentActivity,
      recentAppointments,
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({
        where: {
          dateTime: { gte: todayStart, lte: todayEnd },
          status: { not: 'CANCELLED' as any },
        },
      }),
      prisma.appointment.count({
        where: {
          dateTime: { gt: now },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] as any },
        },
      }),
      prisma.appointment.count({
        where: { status: 'SCHEDULED' as any },
      }),
      prisma.patient.count(),
      prisma.notification.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.appointment.findMany({
        take: 5,
        orderBy: { dateTime: 'desc' },
        include: { patient: true, doctor: true },
      }),
    ]);

    // Aggregate reminder delivery stats
    const reminderStats = {
      total: notifications.length,
      delivered: notifications.filter(n => n.status === 'DELIVERED').length,
      sent: notifications.filter(n => n.status === 'SENT').length,
      failed: notifications.filter(n => n.status === 'FAILED').length,
      pending: notifications.filter(n => n.status === 'PENDING').length,
      byChannel: {
        whatsapp: notifications.filter(n => n.channel === 'WHATSAPP').length,
        sms: notifications.filter(n => n.channel === 'SMS').length,
        email: notifications.filter(n => n.channel === 'EMAIL').length,
      },
    };

    const awsStatus = getAWSStatus();

    res.json({
      success: true,
      data: {
        stats: {
          totalAppointments,
          todayAppointments,
          upcomingAppointments,
          pendingConfirmations,
          totalPatients,
        },
        reminderStats,
        awsStatus,
        recentActivity,
        recentAppointments,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
