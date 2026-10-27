import prisma from '../db/prisma';

export interface VerifyPatientParams {
  phoneNumber?: string;
  email?: string;
  dateOfBirth?: string;
  lastName?: string;
}

export class PatientService {
  async getPatients(search?: string) {
    if (!search) {
      return prisma.patient.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          appointments: {
            take: 3,
            orderBy: { dateTime: 'desc' },
            include: { doctor: true },
          },
          consents: true,
        },
      });
    }

    const lower = search.toLowerCase();
    return prisma.patient.findMany({
      where: {
        OR: [
          { firstName: { contains: lower } },
          { lastName: { contains: lower } },
          { email: { contains: lower } },
          { phoneNumber: { contains: lower } },
        ],
      },
      include: {
        appointments: {
          take: 3,
          orderBy: { dateTime: 'desc' },
          include: { doctor: true },
        },
        consents: true,
      },
    });
  }

  async getPatientById(id: string) {
    return prisma.patient.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { dateTime: 'desc' },
          include: { doctor: true },
        },
        consents: true,
        conversations: {
          take: 5,
          orderBy: { updatedAt: 'desc' },
        },
        notifications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findPatientByPhone(phone: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    return prisma.patient.findFirst({
      where: {
        phoneNumber: {
          contains: cleanPhone.slice(-10),
        },
      },
    });
  }

  async verifyPatient(params: VerifyPatientParams) {
    if (!params.phoneNumber && !params.email) {
      return { verified: false, reason: 'Phone or email required for verification' };
    }

    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          params.phoneNumber ? { phoneNumber: { contains: params.phoneNumber.replace(/\D/g, '').slice(-10) } } : {},
          params.email ? { email: { equals: params.email } } : {},
        ],
      },
    });

    if (!patient) {
      return { verified: false, reason: 'No patient record found' };
    }

    // If DOB is provided, verify match
    if (params.dateOfBirth && patient.dateOfBirth) {
      const matchDob = patient.dateOfBirth.trim() === params.dateOfBirth.trim();
      if (!matchDob) {
        return { verified: false, reason: 'Date of birth did not match records' };
      }
    }

    // If last name is provided, verify match
    if (params.lastName) {
      const matchLast = patient.lastName.toLowerCase() === params.lastName.trim().toLowerCase();
      if (!matchLast) {
        return { verified: false, reason: 'Last name did not match records' };
      }
    }

    return { verified: true, patient };
  }

  async updateConsent(patientId: string, channel: string, consented: boolean) {
    // Update or create communication consent
    const consent = await prisma.communicationConsent.upsert({
      where: {
        patientId_channel: {
          patientId,
          channel: channel as any,
        },
      },
      update: {
        consented,
        consentDate: new Date(),
      },
      create: {
        patientId,
        channel: channel as any,
        consented,
        consentDate: new Date(),
        source: 'DASHBOARD',
      },
    });

    // Update patient general consentStatus
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        consentStatus: consented ? 'CONSENTED' : 'REVOKED',
      },
    });

    return consent;
  }
}

export const patientService = new PatientService();
