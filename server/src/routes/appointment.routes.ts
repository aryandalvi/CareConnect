import { Router } from 'express';
import { z } from 'zod';
import { appointmentService } from '../services/appointment.service';

const router = Router();

const createAppointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  doctorId: z.string().min(1, 'Doctor ID is required'),
  specialty: z.string().optional(),
  dateTime: z.string().min(1, 'DateTime is required'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

const rescheduleSchema = z.object({
  newDateTime: z.string().min(1, 'New DateTime is required'),
  reason: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().optional(),
});

// List appointments with filtering
router.get('/', async (req, res) => {
  try {
    const { status, doctorId, patientId, startDate, endDate, search } = req.query;
    const appointments = await appointmentService.getAllAppointments({
      status: status as string,
      doctorId: doctorId as string,
      patientId: patientId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      search: search as string,
    });
    res.json({ success: true, data: appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get available slots
router.get('/available-slots', async (req, res) => {
  try {
    const { date, specialty, doctorId } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Query parameter "date" (YYYY-MM-DD) is required' });
    }
    const slots = await appointmentService.getAvailableSlots({
      date: date as string,
      specialty: specialty as string,
      doctorId: doctorId as string,
    });
    res.json({ success: true, data: slots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get appointment details
router.get('/:id', async (req, res) => {
  try {
    const appointment = await appointmentService.getAppointmentById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ success: false, error: 'Appointment not found' });
    }
    res.json({ success: true, data: appointment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create appointment
router.post('/', async (req, res) => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const appointment = await appointmentService.createAppointment({
      ...parsed.data,
      specialty: parsed.data.specialty || '',
      source: 'DASHBOARD',
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Reschedule appointment
router.post('/:id/reschedule', async (req, res) => {
  try {
    const parsed = rescheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const updated = await appointmentService.rescheduleAppointment(
      {
        appointmentId: req.params.id,
        newDateTime: parsed.data.newDateTime,
        reason: parsed.data.reason,
      },
      'DASHBOARD'
    );
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Cancel appointment
router.post('/:id/cancel', async (req, res) => {
  try {
    const parsed = cancelSchema.safeParse(req.body);
    const updated = await appointmentService.cancelAppointment(
      req.params.id,
      parsed.success ? parsed.data.reason : undefined,
      'DASHBOARD'
    );
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
