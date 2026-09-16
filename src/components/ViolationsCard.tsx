import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Clock,
  LogOut,
  CalendarX,
  AlertTriangle,
  ChevronRight,
  Filter,
  CheckCircle2,
  Users,
  User,
  Info,
  CalendarDays,
  ExternalLink,
} from 'lucide-react';
import {
  Employee,
  AttendanceRecord,
  LeaveRequest,
  PermissionRequest,
  WorkScheduleDefinition,
  TAPolicyDefinition,
  HolidayDefinition,
} from '../types';
import {
  detectAttendanceViolations,
  AttendanceViolation,
  ViolationType,
} from '../utils/violationsUtils';

interface ViolationsCardProps {
  currentEmployee: Employee;
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequest[];
  workSchedule?: WorkScheduleDefinition;
  taPolicy?: TAPolicyDefinition;
  holidayDefinitions?: HolidayDefinition[];
  onNavigateToRequests?: () => void;
  onNavigateToMobile?: () => void;
}

export const ViolationsCard: React.FC<ViolationsCardProps> = ({
  currentEmployee,
  employees,
  attendanceRecords,
  leaveRequests,
  permissionRequests,
  workSchedule,
  taPolicy,
  holidayDefinitions,
  onNavigateToRequests,
  onNavigateToMobile,
}) => {
  const isPrivileged =
    currentEmployee?.role === 'manager' ||
    currentEmployee?.role === 'hr' ||
    currentEmployee?.role === 'admin';

  // Toggle between "mine" and "team/all" for managers/HR/Admins
  const [viewScope, setViewScope] = useState<'mine' | 'all'>(isPrivileged ? 'all' : 'mine');
  const [selectedType, setSelectedType] = useState<'all' | ViolationType>('all');
  const [showAllModal, setShowAllModal] = useState<boolean>(false);

  // Compute violations across all employees or just current employee
  const allViolations = useMemo(() => {
    return detectAttendanceViolations({
      employees,
      attendanceRecords,
      leaveRequests,
      permissionRequests,
      workSchedule,
      taPolicy,
      holidayDefinitions,
      targetEmployeeId: viewScope === 'mine' ? currentEmployee.id : undefined,
      daysToLookBack: 30,
    });
  }, [
    employees,
    attendanceRecords,
    leaveRequests,
    permissionRequests,
    workSchedule,
    taPolicy,
    holidayDefinitions,
    viewScope,
    currentEmployee.id,
  ]);

  // Filtered by violation type
  const filteredViolations = useMemo(() => {
    if (selectedType === 'all') return allViolations;
    return allViolations.filter((v) => v.type === selectedType);
  }, [allViolations, selectedType]);

  // Counts for each category
  const lateCount = useMemo(
    () => allViolations.filter((v) => v.type === 'late_checkin').length,
    [allViolations]
  );
  const earlyCount = useMemo(
    () => allViolations.filter((v) => v.type === 'early_checkout').length,
    [allViolations]
  );
  const absenceCount = useMemo(
    () => allViolations.filter((v) => v.type === 'unexcused_absence').length,
    [allViolations]
  );

  // Display limit for the dashboard bubble preview
  const displayLimit = 3;
  const displayedItems = filteredViolations.slice(0, displayLimit);
  const hasMore = filteredViolations.length > displayLimit;

  return (
    <div
      id="violations-bubble"
      className="bg-[#f8f5ef] border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs space-y-3 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[#ded4c5] pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center text-xs shadow-2xs">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-stone-900">Violations</h3>
              {allViolations.length > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {allViolations.length}
                </span>
              )}
            </div>
          </div>

          {/* Scope switch for managers & HR */}
          {isPrivileged && (
            <div className="flex items-center bg-white border border-[#ded4c5] rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewScope('all')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewScope === 'all'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Users className="w-2.5 h-2.5" />
                <span>All Team</span>
              </button>
              <button
                type="button"
                onClick={() => setViewScope('mine')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  viewScope === 'mine'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <User className="w-2.5 h-2.5" />
                <span>Mine</span>
              </button>
            </div>
          )}
        </div>

        {/* Category Pills with live counts */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap transition-all cursor-pointer ${
              selectedType === 'all'
                ? 'bg-stone-800 text-stone-50 border-stone-800 shadow-2xs'
                : 'bg-white text-stone-600 border-[#ded4c5] hover:bg-stone-50'
            }`}
          >
            All ({allViolations.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('late_checkin')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedType === 'late_checkin'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-white text-stone-600 border-[#ded4c5] hover:bg-amber-50/50'
            }`}
          >
            <Clock className="w-2.5 h-2.5 text-amber-500" />
            <span>Late In ({lateCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('early_checkout')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedType === 'early_checkout'
                ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                : 'bg-white text-stone-600 border-[#ded4c5] hover:bg-orange-50/50'
            }`}
          >
            <LogOut className="w-2.5 h-2.5 text-orange-500" />
            <span>Early Out ({earlyCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('unexcused_absence')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              selectedType === 'unexcused_absence'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-white text-stone-600 border-[#ded4c5] hover:bg-rose-50/50'
            }`}
          >
            <CalendarX className="w-2.5 h-2.5 text-rose-500" />
            <span>Absence ({absenceCount})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredViolations.length === 0 ? (
        <div className="bg-white border border-[#ded4c5] rounded-lg p-3 text-center space-y-1.5 shadow-2xs">
          <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-stone-800">No violations detected</p>
          <p className="text-[10px] text-stone-500 leading-snug">
            {viewScope === 'mine'
              ? 'Your check-ins, check-outs, and attendance records are fully regularized.'
              : 'All staff attendance, punches, and applied leaves are on track.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedItems.map((violation) => {
            const isLate = violation.type === 'late_checkin';
            const isEarly = violation.type === 'early_checkout';
            const isAbsence = violation.type === 'unexcused_absence';

            return (
              <div
                key={violation.id}
                className="bg-white border border-[#ded4c5] rounded-lg p-2.5 space-y-1.5 shadow-2xs hover:border-stone-400 transition-colors"
              >
                {/* Top Row: Violation Type Tag + Date */}
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                      isAbsence
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : isLate
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-orange-50 text-orange-800 border-orange-200'
                    }`}
                  >
                    {isAbsence && <CalendarX className="w-2.5 h-2.5 text-rose-600" />}
                    {isLate && <Clock className="w-2.5 h-2.5 text-amber-600" />}
                    {isEarly && <LogOut className="w-2.5 h-2.5 text-orange-600" />}
                    <span>{violation.details.statusLabel}</span>
                  </span>

                  <span className="text-[10px] font-mono text-stone-500 font-semibold flex items-center gap-1">
                    <CalendarDays className="w-2.5 h-2.5 text-stone-400" />
                    <span>{violation.date}</span>
                  </span>
                </div>

                {/* Employee info if viewing all */}
                {viewScope === 'all' && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {violation.employeeAvatar ? (
                      <img
                        src={violation.employeeAvatar}
                        alt={violation.employeeName}
                        className="w-4 h-4 rounded-full object-cover border border-stone-300 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-stone-800 text-stone-100 flex items-center justify-center text-[8px] font-bold shrink-0">
                        {violation.employeeName.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {violation.employeeName}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono truncate">
                      ({violation.employeeCode})
                    </span>
                  </div>
                )}

                {/* Description & Timing Details */}
                <div className="text-[11px] text-stone-700 leading-snug">
                  {violation.description}
                </div>

                {/* Quick Meta Footer */}
                <div className="pt-1 border-t border-[#f0eae1] flex items-center justify-between text-[10px]">
                  <div className="text-stone-500 flex items-center gap-1">
                    {violation.details.differenceFormatted && (
                      <span className="font-mono font-bold text-stone-800 bg-stone-100 px-1 py-0.2 rounded border border-stone-200">
                        {violation.details.differenceFormatted}
                      </span>
                    )}
                    <span className="truncate text-stone-400">
                      {violation.details.shiftName}
                    </span>
                  </div>

                  {/* Action Link */}
                  {violation.employeeId === currentEmployee.id && onNavigateToRequests && (
                    <button
                      type="button"
                      onClick={onNavigateToRequests}
                      className="text-stone-800 hover:text-stone-950 font-bold text-[10px] underline decoration-stone-300 hover:decoration-stone-800 cursor-pointer flex items-center gap-0.5 shrink-0"
                    >
                      <span>Regularize</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Expand / View All button */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAllModal(true)}
              className="w-full py-1.5 bg-white hover:bg-stone-100 border border-[#ded4c5] rounded-lg text-[11px] font-bold text-stone-800 transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1"
            >
              <span>View all {filteredViolations.length} violations</span>
              <ChevronRight className="w-3 h-3 text-stone-600" />
            </button>
          )}
        </div>
      )}

      {/* MODAL: Complete Violations Audit List */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#ded4c5] bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Attendance Violations Audit
                  </h3>
                  <p className="text-[10px] text-stone-500">
                    Showing {filteredViolations.length} recorded late arrivals, early departures, and unexcused absences.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="w-6 h-6 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Filter Tabs */}
            <div className="px-4 py-2 border-b border-[#ded4c5] bg-[#ede4d6] flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-[#ded4c5]'
                }`}
              >
                All ({allViolations.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('late_checkin')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedType === 'late_checkin'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-[#ded4c5]'
                }`}
              >
                Late In ({lateCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('early_checkout')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedType === 'early_checkout'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-[#ded4c5]'
                }`}
              >
                Early Out ({earlyCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('unexcused_absence')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedType === 'unexcused_absence'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-white text-stone-700 hover:bg-stone-50 border border-[#ded4c5]'
                }`}
              >
                Missed Days ({absenceCount})
              </button>
            </div>

            {/* Modal List Body */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {filteredViolations.map((violation) => {
                const isAbsence = violation.type === 'unexcused_absence';
                const isLate = violation.type === 'late_checkin';

                return (
                  <div
                    key={violation.id}
                    className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {violation.employeeAvatar ? (
                          <img
                            src={violation.employeeAvatar}
                            alt={violation.employeeName}
                            className="w-7 h-7 rounded-full object-cover border border-stone-300"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-stone-800 text-stone-50 flex items-center justify-center text-xs font-bold">
                            {violation.employeeName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                            <span>{violation.employeeName}</span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ({violation.employeeCode})
                            </span>
                            <span className="text-[10px] text-stone-500 font-normal">
                              • {violation.department}
                            </span>
                          </div>
                          <div className="text-[10px] text-stone-500 flex items-center gap-1 font-mono">
                            <CalendarDays className="w-3 h-3 text-stone-400" />
                            <span>{violation.date}</span>
                            <span>• {violation.details.shiftName}</span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          isAbsence
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : isLate
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-orange-100 text-orange-800 border-orange-200'
                        }`}
                      >
                        {violation.details.statusLabel}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 bg-[#fbf9f5] border border-[#f0eae1] p-2 rounded-lg leading-relaxed">
                      {violation.description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-2">
                        {violation.details.scheduledTime && (
                          <span className="text-stone-500">
                            Scheduled: <strong className="text-stone-800 font-mono">{violation.details.scheduledTime}</strong>
                          </span>
                        )}
                        {violation.details.actualTime && (
                          <span className="text-stone-500">
                            Actual: <strong className="text-stone-800 font-mono">{violation.details.actualTime}</strong>
                          </span>
                        )}
                        {violation.details.differenceFormatted && (
                          <span className="text-rose-700 font-bold font-mono">
                            ({violation.details.differenceFormatted})
                          </span>
                        )}
                      </div>

                      {violation.employeeId === currentEmployee.id && onNavigateToRequests && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAllModal(false);
                            onNavigateToRequests();
                          }}
                          className="px-2.5 py-1 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                        >
                          Apply Leave / Regularize
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-[#ded4c5] bg-white flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Policy grace period: <strong>{taPolicy?.gracePeriodMinutes || 15} minutes</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowAllModal(false)}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
