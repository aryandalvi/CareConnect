import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { getStatusBadge } from '../components/Badge';
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  RefreshCw,
  XCircle,
  Clock,
  User,
  AlertCircle,
  Send,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';
import { Appointment, Doctor, Patient, AvailableSlot } from '../types';

interface AppointmentsProps {
  onRefresh: () => void;
}

export const Appointments: React.FC<AppointmentsProps> = ({ onRefresh }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [doctorFilter, setDoctorFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // Create form state
  const [newPatientId, setNewPatientId] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newDate, setNewDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [newReason, setNewReason] = useState('Routine Checkup');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Reschedule form state
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const target = new Date();
    target.setDate(target.getDate() + 2);
    return target.toISOString().split('T')[0];
  });
  const [rescheduleSlots, setRescheduleSlots] = useState<AvailableSlot[]>([]);
  const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('Patient schedule conflict');
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('Patient requested cancellation');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [aptData, docData, patData] = await Promise.all([
        api.getAppointments({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          doctorId: doctorFilter !== 'ALL' ? doctorFilter : undefined,
          search: search || undefined,
        }),
        api.getDoctors(),
        api.getPatients(),
      ]);
      setAppointments(aptData);
      setDoctors(docData);
      setPatients(patData);
      if (patData.length > 0 && !newPatientId) setNewPatientId(patData[0].id);
      if (docData.length > 0 && !newDoctorId) setNewDoctorId(docData[0].id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, doctorFilter, search]);

  // Load available slots when create appointment doctor or date changes
  useEffect(() => {
    if (isCreateOpen && newDoctorId && newDate) {
      setLoadingSlots(true);
      api
        .getAvailableSlots({ doctorId: newDoctorId, date: newDate })
        .then((slots: AvailableSlot[]) => {
          setAvailableSlots(slots);
          if (slots.length > 0) setSelectedSlotTime(slots[0].startTime);
          else setSelectedSlotTime('');
        })
        .catch(console.error)
        .finally(() => setLoadingSlots(false));
    }
  }, [isCreateOpen, newDoctorId, newDate]);

  // Load slots when reschedule appointment doctor or date changes
  useEffect(() => {
    if (isRescheduleOpen && selectedAppointment && rescheduleDate) {
      setLoadingRescheduleSlots(true);
      api
        .getAvailableSlots({
          doctorId: selectedAppointment.doctorId,
          date: rescheduleDate,
        })
        .then((slots: AvailableSlot[]) => {
          setRescheduleSlots(slots);
          if (slots.length > 0) setRescheduleSelectedSlot(slots[0].startTime);
          else setRescheduleSelectedSlot('');
        })
        .catch(console.error)
        .finally(() => setLoadingRescheduleSlots(false));
    }
  }, [isRescheduleOpen, selectedAppointment, rescheduleDate]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotTime) {
      setErrorMessage('Please select an available appointment time slot.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage(null);
      const doc = doctors.find((d) => d.id === newDoctorId);
      await api.createAppointment({
        patientId: newPatientId,
        doctorId: newDoctorId,
        specialty: doc?.specialty || '',
        dateTime: selectedSlotTime,
        reason: newReason,
      });
      setSuccessMessage('Appointment booked successfully! Confirmation notices dispatched.');
      setIsCreateOpen(false);
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleSelectedSlot) {
      setErrorMessage('Please pick an available time slot.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await api.rescheduleAppointment(selectedAppointment.id, {
        newDateTime: rescheduleSelectedSlot,
        reason: rescheduleReason,
      });
      setSuccessMessage('Appointment successfully rescheduled.');
      setIsRescheduleOpen(false);
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !cancelConfirmed) {
      setErrorMessage('Please check the confirmation box before cancelling.');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMessage(null);
      await api.cancelAppointment(selectedAppointment.id, cancelReason);
      setSuccessMessage('Appointment has been cancelled.');
      setIsCancelOpen(false);
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async (appointmentId: string) => {
    try {
      setSubmitting(true);
      await api.sendTestReminder(appointmentId);
      setSuccessMessage('Test reminder dispatched via patient preferred channel.');
      loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold">
            &times;
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Header Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search patient, doctor, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="RESCHEDULED">Rescheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Doctor Filter */}
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="ALL">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.name}
              </option>
            ))}
          </select>
        </div>

        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader
          title={`All Appointments (${appointments.length})`}
          subtitle="Real-time clinical booking records and communication states"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-medium">
              <tr>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Doctor & Specialty</th>
                <th className="px-5 py-3">Date & Time</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reminder</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No appointments match your filters.
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {apt.patient.phoneNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-700">Dr. {apt.doctor.name}</div>
                      <div className="text-[11px] text-slate-400">{apt.specialty}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">
                        {format(new Date(apt.dateTime), 'EEEE, MMM d')}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {format(new Date(apt.dateTime), 'h:mm a')} &ndash;{' '}
                        {format(new Date(apt.endTime), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px] truncate text-slate-600">
                      {apt.reason || 'General Consultation'}
                    </td>
                    <td className="px-5 py-3.5">{getStatusBadge(apt.status)}</td>
                    <td className="px-5 py-3.5">{getStatusBadge(apt.reminderStatus)}</td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      <button
                        onClick={() => {
                          setSelectedAppointment(apt);
                          setIsDetailsOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setIsRescheduleOpen(true);
                            }}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-colors"
                            title="Reschedule"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAppointment(apt);
                              setCancelConfirmed(false);
                              setIsCancelOpen(true);
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                            title="Cancel Appointment"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => handleSendReminder(apt.id)}
                        className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-md transition-colors"
                        title="Send Test Reminder"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL 1: Create Appointment */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Book New Clinic Appointment"
        subtitle="Checks doctor working hours and prevents double bookings"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Patient</label>
            <select
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} &bull; {p.phoneNumber} ({p.preferredChannel})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Doctor</label>
              <select
                value={newDoctorId}
                onChange={(e) => setNewDoctorId(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                required
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Target Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Visit Reason</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="e.g. Annual physical, follow-up check"
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          {/* Available Slots Picker */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Verified Available Doctor Slots</span>
              {loadingSlots && <span className="text-sky-600">Checking availability...</span>}
            </label>
            {availableSlots.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500">
                {loadingSlots
                  ? 'Calculating open slots...'
                  : 'No available slots found for this doctor on the selected date. Please choose another date.'}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-lg">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlotTime === slot.startTime;
                  return (
                    <button
                      type="button"
                      key={slot.startTime}
                      onClick={() => setSelectedSlotTime(slot.startTime)}
                      className={`p-2 rounded-lg text-center text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {slot.timeFormatted}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              isLoading={submitting}
              disabled={!selectedSlotTime || availableSlots.length === 0}
            >
              Confirm Booking & Notify Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Reschedule Appointment */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Reschedule Appointment"
        subtitle={`Current: Dr. ${selectedAppointment?.doctor.name} on ${
          selectedAppointment ? format(new Date(selectedAppointment.dateTime), 'MMM d, h:mm a') : ''
        }`}
        maxWidth="lg"
      >
        <form onSubmit={handleReschedule} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Select New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              required
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason for Rescheduling</label>
            <input
              type="text"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Doctor's Available Slots on New Date</span>
              {loadingRescheduleSlots && <span className="text-sky-600">Calculating...</span>}
            </label>
            {rescheduleSlots.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-500">
                {loadingRescheduleSlots
                  ? 'Checking calendar...'
                  : 'No slots available on this date. Try another day.'}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-lg">
                {rescheduleSlots.map((slot) => {
                  const isSelected = rescheduleSelectedSlot === slot.startTime;
                  return (
                    <button
                      type="button"
                      key={slot.startTime}
                      onClick={() => setRescheduleSelectedSlot(slot.startTime)}
                      className={`p-2 rounded-lg text-center text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {slot.timeFormatted}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsRescheduleOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              type="submit"
              isLoading={submitting}
              disabled={!rescheduleSelectedSlot || rescheduleSlots.length === 0}
            >
              Update Schedule & Notify
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Cancel Appointment with Confirmation requirement */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Confirm Appointment Cancellation"
        subtitle="Requires explicit confirmation to prevent accidental cancellations"
        maxWidth="md"
      >
        <form onSubmit={handleCancel} className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg leading-relaxed">
            Are you sure you want to cancel the appointment for{' '}
            <strong>
              {selectedAppointment?.patient.firstName} {selectedAppointment?.patient.lastName}
            </strong>{' '}
            with Dr. {selectedAppointment?.doctor.name} on{' '}
            {selectedAppointment && format(new Date(selectedAppointment.dateTime), 'MMMM d @ h:mm a')}?
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Reason for Cancellation</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg text-xs"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={cancelConfirmed}
              onChange={(e) => setCancelConfirmed(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="font-semibold text-slate-800">
              I confirm the patient explicitly requested this cancellation
            </span>
          </label>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCancelOpen(false)}>
              Keep Appointment
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              isLoading={submitting}
              disabled={!cancelConfirmed}
            >
              Cancel Appointment
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: Appointment Details */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Appointment Record Details"
        subtitle={`ID: ${selectedAppointment?.id}`}
        maxWidth="lg"
      >
        {selectedAppointment && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/70">
              <div>
                <span className="text-slate-400 font-medium">Patient</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedAppointment.patient.firstName} {selectedAppointment.patient.lastName}
                </div>
                <div className="text-slate-500 mt-0.5">{selectedAppointment.patient.email}</div>
                <div className="text-slate-500 font-mono">
                  {selectedAppointment.patient.phoneNumber}
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Attending Physician</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  Dr. {selectedAppointment.doctor.name}
                </div>
                <div className="text-slate-500 mt-0.5">{selectedAppointment.specialty}</div>
                <div className="text-slate-500">Suite {selectedAppointment.doctor.roomNumber}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 font-medium">Scheduled Time</span>
                <div className="font-semibold text-slate-800 mt-1">
                  {format(new Date(selectedAppointment.dateTime), 'MMMM d, yyyy')}
                </div>
                <div className="text-slate-500">
                  {format(new Date(selectedAppointment.dateTime), 'h:mm a')}
                </div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 font-medium">Status</span>
                <div className="mt-1">{getStatusBadge(selectedAppointment.status)}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-slate-400 font-medium">Reminder State</span>
                <div className="mt-1">{getStatusBadge(selectedAppointment.reminderStatus)}</div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-slate-400 font-medium">Visit Reason & Notes</span>
              <p className="text-slate-700 mt-1 font-medium">
                {selectedAppointment.reason || 'General checkup consultation'}
              </p>
              {selectedAppointment.notes && (
                <p className="text-slate-500 mt-1 italic">{selectedAppointment.notes}</p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close Details
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
