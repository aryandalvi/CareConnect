import { Router } from 'express';
import { getAWSStatus } from '../services/aws/config.service';
import prisma from '../db/prisma';

const router = Router();

router.get('/aws-status', (req, res) => {
  const status = getAWSStatus();
  res.json({ success: true, data: status });
});

router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
