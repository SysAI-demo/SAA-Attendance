import {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  PermissionRequest,
  WorkScheduleDefinition,
  ShiftTiming,
  TAPolicyDefinition,
  HolidayDefinition,
} from '../types';

export type ViolationType = 'late_checkin' | 'early_checkout' | 'unexcused_absence';

export type ViolationSeverity = 'warning' | 'critical' | 'info';

export interface AttendanceViolation {
  id: string;
  type: ViolationType;
  severity: ViolationSeverity;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeeAvatar?: string;
  department: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  details: {
    scheduledTime?: string;
    actualTime?: string;
    differenceFormatted?: string;
    shiftName?: string;
    statusLabel: string;
    hasPermissionApplied?: boolean;
    hasPendingLeave?: boolean;
  };
  detectedAt?: string;
}

export interface ViolationFilterOptions {
  type?: 'all' | ViolationType;
  employeeId?: string;
  department?: string;
  timeRange?: 'today' | 'last_7_days' | 'last_30_days' | 'all';
}

/**
 * Helper to convert time string (HH:mm:ss or HH:mm) into minutes from midnight
 */
export function timeStrToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1] + (parts[2] ? parts[2] / 60 : 0);
}

/**
 * Format minutes into human-readable duration (e.g. "45 min", "1h 30m")
 */
