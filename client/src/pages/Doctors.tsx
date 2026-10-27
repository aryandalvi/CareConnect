import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import {
  Stethoscope,
  Clock,
  MapPin,
  Calendar,
  CheckCircle,
  Eye,
  Phone,
  Mail,
} from 'lucide-react';
import { api } from '../api/client';
import { Doctor, AvailableSlot } from '../types';

export const Doctors: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  // Slots checker state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [testDate, setTestDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [checkingSlots, setCheckingSlots] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const data = await api.getDoctors();
      setDoctors(data);
      if (data.length > 0) setSelectedDoctorId(data[0].id);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckSlots = async () => {
    if (!selectedDoctorId || !testDate) return;
    try {
      setCheckingSlots(true);
      const res = await api.getAvailableSlots({
        doctorId: selectedDoctorId,
        date: testDate,
      });
      setSlots(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setCheckingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDoctorId && testDate) {
      handleCheckSlots();
    }
  }, [selectedDoctorId, testDate]);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      {/* Clinic Physicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-400">
            Loading clinic doctors...
          </div>
        ) : (
          doctors.map((doc) => (
            <Card key={doc.id} className="flex flex-col justify-between">
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
                    {doc.name.split(' ')[0][0]}
                    {doc.name.split(' ')[1]?.[0] || 'D'}
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm">{doc.name}</h3>
                  <p className="text-xs font-medium text-sky-600">{doc.specialty}</p>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                  {doc.bio || 'General practitioner with regular clinic consultation hours.'}
                </p>

                <div className="space-y-1 text-xs text-slate-500 pt-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clinic Suite {doc.roomNumber || '101'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{doc.email}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Mon &ndash; Fri &bull; 9 AM - 5 PM</span>
                <button
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
                >
                  Check Slots &rarr;
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Real-time Available Slots Calculation Sandbox */}
      <Card>
        <CardHeader
          title="Physician Availability & Slots Calculator"
          subtitle="Verifies doctor schedule minus booked appointments with zero double booking"
        />
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Select Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                size="md"
                onClick={handleCheckSlots}
                isLoading={checkingSlots}
                className="w-full"
              >
                <Clock className="w-4 h-4 text-sky-600" />
                <span>Recalculate Availability</span>
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Available Booking Slots ({slots.length})
              </h4>
              <span className="text-xs text-slate-400">
                Each appointment duration: 30 minutes
              </span>
            </div>

            {slots.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                {checkingSlots
                  ? 'Calculating real-time doctor slot availability...'
                  : 'No open slots found on this date (doctor may not be scheduled or all slots are booked).'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {slots.map((slot) => (
                  <div
                    key={slot.startTime}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-center shadow-xs hover:border-sky-300 transition-colors"
                  >
                    <div className="text-xs font-bold text-slate-800">{slot.timeFormatted}</div>
                    <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center justify-center gap-1">
                      <CheckCircle className="w-2.5 h-2.5" />
                      Available
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
