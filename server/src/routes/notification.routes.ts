import { Router } from 'express';
import prisma from '../db/prisma';
import { sesEmailService } from '../services/aws/ses.service';
import { socialMessagingService } from '../services/aws/social-messaging.service';
import { smsService } from '../services/aws/sms.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { channel, status, patientId } = req.query;
    const where: any = {};

    if (channel && channel !== 'ALL') where.channel = channel;
    if (status && status !== 'ALL') where.status = status;
    if (patientId) where.patientId = patientId;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } },
        appointment: {
          include: { doctor: { select: { name: true, specialty: true } } },
        },
      },
    });

    res.json({ success: true, data: notifications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Retry a failed notification
router.post('/:id/retry', async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
      include: { patient: true, appointment: { include: { doctor: true } } },
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification record not found' });
    }

    let success = false;
    let newMsgId = '';
    let errorMsg = '';

    if (notification.channel === 'EMAIL') {
      const emailRes = await sesEmailService.sendEmail(
        notification.recipient,
        notification.subject || 'CareConnect Notification',
        notification.content
      );
      success = emailRes.success;
      newMsgId = emailRes.messageId;
      errorMsg = emailRes.error || '';
    } else if (notification.channel === 'WHATSAPP') {
      const waRes = await socialMessagingService.sendTextMessage(
        notification.recipient,
        notification.content
      );
      success = waRes.success;
      newMsgId = waRes.messageId;
      errorMsg = waRes.error || '';
    } else if (notification.channel === 'SMS') {
      const smsRes = await smsService.sendSMS(notification.recipient, notification.content);
      success = smsRes.success;
      newMsgId = smsRes.messageId;
      errorMsg = smsRes.error || '';
    }

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: success ? 'DELIVERED' : 'FAILED',
        externalMessageId: newMsgId || notification.externalMessageId,
        errorMessage: errorMsg || null,
        retryCount: { increment: 1 },
        sentAt: new Date(),
      },
    });

    res.json({ success, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
