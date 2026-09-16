import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Clock,
  CheckCircle2,
  Smartphone,
  Sparkles,
  MapPin,
  CalendarDays,
  ShieldCheck,
  ChevronRight,
  Send,
  Timer,
  AlertCircle,
  Award,
  Coffee,
  HeartPulse,
  Plane,
  Hourglass,
  PlusCircle,
  Mail,
  Phone,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { ViolationsCard } from './ViolationsCard';

interface DashboardProps {
  onNavigateToMobile?: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToEmployees?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToMobile,
  onNavigateToRequests,
}) => {
  const { t, isRTL } = useLanguage();
  const {
    currentEmployee,
    todayRecord,
    employees,
    attendanceRecords,
    leaveRequests,
    permissionRequests,
    workSchedule,
    taPolicy,
    holidayDefinitions,
  } = useAttendance();

  // Real-time clock for live tracking
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format 24h string (HH:mm:ss or HH:mm) into 12h AM/PM
  const format12Hour = (timeStr?: string): { formatted: string; raw: string } => {
    if (!timeStr || typeof timeStr !== 'string') return { formatted: '--:--', raw: '--:--' };
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const s = parts[2] ?? 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const formatted = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    const raw = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return { formatted, raw };
  };

  // Calculate Expected Checkout Time (Check-in + 8 hours)
  const getExpectedCheckout = (checkInTimeStr?: string) => {
    if (!checkInTimeStr || typeof checkInTimeStr !== 'string') return null;
    const parts = checkInTimeStr.split(':').map(Number);
    const inH = parts[0] ?? 0;
    const inM = parts[1] ?? 0;
    const inS = parts[2] ?? 0;

    const today = new Date();
    const inDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), inH, inM, inS);
    const expDate = new Date(inDate.getTime() + 8 * 60 * 60 * 1000);

    const expH = expDate.getHours();
    const expM = expDate.getMinutes();
    const expS = expDate.getSeconds();

    const period = expH >= 12 ? 'PM' : 'AM';
    const h12 = expH % 12 === 0 ? 12 : expH % 12;
    const formatted12 = `${String(h12).padStart(2, '0')}:${String(expM).padStart(2, '0')} ${period}`;
    const formatted24 = `${String(expH).padStart(2, '0')}:${String(expM).padStart(2, '0')}:${String(expS).padStart(2, '0')}`;

    // Current elapsed progress towards 8 hours (480 minutes)
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    const inTotalMinutes = inH * 60 + inM + inS / 60;
    const elapsedMinutes = Math.max(0, nowMinutes - inTotalMinutes);
    const remainingMinutes = Math.max(0, 480 - Math.floor(elapsedMinutes));
    const remainingH = Math.floor(remainingMinutes / 60);
    const remainingM = remainingMinutes % 60;

    const elapsedH = Math.floor(elapsedMinutes / 60);
    const elapsedM = Math.floor(elapsedMinutes % 60);

    return {
      formatted12,
      formatted24,
      elapsedH,
      elapsedM,
      remainingH,
      remainingM,
      isOvertime: elapsedMinutes > 480,
      overtimeMinutes: Math.max(0, Math.floor(elapsedMinutes - 480)),
    };
  };

  const expectedCheckoutData = todayRecord?.checkInTime
    ? getExpectedCheckout(todayRecord.checkInTime)
    : null;

  // Find Reporting Manager
  const manager = (employees || []).find((e) => e.id === currentEmployee?.managerId) ||
    (currentEmployee?.role !== 'manager'
      ? (employees || []).find((e) => e.role === 'manager')
      : null);

  // Check-in & Check-out formatting
  const checkInFormatted = format12Hour(todayRecord?.checkInTime);
  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;
  const checkOutFormatted = format12Hour(todayRecord?.checkOutTime);

  // Direct reports if current user is manager
  const directReports = (employees || []).filter((e) => e.managerId === currentEmployee?.id);

  // Leave Balances calculations
  const casualBalance = currentEmployee?.leaveBalance?.casual ?? 0;
  const sickBalance = currentEmployee?.leaveBalance?.sick ?? 0;
  const annualBalance = currentEmployee?.leaveBalance?.annual ?? 0;
  const totalLeaveBalance = casualBalance + sickBalance + annualBalance;

  // Permission Balances calculations
  const monthlyPermissionQuota = 2; // 2 permissions allowed per month
  const usedPermissionsThisMonth = currentEmployee?.leaveBalance?.permissionsCountThisMonth ?? 0;
  const remainingPermissionsThisMonth = Math.max(0, monthlyPermissionQuota - usedPermissionsThisMonth);

  // Pending requests for this employee
  const pendingLeaves = (leaveRequests || []).filter(
    (r) => r.employeeId === currentEmployee?.id && r.status === 'pending'
  );
  const pendingPermissions = (permissionRequests || []).filter(
    (r) => r.employeeId === currentEmployee?.id && r.status === 'pending'
  );
  const totalPendingRequests = (pendingLeaves || []).length + (pendingPermissions || []).length;

  return (
    <div id="homepage-dashboard-view" className="max-w-7xl mx-auto space-y-3 pb-2 text-stone-900">
      {/* Top Welcome Header with Current Date & Real-time Live Clock */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-4 py-2.5 shadow-2xs flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {currentEmployee?.avatar ? (
            <img
              src={currentEmployee.avatar}
              alt={currentEmployee.name || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-stone-200/80 border border-stone-300 shadow-2xs shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-stone-900 text-stone-50 border border-stone-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
              {currentEmployee?.name ? currentEmployee.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
          <div className="flex items-center gap-2 truncate">
            <h1 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight truncate">
              Welcome back, {currentEmployee?.name || 'Staff'}
            </h1>
            <span className="text-xs text-stone-500 font-medium hidden sm:inline truncate">
              • {currentEmployee?.designation || 'Team Member'} ({currentEmployee?.department || 'General'})
            </span>
          </div>
        </div>

        {/* Live Digital Clock Badge */}
        <div className="flex items-center gap-2 bg-white border border-[#ded4c5] px-3 py-1 rounded-lg shadow-2xs shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm tracking-tight">
            {currentTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </span>
        </div>
      </div>

      {/* Main Grid: Shift Timings & Leave Balances (Left 2 cols) vs Manager Bubble & Mobile Notice (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* LEFT COLUMN: Shift Timings + LEAVE & PERMISSION BALANCES (Span 2) */}
        <div className="lg:col-span-2 space-y-3">
          {/* 1. TODAY'S ATTENDANCE STATUS & TIMINGS CARD */}
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#ede4d6] border border-[#ded4c5] flex items-center justify-center text-stone-800 shrink-0">
                  <Timer className="w-3.5 h-3.5 text-stone-800" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-stone-900 leading-tight">
                    Today&apos;s Attendance & Shift Timings
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onNavigateToMobile && (
                  <button
                    type="button"
                    onClick={onNavigateToMobile}
                    className="text-stone-700 hover:text-stone-950 text-[11px] font-semibold px-2 py-0.5 bg-white hover:bg-stone-100 border border-[#ded4c5] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Logs</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}

                {/* Status Badge */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs flex items-center gap-1 ${
                    isCheckedOut
                      ? 'bg-stone-200 text-stone-800 border-stone-300'
                      : isCheckedIn
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCheckedOut
                        ? 'bg-stone-600'
                        : isCheckedIn
                        ? 'bg-emerald-600 animate-pulse'
                        : 'bg-amber-600'
                    }`}
                  />
                  <span>
                    {isCheckedOut
                      ? 'Completed'
                      : isCheckedIn
                      ? 'Active'
                      : 'Not Checked In'}
                  </span>
                </span>
              </div>
            </div>

            {/* Check-In & Check-Out Times Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Check-In Block */}
              <div className="bg-white border border-[#ded4c5] rounded-lg p-3 space-y-1 relative overflow-hidden shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-600" />
                    <span>Check-In</span>
                  </span>
                  {isCheckedIn && (
                    <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                      Recorded
                    </span>
                  )}
                </div>

                <div className="pt-0.5 flex items-baseline justify-between">
                  <div className="text-xl font-extrabold font-mono text-stone-900 tracking-tight">
                    {checkInFormatted.formatted}
                  </div>
                  {isCheckedIn && (
                    <span className="text-[10px] text-stone-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span className="font-mono">{checkInFormatted.raw}</span>
                    </span>
                  )}
                </div>

                {todayRecord?.officeLocationName && (
                  <div className="pt-1 mt-1 border-t border-[#f0eae1] flex items-center gap-1 text-[10px] text-stone-600 font-medium truncate">
                    <MapPin className="w-3 h-3 text-stone-500 shrink-0" />
                    <span className="truncate">{todayRecord.officeLocationName}</span>
                  </div>
                )}
              </div>

              {/* Check-Out / Expected Check-Out Block */}
              <div
                className={`border rounded-lg p-3 space-y-1 relative overflow-hidden shadow-2xs ${
                  isCheckedOut
                    ? 'bg-white border-[#ded4c5]'
                    : isCheckedIn
                    ? 'bg-[#f4efe6] border-stone-800 ring-1 ring-stone-800/10'
                    : 'bg-white border-[#ded4c5]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1">
                    <Timer className="w-3 h-3 text-stone-700" />
                    <span>{isCheckedOut ? 'Check-Out' : 'Expected Check-Out'}</span>
                  </span>

                  {isCheckedOut ? (
                    <span className="text-[9px] font-mono bg-stone-100 text-stone-800 border border-stone-300 px-1.5 py-0.2 rounded font-bold">
                      Done
                    </span>
                  ) : isCheckedIn ? (
                    <span className="text-[9px] font-bold bg-stone-900 text-stone-50 px-1.5 py-0.2 rounded">
                      +8h Target
                    </span>
                  ) : (
                    <span className="text-[9px] text-stone-400 font-medium">8h Default</span>
                  )}
                </div>

                <div className="pt-0.5 flex items-baseline justify-between">
                  <div className="text-xl font-extrabold font-mono text-stone-900 tracking-tight">
                    {isCheckedOut
                      ? checkOutFormatted.formatted
                      : isCheckedIn && expectedCheckoutData
                      ? expectedCheckoutData.formatted12
                      : '--:--'}
                  </div>
                  {isCheckedOut && (
                    <span className="text-[10px] font-mono text-stone-700">
                      {todayRecord?.workDurationMinutes
                        ? `${Math.floor(todayRecord.workDurationMinutes / 60)}h ${todayRecord.workDurationMinutes % 60}m`
                        : '8h 00m'}
                    </span>
                  )}
                </div>

                {isCheckedIn && !isCheckedOut && expectedCheckoutData && (
                  <div className="pt-1 mt-1 border-t border-[#ded4c5] flex items-center justify-between text-[10px]">
                    <span className="text-stone-600">
                      Elapsed: <strong className="text-stone-900 font-mono">{expectedCheckoutData.elapsedH}h {expectedCheckoutData.elapsedM}m</strong>
                    </span>
                    <span className="text-stone-800 font-semibold">
                      {expectedCheckoutData.isOvertime
                        ? `Overtime: +${expectedCheckoutData.overtimeMinutes}m`
                        : `Rem: ${expectedCheckoutData.remainingH}h ${expectedCheckoutData.remainingM}m`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* When not checked in yet today */}
            {!isCheckedIn && (
              <div className="bg-[#ede4d6] border border-[#ded4c5] rounded-lg p-2.5 flex items-center gap-2 text-xs text-stone-700">
                <AlertCircle className="w-4 h-4 text-stone-600 shrink-0" />
                <p className="text-[11px] font-medium text-stone-800 leading-tight">
                  No attendance punched today. Use mobile app to punch check-in within office geofence.
                </p>
              </div>
            )}
          </div>

          {/* 2. SIMPLE, COMPACT LEAVE & PERMISSION BALANCES CARD */}
          <div
            id="leave-permission-balances-card"
            className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs space-y-2.5"
          >
            {/* Clean Header */}
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center text-xs">
                  <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  Leave & Permission Balances
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-[#ede4d6] border border-[#ded4c5] text-stone-800 px-2 py-0.5 rounded-full">
                  Annual: <strong className="font-mono">{annualBalance}d</strong>
                </span>
                {onNavigateToRequests && (
                  <button
                    type="button"
                    onClick={onNavigateToRequests}
                    className="text-stone-900 hover:text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-[#ded4c5] shadow-2xs"
                  >
                    <PlusCircle className="w-3 h-3 text-amber-600" />
                    <span>Apply</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2-Column Compact Metric Grid: Annual Leave & Permission Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Annual Leave */}
              <div className="bg-white border border-[#ded4c5] rounded-lg p-3 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Annual Leave Balance</span>
                  <Plane className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-xl font-extrabold font-mono text-stone-900 leading-none">
                  {annualBalance} <span className="text-xs font-sans font-medium text-stone-500">days available</span>
                </div>
                <span className="text-[10px] text-stone-500 block font-medium pt-0.5">Annual Quota: 24d</span>
              </div>

              {/* Short Permission */}
              <div className="bg-white border border-[#ded4c5] rounded-lg p-3 space-y-1 shadow-2xs">
                <div className="flex items-center justify-between text-stone-500">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">Permission Balance</span>
                  <Hourglass className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xl font-extrabold font-mono text-stone-900 leading-none">
                  {remainingPermissionsThisMonth} <span className="text-xs font-sans font-medium text-stone-500">/ 2 left this month</span>
                </div>
                <span className="text-[10px] text-stone-500 block font-medium pt-0.5">Max 2 hours per instance</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Manager Information Bubble & Mobile Application Notice */}
        <div className="space-y-3">
          {/* 3. REPORTING MANAGER INFORMATION BUBBLE */}
          <div
            id="manager-info-bubble"
            className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs space-y-2.5 relative overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center text-xs">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  My Manager
                </h3>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500 bg-[#ede4d6] border border-[#ded4c5] px-2 py-0.2 rounded-full">
                Reporting Lead
              </span>
            </div>

            {manager ? (
              <div className="space-y-2">
                {/* Manager Avatar & Name Bubble */}
                <div className="bg-white border border-[#ded4c5] rounded-lg p-2.5 flex items-center gap-2.5 shadow-2xs">
                  <div className="relative shrink-0">
                    <img
                      src={manager.avatar}
                      alt={manager.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white border border-stone-300 shadow-2xs shrink-0"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  <div className="space-y-0.5 min-w-0 flex-1">
                    <h4 className="font-bold text-stone-900 text-xs truncate">
                      {manager.name}
                    </h4>
                    <p className="text-[11px] text-stone-700 font-medium truncate">
                      {manager.designation}
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono truncate">
                      {manager.employeeCode} • {manager.department}
                    </p>
                  </div>
                </div>

                {/* Manager Contact Details */}
                <div className="bg-white border border-[#ded4c5] rounded-lg p-2 space-y-1 text-[11px] shadow-2xs">
                  <div className="flex items-center gap-2 text-stone-700 truncate">
                    <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="truncate">{manager.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-700 truncate">
                    <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                    <span className="font-mono">{manager.phone}</span>
                  </div>
                </div>

                {/* Quick Action Button */}
                {onNavigateToRequests && (
                  <button
                    type="button"
                    onClick={onNavigateToRequests}
                    className="w-full bg-[#ede4d6] hover:bg-[#e4d9c7] border border-[#ded4c5] text-stone-900 font-bold px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3 h-3 text-stone-700" />
                      <span>Send Request</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#ded4c5] p-3 rounded-lg text-center space-y-1 text-xs shadow-2xs">
                <p className="font-bold text-stone-800">
                  Senior Management Level
                </p>
                <p className="text-stone-500 text-[10px]">
                  Leading division with {(directReports || []).length} direct report(s).
                </p>
              </div>
            )}
          </div>

          {/* 4. VIOLATIONS BUBBLE */}
          <ViolationsCard
            currentEmployee={currentEmployee}
            employees={employees || []}
            attendanceRecords={attendanceRecords || []}
            leaveRequests={leaveRequests || []}
            permissionRequests={permissionRequests || []}
            workSchedule={workSchedule}
            taPolicy={taPolicy}
            holidayDefinitions={holidayDefinitions || []}
            onNavigateToRequests={onNavigateToRequests}
            onNavigateToMobile={onNavigateToMobile}
          />

          {/* 5. MOBILE APPLICATION NOTICE & POLICY */}
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                  Mobile Attendance System
                </h3>
              </div>
            </div>

            <div className="bg-white border border-[#ded4c5] rounded-lg p-2.5 space-y-1.5 text-[11px] text-stone-700">
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <p className="leading-snug text-[10px] text-stone-600">
                  Check-in and check-out are punched on the <strong>Mobile App</strong> with GPS geofence verification.
                </p>
              </div>

              <div className="pt-1 border-t border-[#ded4c5] flex items-center justify-between text-[10px]">
                <span className="text-stone-500 font-medium">Status</span>
                <span className="bg-[#ede4d6] text-stone-800 font-mono px-1.5 py-0.2 rounded border border-[#ded4c5]">
                  GPS Geofence Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
