import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { checkGeofenceStatus, formatDistance, calculateExpectedOutTime } from '../utils/geoUtils';
import { GeofenceMap } from './GeofenceMap';
import { LocationPermissionPrompt } from './LocationPermissionPrompt';
import { PunchFeedbackCard, PunchFeedbackState } from './PunchFeedbackCard';
import {
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Navigation,
  ShieldCheck,
  Compass,
  Building2,
  Sparkles,
  Smartphone,
  LogOut,
  LogIn,
  Layers,
  CalendarCheck,
} from 'lucide-react';

export const MobileAttendanceTerminal: React.FC = () => {
  const {
    currentEmployee,
    officeLocations,
    currentCoords,
    isUsingRealGPS,
    gpsError,
    locationPermissionStatus,
    hasAcquiredRealGPS,
    setManualLocation,
    enableRealGPS,
    markCheckIn,
    markCheckOut,
    todayRecord,
  } = useAttendance();

  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<PunchFeedbackState | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock for mobile terminal
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute geofence status
  const geofenceResult = checkGeofenceStatus(
    currentCoords,
    officeLocations,
    currentEmployee.allowedLocationIds
  );

  const allowedOffices = officeLocations.filter((loc) =>
    currentEmployee.allowedLocationIds.includes(loc.id)
  );

  const handleCheckIn = () => {
    setFeedback(null);
    const res = markCheckIn(notes);
    setFeedback({
      type: res.success ? 'success' : 'error',
      ...res,
    });
    if (res.success) {
      setNotes('');
    }
  };

  const handleCheckOut = () => {
    setFeedback(null);
    const res = markCheckOut(notes);
    setFeedback({
      type: res.success ? 'success' : 'error',
      ...res,
    });
    if (res.success) {
      setNotes('');
    }
  };

  // Calculate live active shift duration if checked in
  const getElapsedTimeString = () => {
    if (!todayRecord?.checkInTime) return '00:00:00';
    const [inHours, inMins, inSecs = 0] = todayRecord.checkInTime.split(':').map(Number);
    const inDate = new Date();
    inDate.setHours(inHours, inMins, inSecs, 0);

    const diffMs = Math.max(0, currentTime.getTime() - inDate.getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isCheckedIn = !!todayRecord?.checkInTime && !todayRecord?.checkOutTime;
  const isCompleted = !!todayRecord?.checkInTime && !!todayRecord?.checkOutTime;

  return (
    <div id="mobile-terminal-view" className="max-w-xl mx-auto w-full space-y-5 pb-12">
      {/* Mobile Device Header Card */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs">
        {/* Device Status Bar */}
        <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3 mb-4 text-xs text-stone-600">
          <div className="flex items-center gap-1.5 font-mono text-stone-800">
            <Smartphone className="w-3.5 h-3.5 text-stone-700" />
            <span className="font-semibold">Mobile Check-In Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.5 rounded text-[11px] font-mono text-stone-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Employee Profile Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={currentEmployee.avatar}
              alt={currentEmployee.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-stone-300 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-tight">
                  {currentEmployee.name}
                </h2>
                <span className="text-[10px] font-mono uppercase bg-[#ebe1d2] text-stone-800 border border-[#ded4c5] px-1.5 py-0.5 rounded font-semibold">
                  {currentEmployee.employeeCode}
                </span>
              </div>
              <p className="text-xs text-stone-600">{currentEmployee.designation} • {currentEmployee.department}</p>
            </div>
          </div>

          {/* Assigned Locations Badge */}
          <div className="text-right hidden sm:block">
            <span className="text-[11px] font-medium text-stone-500 block mb-0.5">Assigned Offices</span>
            <div className="flex flex-wrap gap-1 justify-end">
              {allowedOffices.map((loc) => (
                <span
                  key={loc.id}
                  className="text-[10px] bg-[#ebe1d2] text-stone-700 border border-[#ded4c5] px-1.5 py-0.5 rounded flex items-center gap-1 font-medium"
                >
                  <Building2 className="w-2.5 h-2.5 text-stone-600" />
                  {loc.name.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time GPS & Geofence Verification Status Card */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        
        {/* Location Permission Prompt if access needed */}
        {(locationPermissionStatus !== 'granted' || !hasAcquiredRealGPS) && (
          <LocationPermissionPrompt
            variant="card"
            title="📍 Allow Device Location Access"
            description="Grant location permission so the mobile terminal can calculate your real distance to the office geofence."
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-stone-700 animate-spin-slow" />
            <h3 className="font-semibold text-stone-900 text-sm sm:text-base">Real-Time Geofence Radar</h3>
          </div>

          {/* GPS Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={enableRealGPS}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isUsingRealGPS
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-[#ede4d6] text-stone-700 border-[#ded4c5] hover:bg-[#e4dacb]'
              }`}
              title="Activate Phone/Browser Geolocation"
            >
              <Navigation className="w-3 h-3 text-stone-700" />
              <span>{isUsingRealGPS ? 'Live Device GPS Active' : 'Use Real Device GPS'}</span>
            </button>
          </div>
        </div>

        {gpsError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Interactive Geofence Map */}
        <GeofenceMap height="240px" allowClickToTeleport={true} />

        {/* Live GPS Teleport Quick Presets (For Seamless Testing & Demo) */}
        <div className="bg-[#f2ebdF] border border-[#ded4c5] p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span className="font-medium flex items-center gap-1 text-stone-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>GPS Simulator Presets (Test Geofence Rules):</span>
            </span>
            <span className="text-[10px] text-stone-500">Click to teleport</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {officeLocations.map((loc) => {
              const isAllowed = currentEmployee.allowedLocationIds.includes(loc.id);
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setManualLocation(loc.latitude + 0.0001, loc.longitude + 0.0001, 8)}
                  className={`text-left p-2 rounded-lg border text-[11px] transition-colors flex flex-col justify-between cursor-pointer ${
                    isAllowed
                      ? 'bg-stone-900 text-stone-50 border-stone-800'
                      : 'bg-[#e9e0d1] text-stone-700 border-[#ded4c5] hover:bg-[#dfd5c4]'
                  }`}
                >
                  <div className="font-semibold truncate text-[11px] flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isAllowed ? 'bg-emerald-400' : 'bg-stone-400'}`}></span>
                    {loc.name.split(' ')[0]}
                  </div>
                  <span className={`text-[10px] truncate ${isAllowed ? 'text-stone-300' : 'text-stone-500'}`}>
                    {isAllowed ? '✓ Authorized' : '🚫 Unauthorized'}
                  </span>
                </button>
              );
            })}

            {/* Out of Office Preset */}
            <button
              type="button"
              onClick={() => setManualLocation(37.820000, -122.478000, 15)}
              className="col-span-2 sm:col-span-4 text-center py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-medium transition-colors cursor-pointer"
            >
              📍 Teleport Outside All Office Geofences (3.5 km away)
            </button>
          </div>
        </div>

        {/* Geofence Status Indicator Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
            geofenceResult.isInAllowedGeofence
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : !geofenceResult.isAuthorizedLocation
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {geofenceResult.isInAllowedGeofence ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : !geofenceResult.isAuthorizedLocation ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}

          <div className="space-y-1 text-xs">
            <div className="font-semibold text-sm flex items-center gap-2">
              {geofenceResult.isInAllowedGeofence
                ? 'Geofence Validated (Within Office Range)'
                : !geofenceResult.isAuthorizedLocation
                ? 'Unauthorized Office Location'
                : 'Outside Office Geofence Radius'}
            </div>
            <p className="leading-relaxed opacity-90">{geofenceResult.statusMessage}</p>
            {geofenceResult.accuracyAlert && (
              <p className="text-[11px] text-amber-700 font-mono mt-1">⚠️ {geofenceResult.accuracyAlert}</p>
            )}
          </div>
        </div>

        {/* GPS Coordinate Pill Data */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-stone-700">
          <div className="bg-[#ede4d6] border border-[#ded4c5] p-2 rounded-lg">
            <span className="text-stone-500 block text-[10px]">GPS Lat / Lng</span>
            <span className="font-semibold">{currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}</span>
          </div>
          <div className="bg-[#ede4d6] border border-[#ded4c5] p-2 rounded-lg">
            <span className="text-stone-500 block text-[10px]">Signal Accuracy</span>
            <span className="text-emerald-700 font-semibold">±{Math.round(currentCoords.accuracy)} meters</span>
          </div>
          <div className="bg-[#ede4d6] border border-[#ded4c5] p-2 rounded-lg col-span-2 sm:col-span-1">
            <span className="text-stone-500 block text-[10px]">Nearest Office</span>
            <span className="font-semibold text-stone-800">{formatDistance(geofenceResult.distanceToNearestMeters)}</span>
          </div>
        </div>
      </div>

      {/* Attendance Check-in / Check-out Action Card */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-stone-700" />
            <h3 className="font-semibold text-stone-900 text-base">Today&apos;s Shift Activity</h3>
          </div>
          <span className="text-xs text-stone-500 font-mono">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {/* Punch Feedback Notification Card */}
        <PunchFeedbackCard
          feedback={feedback}
          onDismiss={() => setFeedback(null)}
        />

        {/* Active Shift Details or Empty State */}
        {isCheckedIn ? (
          <div className="bg-[#ede4d6] border border-[#ded4c5] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-800 font-semibold block">Active Shift In Progress</span>
                <span className="text-xs text-stone-600">
                  Checked in at <strong className="text-stone-900">{todayRecord.checkInTime}</strong> @ {todayRecord.officeLocationName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block uppercase font-mono">Working Time</span>
                <span className="text-lg font-mono font-bold text-stone-900">{getElapsedTimeString()}</span>
              </div>
            </div>

            {/* Expected Out Time Tile */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-white/80 border border-[#ded4c5] p-2.5 rounded-lg">
                <span className="text-[10px] text-stone-500 block font-semibold">Check-In Time</span>
                <span className="font-mono font-bold text-stone-900 text-sm">{todayRecord.checkInTime}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-300 p-2.5 rounded-lg">
                <span className="text-[10px] text-emerald-800 block font-semibold">Expected Out Time (8h)</span>
                <span className="font-mono font-bold text-emerald-950 text-sm">
                  {calculateExpectedOutTime(todayRecord.checkInTime, 8)}
                </span>
              </div>
            </div>

            {/* Shift Progress Bar */}
            <div className="w-full bg-[#ded4c5] rounded-full h-2 overflow-hidden">
              <div className="bg-stone-900 h-full w-2/3"></div>
            </div>

            {todayRecord.notes && (
              <p className="text-xs text-stone-600 bg-white/70 p-2 rounded border border-[#ded4c5] italic">
                &ldquo;{todayRecord.notes}&rdquo;
              </p>
            )}
          </div>
        ) : isCompleted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shift Completed for Today</span>
            </div>
            <div className="text-xs text-stone-700 grid grid-cols-2 gap-2 pt-1 font-mono">
              <div>Check-in: <strong className="text-stone-900">{todayRecord?.checkInTime}</strong></div>
              <div>Check-out: <strong className="text-stone-900">{todayRecord?.checkOutTime}</strong></div>
            </div>
          </div>
        ) : (
          <div className="bg-[#f2ebdF] border border-[#ded4c5] rounded-xl p-4 text-center text-stone-600 text-xs">
            <MapPin className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
            <p className="font-medium text-stone-700">You have not marked attendance for today yet.</p>
            <p className="text-stone-500 text-[11px] mt-0.5">
              Ensure you are within your assigned office location geofence to check in.
            </p>
          </div>
        )}

        {/* Optional Notes Input */}
        {!isCompleted && (
          <div className="space-y-1.5">
            <label htmlFor="shift-notes-input" className="text-xs text-stone-700 font-medium">Activity Note (Optional):</label>
            <input
              id="shift-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. On-site project meeting, shift handover..."
              className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-hidden focus:border-stone-800 transition-colors"
            />
          </div>
        )}

        {/* Primary Action Buttons (Both Always Available) */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            id="check-in-btn"
            type="button"
            onClick={handleCheckIn}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors active:scale-[0.99] border border-emerald-600"
          >
            <div className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-emerald-200" />
              <span>Mark Check-In</span>
            </div>
            <span className="text-[10.5px] font-medium text-emerald-100">
              {todayRecord?.checkInTime ? `First In: ${todayRecord.checkInTime}` : 'Tap to Check In'}
            </span>
          </button>

          <button
            id="check-out-btn"
            type="button"
            onClick={handleCheckOut}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-rose-700 hover:bg-rose-800 text-white shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors active:scale-[0.99] border border-rose-600"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-200" />
              <span>Mark Check-Out</span>
            </div>
            <span className="text-[10.5px] font-medium text-rose-100">
              {todayRecord?.checkOutTime ? `Last Out: ${todayRecord.checkOutTime}` : 'Tap to Check Out'}
            </span>
          </button>
        </div>

        {/* Security / Geofencing Compliance Note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real-time GPS geofence validation active & enforced</span>
        </div>
      </div>

      {/* Allowed Locations Reference Card for Employee */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-stone-700" />
          <span>Your Authorized Office Locations</span>
        </h4>

        <div className="space-y-2">
          {allowedOffices.map((loc) => {
            const dist = checkGeofenceStatus(currentCoords, [loc], [loc.id]);
            return (
              <div
                key={loc.id}
                className="bg-white/80 border border-[#ded4c5] rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: loc.color }}></span>
                    <span>{loc.name}</span>
                  </div>
                  <span className="text-[11px] text-stone-500">{loc.address}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-500 block">Radius: {loc.radiusMeters}m</span>
                  <span className={`font-mono text-xs ${dist.isInAllowedGeofence ? 'text-emerald-700 font-bold' : 'text-stone-600'}`}>
                    {formatDistance(dist.distanceToNearestMeters)} away
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