export function formatMinutesDiff(minutes: number): string {
  const absMins = Math.round(Math.abs(minutes));
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hour${h > 1 ? 's' : ''}`;
  return `${m} min`;
}

/**
 * Find the assigned shift object for a given employee
 */
export function getEmployeeShift(
  employee?: Employee,
  workSchedule?: WorkScheduleDefinition
): ShiftTiming | undefined {
  if (!workSchedule?.shifts || workSchedule.shifts.length === 0) return undefined;
  if (employee?.shiftTimingId) {
    const found = workSchedule.shifts.find((s) => s.id === employee.shiftTimingId);
    if (found) return found;
  }
  if (workSchedule.defaultShiftId) {
    const defaultFound = workSchedule.shifts.find((s) => s.id === workSchedule.defaultShiftId);
    if (defaultFound) return defaultFound;
  }
  return workSchedule.shifts[0];
}

/**
 * Checks if a specific date (YYYY-MM-DD) is a company holiday
 */
export function isDateHoliday(dateStr: string, holidays: HolidayDefinition[] = []): boolean {
  if (!holidays || holidays.length === 0) return false;
  return holidays.some((h) => h.isActive && h.date === dateStr);
}

/**
 * Checks if a day of week is a scheduled working day according to workSchedule
 */
export function isWorkingDay(dateObj: Date, workSchedule?: WorkScheduleDefinition): boolean {
  const dayNames: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const dayName = dayNames[dateObj.getDay()];
  const workingDays = workSchedule?.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  return workingDays.includes(dayName as any);
}

/**
 * Comprehensive violation detection engine for:
 * 1. Late Check-in
 * 2. Early Checkout
 * 3. Missed Day Without Applying for Leave (Unexcused Absence)
 */
export function detectAttendanceViolations(params: {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequest[];
  workSchedule?: WorkScheduleDefinition;
  taPolicy?: TAPolicyDefinition;
  holidayDefinitions?: HolidayDefinition[];
  targetEmployeeId?: string; // Optional: filter for single employee
  daysToLookBack?: number; // Default: 30 days
}): AttendanceViolation[] {
  const {
    employees = [],
    attendanceRecords = [],
    leaveRequests = [],
    permissionRequests = [],
    workSchedule,
    taPolicy,
    holidayDefinitions = [],
    targetEmployeeId,
    daysToLookBack = 30,
  } = params;

  const violations: AttendanceViolation[] = [];
  const graceMinutes = taPolicy?.gracePeriodMinutes ?? 15;

  const employeeMap = new Map<string, Employee>();
  employees.forEach((emp) => employeeMap.set(emp.id, emp));

  const relevantEmployees = targetEmployeeId
    ? employees.filter((e) => e.id === targetEmployeeId)
    : employees;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // -------------------------------------------------------------
  // 1 & 2: Process Attendance Records (Late In & Early Out)
  // -------------------------------------------------------------
  const relevantRecords = targetEmployeeId
    ? attendanceRecords.filter((r) => r.employeeId === targetEmployeeId)
    : attendanceRecords;

  for (const record of relevantRecords) {
    const emp = employeeMap.get(record.employeeId);
    if (!emp) continue;

    const shift = getEmployeeShift(emp, workSchedule);
    const shiftStartTime = shift?.startTime || '09:00';
    const shiftEndTime = shift?.endTime || '18:00';
    const shiftStartMinutes = timeStrToMinutes(shiftStartTime) ?? 540; // 9:00 AM
    const shiftEndMinutes = timeStrToMinutes(shiftEndTime) ?? 1080; // 6:00 PM

    // --- CHECK 1: Late Check-In ---
    if (record.checkInTime) {
      const actualInMinutes = timeStrToMinutes(record.checkInTime);
      if (actualInMinutes !== null) {
        const minutesLate = actualInMinutes - shiftStartMinutes;

        // Has approved permission for morning?
        const morningPermission = permissionRequests.find(
          (p) =>
            p.employeeId === emp.id &&
            p.date === record.date &&
            p.status === 'approved'
        );

        if (minutesLate > graceMinutes || record.status === 'late') {
          const effectiveLateMins = Math.max(1, Math.round(minutesLate > 0 ? minutesLate : 15));
          const isCritical = effectiveLateMins >= 45;

          violations.push({
            id: `violation_late_${record.id}`,
            type: 'late_checkin',
            severity: isCritical ? 'critical' : 'warning',
            employeeId: emp.id,
            employeeName: emp.name,
            employeeCode: emp.employeeCode,
            employeeAvatar: emp.avatar,
            department: emp.department,
            date: record.date,
            title: `Late Check-In (${formatMinutesDiff(effectiveLateMins)} late)`,
            description: `Clocked in at ${record.checkInTime} for scheduled shift starting at ${shiftStartTime}${
              morningPermission ? ' (Morning permission on file)' : ''
            }.`,
            details: {
              scheduledTime: shiftStartTime,
              actualTime: record.checkInTime,
              differenceFormatted: `+${formatMinutesDiff(effectiveLateMins)} late`,
              shiftName: shift?.name || 'General Shift',
              statusLabel: isCritical ? 'Severe Delay' : 'Late Arrival',
              hasPermissionApplied: !!morningPermission,
            },
            detectedAt: `${record.date}T${record.checkInTime}`,
          });
        }
      }
    }

    // --- CHECK 2: Early Checkout ---
    if (record.checkOutTime) {
      const actualOutMinutes = timeStrToMinutes(record.checkOutTime);
      if (actualOutMinutes !== null) {
        const minutesEarly = shiftEndMinutes - actualOutMinutes;

        // Check if there was an afternoon/early permission or half day approved
        const afternoonPermission = permissionRequests.find(
          (p) =>
            p.employeeId === emp.id &&
            p.date === record.date &&
            p.status === 'approved'
        );
        const halfDayLeave = leaveRequests.find(
          (l) =>
            l.employeeId === emp.id &&
            record.date >= l.startDate &&
            record.date <= l.endDate &&
            (l.status === 'approved' || l.status === 'pending') &&
            (l.durationOption === 'half_day_morning' || l.durationOption === 'half_day_afternoon')
        );

        // Flag if departed earlier than 15 minutes before shift end without permission/leave
        if (minutesEarly > 15 && !afternoonPermission && !halfDayLeave) {
          const isSevereEarly = minutesEarly >= 60;

          violations.push({
            id: `violation_early_${record.id}`,
            type: 'early_checkout',
            severity: isSevereEarly ? 'critical' : 'warning',
            employeeId: emp.id,
            employeeName: emp.name,
            employeeCode: emp.employeeCode,
            employeeAvatar: emp.avatar,
            department: emp.department,
            date: record.date,
            title: `Early Check-Out (${formatMinutesDiff(minutesEarly)} early)`,
            description: `Clocked out early at ${record.checkOutTime} before scheduled shift end at ${shiftEndTime}.`,
            details: {
              scheduledTime: shiftEndTime,
              actualTime: record.checkOutTime,
              differenceFormatted: `-${formatMinutesDiff(minutesEarly)} early`,
              shiftName: shift?.name || 'General Shift',
              statusLabel: isSevereEarly ? 'Early Departure' : 'Early Out',
              hasPermissionApplied: !!afternoonPermission,
            },
            detectedAt: `${record.date}T${record.checkOutTime}`,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 3: Process Missed Days Without Applying for Leave (No-Shows)
  // -------------------------------------------------------------
  const dateList: string[] = [];
  for (let i = 0; i <= daysToLookBack; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dIso = d.toISOString().split('T')[0];
    dateList.push(dIso);
  }

  for (const dateStr of dateList) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    // Skip non-working days or official company holidays
    if (!isWorkingDay(dateObj, workSchedule)) continue;
    if (isDateHoliday(dateStr, holidayDefinitions)) continue;

    // For today, only flag if it's already well past shift start time (e.g. past 11:00 AM)
    const isCurrentDate = dateStr === todayStr;
    if (isCurrentDate && today.getHours() < 11) {
      continue;
    }

    for (const emp of relevantEmployees) {
      // If employee joined after this date or is disabled, skip
      if (emp.joinedDate && emp.joinedDate > dateStr) continue;
      if (emp.isActive === false) continue;

      // 1. Check if employee has an attendance record for this date
      const attendance = attendanceRecords.find(
        (r) => r.employeeId === emp.id && r.date === dateStr && r.checkInTime
      );
      if (attendance) continue; // Attendance present

      // 2. Check if employee has an applied, approved, or pending leave request for this date
      const hasLeave = leaveRequests.some(
        (l) =>
          l.employeeId === emp.id &&
          dateStr >= l.startDate &&
          dateStr <= l.endDate &&
          l.status !== 'rejected'
      );
      if (hasLeave) continue; // Excused by leave application

      // 3. Check if employee has an approved or pending full-day permission
      const hasPermission = permissionRequests.some(
        (p) =>
          p.employeeId === emp.id &&
          p.date === dateStr &&
          p.status !== 'rejected' &&
          p.durationHours >= 4
      );
      if (hasPermission) continue; // Excused by permission

      const shift = getEmployeeShift(emp, workSchedule);
      const isTodayNoShow = isCurrentDate;

      violations.push({
        id: `violation_noshow_${emp.id}_${dateStr}`,
        type: 'unexcused_absence',
        severity: 'critical',
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        employeeAvatar: emp.avatar,
        department: emp.department,
        date: dateStr,
        title: isTodayNoShow ? 'Unexcused Absence Today (No-Show)' : 'Missed Day Without Leave',
        description: `No attendance punch logged on scheduled working day (${dateStr}) and no leave request filed.`,
        details: {
          scheduledTime: `${shift?.startTime || '09:00'} - ${shift?.endTime || '18:00'}`,
          shiftName: shift?.name || 'Standard Working Day',
          statusLabel: 'Unexcused Absence',
          hasPermissionApplied: false,
          hasPendingLeave: false,
        },
        detectedAt: `${dateStr}T11:00:00`,
      });
    }
  }

  // Sort violations by date descending (newest first)
  return violations.sort((a, b) => b.date.localeCompare(a.date));
}
