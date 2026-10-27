import { PrismaClient } from '@prisma/client';
import { addDays, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CareConnect AI database with realistic fictional clinic data...');

  // 1. Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.communicationConsent.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();

  // 2. Seed Doctors
  const doctorData = [
    {
      name: 'Elena Rostova, MD',
      specialty: 'Family Medicine',
      email: 'dr.rostova@careconnect.health',
      phone: '+1-555-0101',
      roomNumber: '101-A',
      bio: 'Board-certified family practitioner with 12 years of clinical experience in preventative care and chronic disease management.',
    },
    {
      name: 'Marcus Vance, MD',
      specialty: 'Cardiology',
      email: 'dr.vance@careconnect.health',
      phone: '+1-555-0102',
      roomNumber: '204-B',
      bio: 'Cardiologist specializing in cardiovascular preventative care, hypertension, and advanced heart health monitoring.',
    },
    {
      name: 'Aisha Patel, MD',
      specialty: 'Pediatrics',
      email: 'dr.patel@careconnect.health',
      phone: '+1-555-0103',
      roomNumber: '105-C',
      bio: 'Pediatrician dedicated to early childhood wellness, adolescent care, and routine developmental screenings.',
    },
    {
      name: 'Julian Chen, MD',
      specialty: 'Dermatology',
      email: 'dr.chen@careconnect.health',
      phone: '+1-555-0104',
      roomNumber: '302-D',
      bio: 'Clinical dermatologist offering skin consultations, screenings, and modern dermatological care.',
    },
  ];

  const doctors = [];
  for (const doc of doctorData) {
    const created = await prisma.doctor.create({ data: doc });
    doctors.push(created);

    // Create doctor availability (Mon - Fri: 09:00 - 17:00, 30 min slots)
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorAvailability.create({
        data: {
          doctorId: created.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          active: true,
        },
      });
    }
  }

  // 3. Seed Fictional Patients
  const patientData = [
    {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      email: 'sarah.jenkins@example.com',
      phoneNumber: '+15550183421',
      dateOfBirth: '1988-04-12',
      preferredChannel: 'WHATSAPP' as any,
      consentStatus: 'CONSENTED' as any,
    },
    {
      firstName: 'David',
      lastName: 'Miller',
      email: 'david.miller@example.com',
      phoneNumber: '+15550195542',
      dateOfBirth: '1975-09-23',
      preferredChannel: 'SMS' as any,
      consentStatus: 'CONSENTED' as any,
    },
    {
      firstName: 'Maria',
      lastName: 'Rodriguez',
      email: 'maria.rodriguez@example.com',
      phoneNumber: '+15550172289',
      dateOfBirth: '1992-11-05',
      preferredChannel: 'WHATSAPP' as any,
      consentStatus: 'CONSENTED' as any,
    },
    {
      firstName: 'Robert',
      lastName: 'Taylor',
      email: 'robert.taylor@example.com',
      phoneNumber: '+15550148831',
      dateOfBirth: '1964-02-18',
      preferredChannel: 'EMAIL' as any,
      consentStatus: 'CONSENTED' as any,
    },
    {
      firstName: 'Emily',
      lastName: 'Watson',
      email: 'emily.watson@example.com',
      phoneNumber: '+15550163910',
      dateOfBirth: '2001-07-30',
      preferredChannel: 'WHATSAPP' as any,
      consentStatus: 'CONSENTED' as any,
    },
  ];

  const patients = [];
  for (const p of patientData) {
    const created = await prisma.patient.create({ data: p });
    patients.push(created);

    // Create communication consent
    await prisma.communicationConsent.create({
      data: {
        patientId: created.id,
        channel: p.preferredChannel,
        consented: true,
        source: 'WEB_PORTAL',
      },
    });
  }

  // 4. Seed Appointments
  const today = new Date();

  // Sarah Jenkins - Appointment Today (Confirmed)
  const apt1Start = setMinutes(setHours(today, 10), 0);
  const apt1End = setMinutes(setHours(today, 10), 30);
  const apt1 = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[0].id,
      specialty: 'Family Medicine',
      dateTime: apt1Start,
      endTime: apt1End,
      status: 'CONFIRMED' as any,
      reason: 'Annual preventive physical examination',
      reminderStatus: 'DELIVERED' as any,
    },
  });

  // David Miller - Tomorrow (Scheduled)
  const apt2Start = setMinutes(setHours(addDays(today, 1), 14), 0);
  const apt2End = setMinutes(setHours(addDays(today, 1), 14), 30);
  const apt2 = await prisma.appointment.create({
    data: {
      patientId: patients[1].id,
      doctorId: doctors[1].id,
      specialty: 'Cardiology',
      dateTime: apt2Start,
      endTime: apt2End,
      status: 'SCHEDULED' as any,
      reason: 'Blood pressure review and routine ECG consultation',
      reminderStatus: 'PENDING' as any,
    },
  });

  // Maria Rodriguez - In 3 days (Rescheduled)
  const apt3Start = setMinutes(setHours(addDays(today, 3), 11), 30);
  const apt3End = setMinutes(setHours(addDays(today, 3), 12), 0);
  const apt3 = await prisma.appointment.create({
    data: {
      patientId: patients[2].id,
      doctorId: doctors[3].id,
      specialty: 'Dermatology',
      dateTime: apt3Start,
      endTime: apt3End,
      status: 'RESCHEDULED' as any,
      reason: 'Follow-up skin check [Rescheduled from earlier slot]',
      reminderStatus: 'PENDING' as any,
    },
  });

  // Robert Taylor - Yesterday (Completed)
  const apt4Start = setMinutes(setHours(addDays(today, -1), 9), 30);
  const apt4End = setMinutes(setHours(addDays(today, -1), 10), 0);
  await prisma.appointment.create({
    data: {
      patientId: patients[3].id,
      doctorId: doctors[0].id,
      specialty: 'Family Medicine',
      dateTime: apt4Start,
      endTime: apt4End,
      status: 'COMPLETED' as any,
      reason: 'Medication management follow-up',
      reminderStatus: 'DELIVERED' as any,
    },
  });

  // 5. Seed Reminders
  await prisma.reminder.create({
    data: {
      appointmentId: apt1.id,
      scheduledFor: addDays(today, -1),
      channel: 'WHATSAPP' as any,
      status: 'DELIVERED' as any,
      sentAt: addDays(today, -1),
    },
  });

  await prisma.reminder.create({
    data: {
      appointmentId: apt2.id,
      scheduledFor: today,
      channel: 'SMS' as any,
      status: 'PENDING' as any,
    },
  });

  // 6. Seed Notifications (WhatsApp, SMS, Email)
  await prisma.notification.create({
    data: {
      patientId: patients[0].id,
      appointmentId: apt1.id,
      channel: 'WHATSAPP' as any,
      type: 'REMINDER' as any,
      status: 'DELIVERED' as any,
      recipient: patients[0].phoneNumber,
      content: `Hello Sarah, this is a reminder from CareConnect for your appointment with Dr. Elena Rostova today at 10:00 AM.`,
      externalMessageId: 'wam-demo-837492',
      sentAt: addDays(today, -1),
    },
  });

  await prisma.notification.create({
    data: {
      patientId: patients[0].id,
      appointmentId: apt1.id,
      channel: 'EMAIL' as any,
      type: 'CONFIRMATION' as any,
      status: 'DELIVERED' as any,
      recipient: patients[0].email,
      subject: '[CareConnect] Appointment Confirmation - Dr. Elena Rostova',
      content: 'Your appointment is confirmed for today at 10:00 AM. Please bring a photo ID and your insurance card.',
      externalMessageId: 'ses-demo-992381',
      sentAt: addDays(today, -2),
    },
  });

  // 7. Seed Sample AI Conversation (Cross-channel WhatsApp demo)
  const conversation = await prisma.conversation.create({
    data: {
      patientId: patients[0].id,
      channel: 'WHATSAPP' as any,
      status: 'ACTIVE',
      lastMessageAt: today,
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'PATIENT' as any,
      content: "Hi, I have an appointment tomorrow, but I can't make it.",
      channel: 'WHATSAPP' as any,
      status: 'DELIVERED',
      createdAt: addDays(today, -1),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'AGENT' as any,
      content: "Hello Sarah! I can help you reschedule your visit with Dr. Elena Rostova. Would you prefer an opening on Friday morning, or another day next week?",
      channel: 'WHATSAPP' as any,
      status: 'DELIVERED',
      metadata: JSON.stringify({
        isDevMode: true,
        toolCalls: [
          {
            toolName: 'getPatientAppointments',
            input: { patientId: patients[0].id },
            output: { count: 1, doctor: 'Elena Rostova, MD' },
          },
        ],
      }),
      createdAt: addDays(today, -1),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'PATIENT' as any,
      content: "Friday morning would be great.",
      channel: 'WHATSAPP' as any,
      status: 'DELIVERED',
      createdAt: addDays(today, -1),
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: 'AGENT' as any,
      content: "I checked Dr. Rostova's schedule for Friday morning. She has openings at 9:30 AM and 10:30 AM. Would 10:30 AM work for you?",
      channel: 'WHATSAPP' as any,
      status: 'DELIVERED',
      metadata: JSON.stringify({
        isDevMode: true,
        toolCalls: [
          {
            toolName: 'getAvailableSlots',
            input: { date: '2026-10-31', specialty: 'Family Medicine' },
            output: { availableSlotsCount: 6 },
          },
        ],
      }),
      createdAt: addDays(today, -1),
    },
  });

  // 8. Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      performedBy: 'ADMIN',
      details: JSON.stringify({ clinic: 'CareConnect Community Health Clinic' }),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'APPOINTMENT_CREATED',
      entityType: 'APPOINTMENT',
      entityId: apt1.id,
      performedBy: 'PATIENT_PORTAL',
      details: JSON.stringify({ patient: 'Sarah Jenkins', doctor: 'Dr. Elena Rostova' }),
    },
  });

  console.log('✅ Seeding complete! Database populated with doctors, patients, appointments, and conversation history.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
