import { Router } from 'express';
import { z } from 'zod';
import prisma from '../db/prisma';
import { patientService } from '../services/patient.service';

const router = Router();

const patientCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().min(8),
  dateOfBirth: z.string().optional(),
  preferredChannel: z.enum(['WHATSAPP', 'SMS', 'EMAIL']).default('WHATSAPP'),
  consentStatus: z.enum(['CONSENTED', 'REVOKED', 'PENDING']).default('CONSENTED'),
});

router.get('/', async (req, res) => {
  try {
    const search = req.query.search as string;
    const patients = await patientService.getPatients(search);
    res.json({ success: true, data: patients });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });
    res.json({ success: true, data: patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const parsed = patientCreateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.errors });

    const patient = await prisma.patient.create({
      data: parsed.data as any,
    });

    // Create consent record
    await prisma.communicationConsent.create({
      data: {
        patientId: patient.id,
        channel: parsed.data.preferredChannel as any,
        consented: parsed.data.consentStatus === 'CONSENTED',
        source: 'DASHBOARD',
      },
    });

    res.status(201).json({ success: true, data: patient });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { phoneNumber, email, dateOfBirth, lastName } = req.body;
    const verification = await patientService.verifyPatient({
      phoneNumber,
      email,
      dateOfBirth,
      lastName,
    });
    res.json({ success: true, data: verification });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/consent', async (req, res) => {
  try {
    const { channel, consented } = req.body;
    if (!channel || typeof consented !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Missing channel or consented boolean' });
    }
    const result = await patientService.updateConsent(req.params.id, channel, consented);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
