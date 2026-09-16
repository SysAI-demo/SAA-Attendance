import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogIn,
  LogOut,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  X,
  Compass,
  CheckCircle2,
  Building2,
  Calendar,
  User,
  Timer,
  Navigation,
  FileText,
} from 'lucide-react';
import { GeoCoordinates, GeofenceCheckResult, Employee, AttendanceRecord } from '../types';
import { formatDistance } from '../utils/geoUtils';
import {
  hapticCheckInClick,
  hapticCheckInSuccess,
  hapticCheckOutClick,
  hapticCheckOutSuccess,
} from '../utils/haptics';

interface PunchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  punchType: 'check_in' | 'check_out';
  employee: Employee;
  currentCoords: GeoCoordinates;
  geofenceResult: GeofenceCheckResult;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  todayRecord?: AttendanceRecord;
}

export const PunchConfirmationModal: React.FC<PunchConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  punchType,
  employee,
  currentCoords,
  geofenceResult,
  initialNotes = '',
  onNotesChange,
  todayRecord,
}) => {
  const [modalTime, setModalTime] = useState<Date>(new Date());
  const [localNotes, setLocalNotes] = useState<string>(initialNotes);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync initial notes when opened
  useEffect(() => {
    if (isOpen) {
      setLocalNotes(initialNotes);
      setModalTime(new Date());
      setIsSubmitting(false);
    }
  }, [isOpen, initialNotes]);

  // Live timer inside modal
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setModalTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNotesUpdate = (val: string) => {
    setLocalNotes(val);
    if (onNotesChange) {
      onNotesChange(val);
    }
  };

  const handleConfirmClick = () => {
    if (isCheckIn) {
      hapticCheckInClick();
    } else {
      hapticCheckOutClick();
    }
    setIsSubmitting(true);
    if (onNotesChange) {
      onNotesChange(localNotes);
    }
    setTimeout(() => {
      onConfirm();
      if (isCheckIn) {
        hapticCheckInSuccess();
      } else {
        hapticCheckOutSuccess();
      }
      setIsSubmitting(false);
      onClose();
    }, 150);
  };

  // Calculate elapsed shift duration if checking out
  const getElapsedTimeString = () => {
    if (!todayRecord?.checkInTime) return '00h 00m';
    const [inHours, inMins, inSecs = 0] = todayRecord.checkInTime.split(':').map(Number);
    const inDate = new Date();
    inDate.setHours(inHours, inMins, inSecs, 0);

    const diffMs = Math.max(0, modalTime.getTime() - inDate.getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);

    return `${hrs}h ${mins}m`;
  };

  const isCheckIn = punchType === 'check_in';
  const locationName =
    geofenceResult.activeAuthorizedLocation?.name ||
    geofenceResult.nearestLocation?.name ||
    'Office Location';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="punch-confirmation-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            id="punch-confirmation-modal-container"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-lg bg-[#fbf9f5] border border-[#ded4c5] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto"
          >
            {/* Modal Header */}
            <div
              className={`px-5 py-4 flex items-center justify-between border-b ${
                isCheckIn
                  ? 'bg-stone-900 text-stone-100 border-stone-800'
                  : 'bg-stone-900 text-stone-100 border-stone-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    isCheckIn
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isCheckIn ? <LogIn className="w-5 h-5" /> : <LogOut className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                    <span>{isCheckIn ? 'Confirm Attendance Check-In' : 'Confirm Attendance Check-Out'}</span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isCheckIn
                          ? 'bg-emerald-500 text-emerald-950'
                          : 'bg-rose-500 text-rose-950'
                      }`}
                    >
                      {isCheckIn ? 'Punch In' : 'Punch Out'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Verify your current time and GPS location to prevent accidental clicks
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="close-punch-modal-btn"
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
                title="Cancel & Dismiss (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* 1. Live Timestamp & Date Box */}
              <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2 mb-3">
                  <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-stone-600" />
                    <span>Exact Punch Timestamp</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Synchronized
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-stone-900 tracking-tight">
                      {modalTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })}
                    </div>
                    <div className="text-xs font-semibold text-stone-600 flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      <span>
                        {modalTime.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* If check out, show elapsed time */}
                  {!isCheckIn && todayRecord?.checkInTime && (
                    <div className="sm:text-right bg-[#f8f5ef] p-2.5 rounded-xl border border-[#ded4c5] sm:min-w-[130px]">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">
                        Shift Elapsed
                      </span>
                      <span className="text-base font-extrabold font-mono text-stone-900 flex items-center sm:justify-end gap-1">
                        <Timer className="w-3.5 h-3.5 text-stone-600" />
                        <span>{getElapsedTimeString()}</span>
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        In: {todayRecord.checkInTime}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Current Location & Geofence Verification Box */}
              <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
                  <span className="text-[10px] uppercase font-bold text-stone-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-600" />
                    <span>Current GPS Geofence Location</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      geofenceResult.isInAllowedGeofence
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {geofenceResult.isInAllowedGeofence ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Inside Authorized Perimeter</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Outside Geofence Radius</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-[#f2ebdF] text-stone-800 shrink-0 mt-0.5 border border-[#ded4c5]">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-stone-900 truncate">
                        {locationName}
                      </div>
                      <p className="text-xs text-stone-600 leading-snug">
                        {geofenceResult.statusMessage}
                      </p>
                    </div>
                  </div>

                  {/* Coordinates & Accuracy Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-[#f8f5ef] border border-[#ded4c5] p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block font-sans">
                        GPS Latitude
                      </span>
                      <span className="font-bold text-stone-800">
                        {currentCoords.latitude.toFixed(5)}°
                      </span>
                    </div>

                    <div className="bg-[#f8f5ef] border border-[#ded4c5] p-2 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block font-sans">
                        GPS Longitude
                      </span>
                      <span className="font-bold text-stone-800">
                        {currentCoords.longitude.toFixed(5)}°
                      </span>
                    </div>

                    <div className="bg-[#f8f5ef] border border-[#ded4c5] p-2 rounded-xl col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block font-sans">
                        Signal Accuracy
                      </span>
                      <span className="font-bold text-emerald-700">
                        ±{Math.round(currentCoords.accuracy)} meters
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Employee Info Context */}
              <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={employee.avatar}
                    alt={employee.name}
                    className="w-9 h-9 rounded-full object-cover border border-[#ded4c5] shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-stone-900 truncate">{employee.name}</div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {employee.employeeCode} • {employee.department}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">
                    Assigned Role
                  </span>
                  <span className="font-semibold text-stone-800 capitalize">
                    {employee.role}
                  </span>
                </div>
              </div>

              {/* 4. Optional Punch Notes Input */}
              <div className="space-y-1">
                <label
                  htmlFor="modal-punch-notes"
                  className="text-xs font-bold text-stone-700 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  <span>Activity Note (Optional):</span>
                </label>
                <input
                  id="modal-punch-notes"
                  type="text"
                  value={localNotes}
                  onChange={(e) => handleNotesUpdate(e.target.value)}
                  placeholder="e.g. Desk 4B, On-site shift, client meeting..."
                  className="w-full bg-white border border-[#ded4c5] rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              {/* Outside Geofence Warning banner if attempting punch outside */}
              {!geofenceResult.isInAllowedGeofence && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Geofence Advisory:</strong> You are currently outside your assigned office geofence.
                    This punch will be flagged as an off-site/out-of-geofence punch for HR audit.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer with Clear Actions */}
            <div className="p-4 bg-[#ede4d6] border-t border-[#ded4c5] flex items-center justify-between gap-3">
              <button
                type="button"
                id="cancel-punch-confirm-btn"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-white hover:bg-stone-100 border border-[#ded4c5] text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel & Go Back
              </button>

              <button
                type="button"
                id="execute-punch-confirm-btn"
                onClick={handleConfirmClick}
                disabled={isSubmitting}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                  isCheckIn
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20 active:scale-[0.98]'
                    : 'bg-rose-700 hover:bg-rose-800 text-white shadow-rose-900/20 active:scale-[0.98]'
                }`}
              >
                {isCheckIn ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                <span>
                  {isSubmitting
                    ? 'Recording Punch...'
                    : isCheckIn
                    ? `Confirm Punch In (${modalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : `Confirm Punch Out (${modalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
