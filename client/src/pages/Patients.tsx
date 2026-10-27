import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { getStatusBadge, Badge } from '../components/Badge';
import {
  Users,
  Search,
  MessageSquare,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '../api/client';
import { Patient } from '../types';

export const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await api.getPatients(search);
      setPatients(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [search]);

  const handleToggleConsent = async (patientId: string, currentConsented: boolean) => {
    try {
      await api.updatePatientConsent(patientId, 'WHATSAPP', !currentConsented);
      setActionMessage(`Consent updated to ${!currentConsented ? 'CONSENTED' : 'REVOKED'}`);
      loadPatients();
      if (selectedPatient && selectedPatient.id === patientId) {
        const refreshed = await api.getPatientById(patientId);
        setSelectedPatient(refreshed);
      }
    } catch (err: any) {
      setActionMessage(`Failed to update consent: ${err.message}`);
    } finally {
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleOpenDetails = async (patient: Patient) => {
    try {
      const full = await api.getPatientById(patient.id);
      setSelectedPatient(full);
      setIsDetailsOpen(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patients by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:bg-white"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800">{patients.length}</strong> consented clinic patients
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">
            Loading patient directory...
          </div>
        ) : patients.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">
            No patients found matching your search.
          </div>
        ) : (
          patients.map((patient) => {
            const isConsented = patient.consentStatus === 'CONSENTED';
            return (
              <Card key={patient.id} className="hover:border-slate-300 transition-colors">
                <div className="p-5 space-y-4">
                  {/* Top: Name & Badges */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        DOB: {patient.dateOfBirth || 'Not recorded'}
                      </p>
                    </div>
                    {getStatusBadge(patient.consentStatus)}
                  </div>

                  {/* Contact Channels */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700">{patient.phoneNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 font-medium">Preferred Channel:</span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                        {patient.preferredChannel}
                      </span>
                    </div>
                  </div>

                  {/* Recent Appointments count */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Appointments: <strong>{patient.appointments?.length || 0}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleConsent(patient.id, isConsented)}
                        title={isConsented ? 'Revoke Communication Consent' : 'Grant Consent'}
                      >
                        {isConsented ? (
                          <span className="text-rose-600 font-medium">Revoke</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Opt-In</span>
                        )}
                      </Button>

                      <Button size="sm" variant="outline" onClick={() => handleOpenDetails(patient)}>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Patient Profile Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Patient Profile & History"
        subtitle={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : ''}
        maxWidth="lg"
      >
        {selectedPatient && (
          <div className="space-y-4 text-xs">
            {/* Demographic info */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 font-medium">Full Name</span>
                <div className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </div>
                <div className="text-slate-500 mt-1">Email: {selectedPatient.email}</div>
                <div className="text-slate-500 font-mono">Phone: {selectedPatient.phoneNumber}</div>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Communication Compliance</span>
                <div className="mt-1 flex items-center gap-2">
                  {getStatusBadge(selectedPatient.consentStatus)}
                  <span className="text-slate-500 text-[11px]">
                    via {selectedPatient.preferredChannel}
                  </span>
                </div>
                <div className="mt-2 text-slate-500">
                  Date of Birth (Verification):{' '}
                  <strong className="font-mono text-slate-700">
                    {selectedPatient.dateOfBirth || '1988-04-12'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Appointment History */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">
                Appointment History ({selectedPatient.appointments?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedPatient.appointments?.length === 0 ? (
                  <div className="p-4 bg-slate-50 text-center text-slate-400 rounded-lg">
                    No appointment history.
                  </div>
                ) : (
                  selectedPatient.appointments?.map((apt: any) => (
                    <div
                      key={apt.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">
                          Dr. {apt.doctor?.name} &bull; {apt.specialty}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {format(new Date(apt.dateTime), 'EEEE, MMMM d, yyyy @ h:mm a')}
                        </div>
                        {apt.reason && (
                          <div className="text-slate-400 text-[11px] mt-0.5 italic">
                            Reason: {apt.reason}
                          </div>
                        )}
                      </div>
                      <div>{getStatusBadge(apt.status)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notifications Dispatched */}
            <div>
              <h4 className="font-semibold text-slate-800 mb-2">
                Recent CDS Notifications ({selectedPatient.notifications?.length || 0})
              </h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selectedPatient.notifications?.map((notif: any) => (
                  <div
                    key={notif.id}
                    className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-700 mr-2">{notif.channel}</span>
                      <span className="text-slate-500">{notif.type}</span>
                      <div className="text-slate-400 text-[11px] truncate max-w-sm">
                        {notif.content}
                      </div>
                    </div>
                    {getStatusBadge(notif.status)}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
