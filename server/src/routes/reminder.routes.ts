import { Router } from 'express';
import prisma from '../db/prisma';
import { reminderService } from '../services/reminder.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { scheduledFor: 'desc' },
      take: 50,
      include: {
        appointment: {
          include: {
            patient: true,
            doctor: true,
          },
        },
      },
    });
    res.json({ success: true, data: reminders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Process due reminders (can be called by cron or background runner)
router.post('/process-due', async (req, res) => {
  try {
    const results = await reminderService.processDueReminders();
    res.json({ success: true, processedCount: results.length, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send manual test reminder for a specific appointment
router.post('/test/:appointmentId', async (req, res) => {
  try {
    const result = await reminderService.sendReminderForAppointment(req.params.appointmentId, 'MANUAL');
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
