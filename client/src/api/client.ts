export const API_BASE = '/api';

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.error || json.message || `Request failed with status ${res.status}`);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Dashboard
  getDashboardMetrics: () => fetchApi('/dashboard/metrics'),

  // Appointments
  getAppointments: (params?: { status?: string; doctorId?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi(`/appointments${query ? `?${query}` : ''}`);
  },
  getAppointmentById: (id: string) => fetchApi(`/appointments/${id}`),
  getAvailableSlots: (params: { date: string; specialty?: string; doctorId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi(`/appointments/available-slots?${query}`);
  },
  createAppointment: (data: {
    patientId: string;
    doctorId: string;
    specialty?: string;
    dateTime: string;
    reason?: string;
    notes?: string;
  }) => fetchApi('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  rescheduleAppointment: (id: string, data: { newDateTime: string; reason?: string }) =>
    fetchApi(`/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify(data) }),
  cancelAppointment: (id: string, reason?: string) =>
    fetchApi(`/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Patients
  getPatients: (search?: string) =>
    fetchApi(`/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getPatientById: (id: string) => fetchApi(`/patients/${id}`),
  updatePatientConsent: (id: string, channel: string, consented: boolean) =>
    fetchApi(`/patients/${id}/consent`, {
      method: 'POST',
      body: JSON.stringify({ channel, consented }),
    }),

  // Doctors
  getDoctors: () => fetchApi('/doctors'),
  getDoctorById: (id: string) => fetchApi(`/doctors/${id}`),

  // Conversations & AI Agent Sandbox
  getConversations: () => fetchApi('/conversations'),
  getConversationById: (id: string) => fetchApi(`/conversations/${id}`),
  sendChatMessage: (data: {
    patientId?: string;
    conversationId?: string;
    messageText: string;
    channel?: string;
  }) => fetchApi('/conversations/chat', { method: 'POST', body: JSON.stringify(data) }),
  clearConversationMessages: (id: string) =>
    fetchApi(`/conversations/${id}/messages`, { method: 'DELETE' }),

  // Notifications
  getNotifications: (params?: { channel?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchApi(`/notifications${query ? `?${query}` : ''}`);
  },
  retryNotification: (id: string) =>
    fetchApi(`/notifications/${id}/retry`, { method: 'POST' }),

  // Reminders
  processDueReminders: () => fetchApi('/reminders/process-due', { method: 'POST' }),
  sendTestReminder: (appointmentId: string) =>
    fetchApi(`/reminders/test/${appointmentId}`, { method: 'POST' }),

  // Settings
  getAWSStatus: () => fetchApi('/settings/aws-status'),
  getAuditLogs: () => fetchApi('/settings/audit-logs'),
};
