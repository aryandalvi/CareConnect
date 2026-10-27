import { Router } from 'express';
import prisma from '../db/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: {
        availabilities: {
          where: { active: true },
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: doctors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: req.params.id },
      include: {
        availabilities: { orderBy: { dayOfWeek: 'asc' } },
        appointments: {
          take: 10,
          orderBy: { dateTime: 'desc' },
          include: { patient: true },
        },
      },
    });
    if (!doctor) return res.status(404).json({ success: false, error: 'Doctor not found' });
    res.json({ success: true, data: doctor });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
