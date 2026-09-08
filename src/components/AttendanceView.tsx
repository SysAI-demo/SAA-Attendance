import React, { useState, useMemo } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { checkGeofenceStatus, formatDistance, calculateExpectedOutTime } from '../utils/geoUtils';
import { GeofenceMap } from './GeofenceMap';
import { WorkHoursBarChart } from './WorkHoursBarChart';
import { PunchFeedbackCard, PunchFeedbackState } from './PunchFeedbackCard';
import { AttendanceRecord, Employee, OfficeLocation } from '../types';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Search,
  Filter,
  Users,
  User,
  Building2,
  MapPin,
  ShieldCheck,
  Smartphone,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Timer,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  Eye,
  X,
  Info,
  FileDown,
  Printer,
  CalendarRange,
  RotateCcw,
} from 'lucide-react';

type TimeRangeOption =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'last_month'
  | 'custom'
  | 'all';

export const AttendanceView: React.FC = () => {
  const {
    currentEmployee,
    employees,
    officeLocations,
    attendanceRecords,
    currentCoords,
    isUsingRealGPS,
    gpsError,
    markCheckIn,
    markCheckOut,
    todayRecord,
    isCurrentHR,
    enableRealGPS,
    setManualLocation,
  } = useAttendance();

  // Tab mode for HR: 'all_employees' or 'my_attendance'
  const [hrViewMode, setHrViewMode] = useState<'all_employees' | 'my_attendance'>('all_employees');

  // Filters for HR view
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRangeOption>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Selected record for details modal
  const [inspectingRecord, setInspectingRecord] = useState<AttendanceRecord | null>(null);

  // Web check-in card state
  const [punchNotes, setPunchNotes] = useState('');
  const [punchFeedback, setPunchFeedback] = useState<PunchFeedbackState | null>(null);
  const [showWebTerminal, setShowWebTerminal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e) => depts.add(e.department));
    return Array.from(depts);
  }, [employees]);

  // Is viewing in personal mode?
  const isPersonalMode = !isCurrentHR || hrViewMode === 'my_attendance';

  // Helper date calculations
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter attendance records based on active role and filters
  const filteredRecords = useMemo(() => {
    const today = new Date();

    return attendanceRecords.filter((rec) => {
      // 1. Role / Employee scoping
      if (isPersonalMode) {
        if (rec.employeeId !== currentEmployee.id) return false;
      } else {
        if (selectedEmployeeId !== 'all' && rec.employeeId !== selectedEmployeeId) return false;
        if (selectedDepartment !== 'all' && rec.department !== selectedDepartment) return false;
      }

      // 2. Location filter
      if (selectedLocationId !== 'all' && rec.officeLocationId !== selectedLocationId) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'active' && rec.status !== 'active') return false;
        if (selectedStatus === 'late' && rec.status !== 'late') return false;
        if (selectedStatus === 'on_time' && rec.status !== 'on_time' && rec.status !== 'completed') return false;
        if (selectedStatus === 'half_day' && rec.status !== 'half_day') return false;
      }

      // 4. Custom date picker range (if set)
      if (customStartDate && rec.date < customStartDate) return false;
      if (customEndDate && rec.date > customEndDate) return false;

      // 5. Time range filter (only if no explicit custom range was picked)
      if (!customStartDate && !customEndDate) {
        if (timeRange === 'today') {
          if (rec.date !== todayStr) return false;
        } else if (timeRange === 'yesterday') {
          if (rec.date !== yesterdayStr) return false;
        } else if (timeRange === 'this_week') {
          const d = new Date(rec.date);
          const dayOfWeek = today.getDay() || 7; // Mon = 1, Sun = 7
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
          startOfWeek.setHours(0, 0, 0, 0);
          if (d < startOfWeek) return false;
        } else if (timeRange === 'this_month') {
          const [recYear, recMonth] = rec.date.split('-').map(Number);
          if (recYear !== today.getFullYear() || recMonth !== today.getMonth() + 1) return false;
        } else if (timeRange === 'last_30_days') {
          const recDate = new Date(rec.date);
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          if (recDate < thirtyDaysAgo) return false;
        } else if (timeRange === 'last_month') {
          const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const [recYear, recMonth] = rec.date.split('-').map(Number);
          if (recYear !== lastMonthDate.getFullYear() || recMonth !== lastMonthDate.getMonth() + 1) {
            return false;
          }
        }
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.employeeName.toLowerCase().includes(q);
        const matchesCode = rec.employeeCode.toLowerCase().includes(q);
        const matchesDept = rec.department.toLowerCase().includes(q);
        const matchesLocation = rec.officeLocationName.toLowerCase().includes(q);
        const matchesDate = rec.date.includes(q);
        const matchesNotes = rec.notes?.toLowerCase().includes(q);

        if (!matchesName && !matchesCode && !matchesDept && !matchesLocation && !matchesDate && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [
    attendanceRecords,
    isPersonalMode,
    currentEmployee.id,
    selectedEmployeeId,
    selectedDepartment,
    selectedLocationId,
    selectedStatus,
    timeRange,
    customStartDate,
    customEndDate,
    searchQuery,
    todayStr,
    yesterdayStr,
  ]);

  // Aggregate KPI metrics for the current filtered view
  const kpiStats = useMemo(() => {
    const totalPunches = filteredRecords.length;
    const activeToday = filteredRecords.filter((r) => r.status === 'active').length;
    const lateCount = filteredRecords.filter((r) => r.status === 'late').length;
    const geofenceValidCount = filteredRecords.filter((r) => r.isGeofenceValid).length;

    let totalHoursSum = 0;
    let recordsWithHours = 0;

    filteredRecords.forEach((r) => {
      if (r.totalHoursWorked && r.totalHoursWorked > 0) {
        totalHoursSum += Number(r.totalHoursWorked);
        recordsWithHours++;
      } else if (r.workDurationMinutes && r.workDurationMinutes > 0) {
        totalHoursSum += r.workDurationMinutes / 60;
        recordsWithHours++;
      } else if (r.checkInTime && r.checkOutTime) {
        const [inH, inM] = r.checkInTime.split(':').map(Number);
        const [outH, outM] = r.checkOutTime.split(':').map(Number);
        const diff = (outH + outM / 60) - (inH + inM / 60);
        if (diff > 0) {
          totalHoursSum += diff;
          recordsWithHours++;
        }
      }
    });

    const avgHours = recordsWithHours > 0 ? totalHoursSum / recordsWithHours : 0;
    const onTimeRate =
      totalPunches > 0 ? Math.round(((totalPunches - lateCount) / totalPunches) * 100) : 100;
    const geofenceCompliance =
      totalPunches > 0 ? Math.round((geofenceValidCount / totalPunches) * 100) : 100;

    return {
      totalPunches,
      activeToday,
      lateCount,
      totalHours: Math.round(totalHoursSum * 10) / 10,
      avgHours: Math.round(avgHours * 10) / 10,
      onTimeRate,
      geofenceCompliance,
    };
  }, [filteredRecords]);

  // Geofence status for terminal
  const geofenceResult = checkGeofenceStatus(
    currentCoords,
    officeLocations,
    currentEmployee.allowedLocationIds
  );

  const allowedOffices = officeLocations.filter((loc) =>
    currentEmployee.allowedLocationIds.includes(loc.id)
  );

  // Web check-in direct actions
  const handleWebCheckIn = () => {
    setPunchFeedback(null);
    const res = markCheckIn(punchNotes);
    setPunchFeedback({
      type: res.success ? 'success' : 'error',
      ...res,
    });
    if (res.success) {
      setPunchNotes('');
    }
  };

  const handleWebCheckOut = () => {
    setPunchFeedback(null);
    const res = markCheckOut(punchNotes);
    setPunchFeedback({
      type: res.success ? 'success' : 'error',
      ...res,
    });
    if (res.success) {
      setPunchNotes('');
    }
  };

  // PDF Export functionality
  const exportToPDF = () => {
    if (filteredRecords.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const generatedOn = new Date().toLocaleString();
    const dateRangeLabel =
      customStartDate || customEndDate
        ? `${customStartDate || 'Beginning'} → ${customEndDate || 'Present'}`
        : timeRange === 'today'
        ? `Today (${todayStr})`
        : timeRange === 'yesterday'
        ? `Yesterday (${yesterdayStr})`
        : timeRange === 'this_week'
        ? 'This Week'
        : timeRange === 'this_month'
        ? 'This Month'
        : timeRange === 'last_30_days'
        ? 'Past 30 Days'
        : timeRange === 'last_month'
        ? 'Last Month'
        : 'All Historical Records';

    const selectedEmployeeObj =
      selectedEmployeeId !== 'all' ? employees.find((e) => e.id === selectedEmployeeId) : null;
    const selectedLocationObj =
      selectedLocationId !== 'all' ? officeLocations.find((l) => l.id === selectedLocationId) : null;

    const scopeTitle = isPersonalMode
      ? `ATTENDANCE STATEMENT — ${currentEmployee.name.toUpperCase()}`
      : selectedEmployeeObj
      ? `EMPLOYEE ATTENDANCE REPORT — ${selectedEmployeeObj.name.toUpperCase()}`
      : 'ENTERPRISE ATTENDANCE MASTER AUDIT REPORT';

    const scopeSubtitle = isPersonalMode
      ? `Employee ID: ${currentEmployee.employeeCode} • Department: ${currentEmployee.department}`
      : `Company-Wide Audit • Department: ${selectedDepartment === 'all' ? 'All Departments' : selectedDepartment} • Branch: ${selectedLocationObj ? selectedLocationObj.name : 'All Branches'}`;

    const tableRows = filteredRecords
      .map((r, index) => {
        const [y, m, d] = r.date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dateFormatted = isNaN(dateObj.getTime())
          ? r.date
          : dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

        const statusStyle =
          r.status === 'on_time' || r.status === 'completed'
            ? 'color: #065f46; background-color: #d1fae5; border: 1px solid #a7f3d0;'
            : r.status === 'late'
            ? 'color: #92400e; background-color: #fef3c7; border: 1px solid #fde68a;'
            : r.status === 'half_day'
            ? 'color: #6b21a8; background-color: #f3e8ff; border: 1px solid #e9d5ff;'
            : r.status === 'active'
            ? 'color: #1e40af; background-color: #dbeafe; border: 1px solid #bfdbfe;'
            : 'color: #1f2937; background-color: #f3f4f6; border: 1px solid #e5e7eb;';

        const statusLabel =
          r.status === 'on_time' || r.status === 'completed'
            ? 'ON-TIME'
            : r.status === 'late'
            ? 'LATE ARRIVAL'
            : r.status === 'half_day'
            ? 'HALF DAY'
            : r.status === 'active'
            ? 'ACTIVE SHIFT'
            : r.status?.toUpperCase() || 'RECORDED';

        return `
          <tr style="border-bottom: 1px solid #e5e7eb; ${index % 2 === 1 ? 'background-color: #fafaf9;' : ''}">
            ${
              !isPersonalMode
                ? `<td style="padding: 9px 11px; font-weight: 600; color: #1c1917;">
                    <div>${r.employeeName}</div>
                    <div style="font-size: 10px; color: #78716c; font-family: monospace;">${r.employeeCode} • ${r.department}</div>
                   </td>`
                : ''
            }
            <td style="padding: 9px 11px; font-weight: 600; color: #1c1917; white-space: nowrap;">${dateFormatted}</td>
            <td style="padding: 9px 11px; font-family: monospace; color: #292524;">${r.checkInTime || '—'}</td>
            <td style="padding: 9px 11px; font-family: monospace; color: #292524;">${r.checkOutTime || (r.status === 'active' ? 'Active' : '—')}</td>
            <td style="padding: 9px 11px; font-family: monospace; font-weight: 700; color: #065f46;">${r.totalHoursWorked ? `${r.totalHoursWorked} hrs` : '—'}</td>
            <td style="padding: 9px 11px; color: #44403c; font-size: 11px;">${r.officeLocationName || 'Office Branch'}</td>
            <td style="padding: 9px 11px;">
              <span style="display: inline-block; padding: 2px 7px; border-radius: 9999px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; ${statusStyle}">
                ${statusLabel}
              </span>
            </td>
            <td style="padding: 9px 11px; font-size: 10.5px; color: ${r.isGeofenceValid ? '#065f46' : '#991b1b'}; font-weight: 600;">
              ${r.isGeofenceValid ? '✓ Verified GPS' : '⚠ Outside'}
            </td>
            <td style="padding: 9px 11px; color: #57534e; font-size: 10.5px;">${r.notes || '—'}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attendance Report - ${isPersonalMode ? currentEmployee.name : 'Company Master Audit'}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 14mm 12mm 14mm 12mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #1c1917;
              background-color: #ffffff;
              margin: 0;
              padding: 20px;
              font-size: 12px;
              line-height: 1.4;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1c1917;
              padding-bottom: 14px;
              margin-bottom: 16px;
            }
            .company-title {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: -0.5px;
              color: #1c1917;
              margin: 0 0 3px 0;
            }
            .sub-title {
              font-size: 11px;
              font-weight: 600;
              color: #78716c;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .report-badge {
              text-align: right;
              font-size: 10.5px;
              color: #57534e;
            }
            .filter-meta-bar {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              background-color: #fcfbf9;
              border: 1px solid #e7e5e4;
              border-radius: 8px;
              padding: 10px 14px;
              margin-bottom: 16px;
            }
            .meta-label {
              font-size: 9.5px;
              text-transform: uppercase;
              font-weight: 700;
              color: #78716c;
              margin-bottom: 2px;
            }
            .meta-value {
              font-size: 12px;
              font-weight: 700;
              color: #1c1917;
            }
            .summary-kpis {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 10px;
              margin-bottom: 18px;
            }
            .kpi-card {
              border: 1px solid #e7e5e4;
              border-radius: 8px;
              padding: 10px;
              text-align: center;
              background-color: #ffffff;
            }
            .kpi-number {
              font-size: 16px;
              font-weight: 800;
              font-family: monospace;
              color: #1c1917;
            }
            .kpi-title {
              font-size: 9.5px;
              text-transform: uppercase;
              font-weight: 700;
              color: #78716c;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
              font-size: 11px;
            }
            th {
              background-color: #f5f5f4;
              color: #44403c;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 9.5px;
              letter-spacing: 0.5px;
              padding: 8px 10px;
              border-top: 1px solid #d6d3d1;
              border-bottom: 2px solid #d6d3d1;
              text-align: left;
            }
            .footer {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #e7e5e4;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #78716c;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 16px; padding: 10px 14px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; font-size: 12px; color: #92400e;">
              📄 PDF Report Preview Ready (${filteredRecords.length} records)
            </span>
            <div>
              <button onclick="window.print()" style="padding: 6px 14px; background-color: #1c1917; color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 11.5px; cursor: pointer; margin-right: 8px;">
                Save as PDF / Print
              </button>
              <button onclick="window.close()" style="padding: 6px 12px; background-color: #e7e5e4; color: #1c1917; border: none; border-radius: 6px; font-weight: 600; font-size: 11.5px; cursor: pointer;">
                Close Preview
              </button>
            </div>
          </div>

          <div class="header-container">
            <div>
              <h1 class="company-title">${scopeTitle}</h1>
              <div class="sub-title">${scopeSubtitle}</div>
            </div>
            <div class="report-badge">
              <div><strong>Generated:</strong> ${generatedOn}</div>
              <div><strong>System:</strong> Geofence GPS Shift Tracker</div>
            </div>
          </div>

          <div class="filter-meta-bar">
            <div>
              <div class="meta-label">Date Range Filter</div>
              <div class="meta-value">${dateRangeLabel}</div>
            </div>
            <div>
              <div class="meta-label">Department / Scoping</div>
              <div class="meta-value">${isPersonalMode ? currentEmployee.department : selectedDepartment === 'all' ? 'All Departments' : selectedDepartment}</div>
            </div>
            <div>
              <div class="meta-label">Branch Filter</div>
              <div class="meta-value">${selectedLocationObj ? selectedLocationObj.name : 'All Office Locations'}</div>
            </div>
            <div>
              <div class="meta-label">Status Filter</div>
              <div class="meta-value" style="text-transform: uppercase;">${selectedStatus === 'all' ? 'All Statuses' : selectedStatus}</div>
            </div>
          </div>

          <div class="summary-kpis">
            <div class="kpi-card">
              <div class="kpi-number">${kpiStats.totalPunches}</div>
              <div class="kpi-title">Total Records</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-number">${kpiStats.avgHours} hrs</div>
              <div class="kpi-title">Average Shift Duration</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-number" style="color: #1e40af;">${kpiStats.onTimeRate}%</div>
              <div class="kpi-title">On-Time Arrival Rate</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-number" style="color: #047857;">${kpiStats.geofenceCompliance}%</div>
              <div class="kpi-title">GPS Geofence Verified</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                ${!isPersonalMode ? '<th>Employee</th>' : ''}
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Branch Location</th>
                <th>Status</th>
                <th>GPS Geofence</th>
                <th>Shift Notes</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer">
            <div>Official Geofence-Verified Enterprise Attendance & Timesheet Record</div>
            <div>Page 1 of 1 • Certified System Generated Audit Document</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Single Record Printable Voucher
  const printSingleRecord = (rec: AttendanceRecord) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const [y, m, d] = rec.date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formattedDate = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : rec.date;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attendance Punch Voucher - ${rec.employeeName}</title>
          <style>
            @page { size: A5; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1917; padding: 20px; font-size: 13px; }
            .card { border: 2px solid #1c1917; border-radius: 12px; padding: 20px; background: #fafaf9; }
            h2 { margin: 0 0 4px 0; font-size: 18px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
            .item { background: white; padding: 10px; border-radius: 8px; border: 1px solid #e7e5e4; }
            .label { font-size: 10px; text-transform: uppercase; color: #78716c; font-weight: 700; }
            .val { font-size: 14px; font-weight: 700; margin-top: 2px; }
            .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 10px; color: #78716c; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>ATTENDANCE PUNCH VOUCHER</h2>
            <div style="font-size: 11px; color: #78716c;">Verified Geofence Clock Record</div>
            <div class="grid">
              <div class="item"><div class="label">Employee</div><div class="val">${rec.employeeName} (${rec.employeeCode})</div></div>
              <div class="item"><div class="label">Department</div><div class="val">${rec.department}</div></div>
              <div class="item"><div class="label">Date</div><div class="val">${formattedDate}</div></div>
              <div class="item"><div class="label">Status</div><div class="val" style="text-transform: uppercase;">${rec.status}</div></div>
              <div class="item"><div class="label">Clock-In</div><div class="val" style="color: #065f46;">${rec.checkInTime || '—'}</div></div>
              <div class="item"><div class="label">Clock-Out</div><div class="val">${rec.checkOutTime || (rec.status === 'active' ? 'Active' : '—')}</div></div>
              <div class="item"><div class="label">Total Duration</div><div class="val">${rec.totalHoursWorked ? `${rec.totalHoursWorked} hrs` : '—'}</div></div>
              <div class="item"><div class="label">Branch Location</div><div class="val">${rec.officeLocationName}</div></div>
            </div>
            ${rec.notes ? `<div class="item" style="margin-bottom: 12px;"><div class="label">Notes</div><div class="val" style="font-size: 12px; font-weight: normal;">${rec.notes}</div></div>` : ''}
            <div class="footer">
              <div>GPS Compliance: ${rec.isGeofenceValid ? '✓ Verified Inside Geofence' : '⚠ Outside Radius'}</div>
              <div>Generated: ${new Date().toLocaleString()}</div>
            </div>
          </div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  // Inspect target employee for the 30-day chart
  const employeeForChart = useMemo(() => {
    if (isPersonalMode) return currentEmployee;
    if (selectedEmployeeId !== 'all') {
      return employees.find((e) => e.id === selectedEmployeeId) || currentEmployee;
    }
    return currentEmployee;
  }, [isPersonalMode, currentEmployee, selectedEmployeeId, employees]);

  const isCheckedIn = !!todayRecord?.checkInTime && !todayRecord?.checkOutTime;

  return (
    <div id="attendance-main-view" className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 bg-[#ede4d6] border border-[#ded4c5] px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-stone-700" />
              <span>Attendance Management</span>
            </span>
            {isCurrentHR && (
              <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                HR / Admin Access
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            {isPersonalMode ? 'My Attendance & Shift Logs' : 'Company Attendance Master Logs'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 font-medium">
            {isPersonalMode
              ? `Review your historical punches, geofence validations, and work hours logged for ${currentEmployee.name}.`
              : 'Monitor enterprise attendance logs, real-time geofence punches, and shift hours across all company employees.'}
          </p>
        </div>

        {/* Action Controls on Top Right */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* HR Mode Switcher */}
          {isCurrentHR && (
            <div className="flex items-center bg-[#ede4d6] p-1 rounded-xl border border-[#ded4c5] shadow-2xs">
              <button
                type="button"
                id="hr-toggle-all-employees-btn"
                onClick={() => setHrViewMode('all_employees')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  hrViewMode === 'all_employees'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Employees</span>
              </button>
              <button
                type="button"
                id="hr-toggle-my-attendance-btn"
                onClick={() => setHrViewMode('my_attendance')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  hrViewMode === 'my_attendance'
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-700 hover:text-stone-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Attendance</span>
              </button>
            </div>
          )}

          {/* Export to PDF Report Button */}
          <button
            type="button"
            id="export-attendance-pdf-top-btn"
            onClick={exportToPDF}
            disabled={filteredRecords.length === 0}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-stone-100 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-300" />
            <span>Export PDF Report ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* Quick Punch / Live Status Banner for Personal Attendance */}
      {isPersonalMode && (
        <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                isCheckedIn ? 'bg-emerald-600 text-white' : 'bg-stone-900 text-amber-400'
              }`}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Today's Shift Status
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isCheckedIn
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : todayRecord?.checkOutTime
                      ? 'bg-stone-200 text-stone-800'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isCheckedIn
                    ? 'Shift Active (In Progress)'
                    : todayRecord?.checkOutTime
                    ? 'Shift Completed'
                    : 'Pending Check-In'}
                </span>
              </div>
              <p className="font-extrabold text-stone-900 text-base mt-0.5">
                {isCheckedIn ? (
                  <>
                    Checked in at <strong className="font-mono text-emerald-700">{todayRecord.checkInTime}</strong>{' '}
                    • {todayRecord.officeLocationName} • Expected Out:{' '}
                    <strong className="font-mono text-emerald-800">
                      {calculateExpectedOutTime(todayRecord.checkInTime, 8)}
                    </strong>
                  </>
                ) : todayRecord?.checkOutTime ? (
                  <>
                    Completed {todayRecord.totalHoursWorked ? `${todayRecord.totalHoursWorked} hrs` : ''} ({todayRecord.checkInTime} → {todayRecord.checkOutTime})
                  </>
                ) : (
                  'No punch recorded yet today. Use the mobile app or web terminal below.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              id="toggle-web-terminal-btn"
              onClick={() => setShowWebTerminal(!showWebTerminal)}
              className="px-3 py-1.5 bg-[#efe8de] hover:bg-[#e4dbcd] border border-[#ded4c5] text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-stone-700" />
              <span>{showWebTerminal ? 'Hide Punch Terminal' : 'Web Punch Terminal'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Expandable Web Punch Terminal */}
      {isPersonalMode && showWebTerminal && (
        <div className="bg-[#fbf9f5] border border-amber-200/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Web Geofence Punch Terminal</h3>
            </div>
            <span className="text-xs font-mono font-bold text-stone-600 bg-white px-2 py-0.5 rounded border border-[#ded4c5]">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                  geofenceResult.isInAllowedGeofence
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                }`}
              >
                {geofenceResult.isInAllowedGeofence ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {geofenceResult.isInAllowedGeofence
                      ? `Inside Geofence: ${geofenceResult.nearestLocation?.name}`
                      : 'Outside Geofence Perimeter'}
                  </p>
                  <p className="text-[11px] text-stone-600 mt-0.5">{geofenceResult.statusMessage}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Punch Notes (Optional)
                </label>
                <input
                  type="text"
                  value={punchNotes}
                  onChange={(e) => setPunchNotes(e.target.value)}
                  placeholder="e.g. Arrived on time, morning standup"
                  className="w-full px-3 py-2 bg-white border border-[#ded4c5] rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-800"
                />
              </div>

              {/* Punch Feedback Notification Card */}
              <PunchFeedbackCard
                feedback={punchFeedback}
                onDismiss={() => setPunchFeedback(null)}
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  id="web-punch-check-in-btn"
                  onClick={handleWebCheckIn}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Punch In ({todayRecord?.checkInTime ? `First: ${todayRecord.checkInTime}` : 'Check-In'})</span>
                </button>

                <button
                  type="button"
                  id="web-punch-check-out-btn"
                  onClick={handleWebCheckOut}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer bg-rose-700 hover:bg-rose-800 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-200" />
                  <span>Punch Out ({todayRecord?.checkOutTime ? `Last: ${todayRecord.checkOutTime}` : 'Check-Out'})</span>
                </button>
              </div>
            </div>

            {/* Map Mini Preview */}
            <div className="rounded-xl overflow-hidden border border-[#ded4c5]">
              <GeofenceMap
                currentCoords={currentCoords}
                offices={allowedOffices}
                nearestOffice={geofenceResult.nearestLocation}
                isInsideGeofence={geofenceResult.isInAllowedGeofence}
              />
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
            Total Logs
          </span>
          <div className="text-2xl font-extrabold text-stone-900 font-mono mt-1">
            {kpiStats.totalPunches}
          </div>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Filtered records</span>
        </div>

        <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
            {isPersonalMode ? 'Total Hours' : 'Hours Logged'}
          </span>
          <div className="text-2xl font-extrabold text-stone-900 font-mono mt-1">
            {kpiStats.totalHours} <span className="text-xs font-sans text-stone-500 font-normal">hrs</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
            Avg {kpiStats.avgHours}h / shift
          </span>
        </div>

        <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
            On-Duty Now
          </span>
          <div className="text-2xl font-extrabold text-blue-700 font-mono mt-1">
            {kpiStats.activeToday}
          </div>
          <span className="text-[10px] text-blue-800 font-semibold mt-0.5 block">
            Active in progress
          </span>
        </div>

        <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
            On-Time Rate
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
            {kpiStats.onTimeRate}%
          </div>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Standard arrival</span>
        </div>

        <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
            Late Entries
          </span>
          <div className="text-2xl font-extrabold text-amber-700 font-mono mt-1">
            {kpiStats.lateCount}
          </div>
          <span className="text-[10px] text-amber-800 font-semibold mt-0.5 block">
            &gt; 15m past start
          </span>
        </div>

        <div className="bg-white border border-[#ded4c5] rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide block">
            Geofence Valid
          </span>
          <div className="text-2xl font-extrabold text-emerald-700 font-mono mt-1">
            {kpiStats.geofenceCompliance}%
          </div>
          <span className="text-[10px] text-stone-500 mt-0.5 block">Perimeter verified</span>
        </div>
      </div>

      {/* 30-Day Work Hours Visualization Bar Chart */}
      <WorkHoursBarChart
        employee={employeeForChart}
        attendanceRecords={attendanceRecords}
      />

      {/* Filter Toolbar Card */}
      <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#ded4c5] pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-extrabold text-stone-900">Attendance Filter & Search</h3>
          </div>

          {/* Time Range Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#efe8de] p-1 rounded-xl border border-[#ded4c5] text-xs">
            <button
              type="button"
              onClick={() => {
                setTimeRange('today');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === 'today' && !customStartDate && !customEndDate
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeRange('this_week');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === 'this_week' && !customStartDate && !customEndDate
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeRange('this_month');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === 'this_month' && !customStartDate && !customEndDate
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeRange('last_30_days');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === 'last_30_days' && !customStartDate && !customEndDate
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Past 30 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setTimeRange('all');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                timeRange === 'all' && !customStartDate && !customEndDate
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All
            </button>
          </div>
        </div>

        {/* Custom Date Range & Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isPersonalMode ? 'Search notes, office...' : 'Search name, code, notes...'}
              className="w-full pl-9 pr-3 py-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-800"
            />
          </div>

          {/* From Date */}
          <div className="flex items-center gap-1.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl px-2.5 py-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] font-bold uppercase text-stone-400 leading-none">From Date</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-transparent text-xs text-stone-800 font-semibold focus:outline-none p-0 cursor-pointer"
              />
            </div>
            {customStartDate && (
              <button
                type="button"
                onClick={() => setCustomStartDate('')}
                className="text-stone-400 hover:text-stone-700 p-0.5"
                title="Clear from date"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl px-2.5 py-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[9px] font-bold uppercase text-stone-400 leading-none">To Date</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-transparent text-xs text-stone-800 font-semibold focus:outline-none p-0 cursor-pointer"
              />
            </div>
            {customEndDate && (
              <button
                type="button"
                onClick={() => setCustomEndDate('')}
                className="text-stone-400 hover:text-stone-700 p-0.5"
                title="Clear to date"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* HR Employee Selector / Branch Selector */}
          {!isPersonalMode ? (
            <div>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-800 cursor-pointer"
              >
                <option value="all">All Employees ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-800 cursor-pointer"
              >
                <option value="all">All Office Branches</option>
                {officeLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Selector */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl text-xs text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-stone-800 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="on_time">On-Time / Completed</option>
              <option value="active">Active On Duty</option>
              <option value="late">Late Arrival</option>
              <option value="half_day">Half-Day / Permission</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicator & Reset */}
        {(customStartDate || customEndDate || searchQuery || selectedStatus !== 'all' || selectedLocationId !== 'all' || (!isPersonalMode && (selectedEmployeeId !== 'all' || selectedDepartment !== 'all'))) && (
          <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#ded4c5] text-xs">
            <span className="text-stone-500 font-medium">
              Active filters applied • Showing <strong>{filteredRecords.length}</strong> matching records
            </span>
            <button
              type="button"
              onClick={() => {
                setTimeRange('last_30_days');
                setCustomStartDate('');
                setCustomEndDate('');
                setSelectedEmployeeId('all');
                setSelectedDepartment('all');
                setSelectedLocationId('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-stone-700 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 text-stone-500" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Attendance Logs Data Table */}
      <div className="bg-white border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 sm:p-5 border-b border-[#ded4c5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-extrabold text-stone-900">
              Attendance Records Log
            </h3>
            <span className="text-xs text-stone-500 font-mono">
              ({filteredRecords.length} records)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="export-attendance-pdf-table-btn"
              onClick={exportToPDF}
              disabled={filteredRecords.length === 0}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-stone-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-300" />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-stone-900">No Attendance Records Found</h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              There are no attendance punches matching your current filters or selected date range.
            </p>
            <button
              type="button"
              onClick={() => {
                setTimeRange('all');
                setSelectedEmployeeId('all');
                setSelectedDepartment('all');
                setSelectedLocationId('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-stone-900 underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fbf9f5] border-b border-[#ded4c5] text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  {!isPersonalMode && <th className="py-3 px-4">Employee</th>}
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Check-In (GPS)</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Office Branch</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ded4c5]">
                {filteredRecords.map((record) => {
                  const isRecordActive = record.status === 'active';
                  const isLate = record.status === 'late';
                  const isHalfDay = record.status === 'half_day';

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-[#faf7f2] transition-colors group cursor-pointer"
                      onClick={() => setInspectingRecord(record)}
                    >
                      {/* Employee Column (for HR view) */}
                      {!isPersonalMode && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-stone-200 border border-stone-300 flex items-center justify-center font-bold text-stone-800 text-[11px] shrink-0">
                              {record.employeeName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900">{record.employeeName}</div>
                              <div className="text-[10px] text-stone-500 font-mono">
                                {record.employeeCode} • {record.department}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium text-stone-900 whitespace-nowrap">
                        <div>
                          {new Date(record.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono">{record.date}</div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-stone-900">
                          <Clock className="w-3.5 h-3.5 text-stone-500" />
                          <span>{record.checkInTime || '--:--'}</span>
                        </div>
                        {record.distanceToOfficeMeters !== undefined && (
                          <div className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>±{record.distanceToOfficeMeters}m from geofence</span>
                          </div>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        {record.checkOutTime ? (
                          <span className="font-bold text-stone-900">{record.checkOutTime}</span>
                        ) : isRecordActive ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                            Shift In Progress
                          </span>
                        ) : (
                          <span className="text-stone-400">--:--</span>
                        )}
                      </td>

                      {/* Hours */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-stone-900">
                          {record.totalHoursWorked ? `${record.totalHoursWorked} hrs` : isRecordActive ? 'Active' : '--'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${
                            isRecordActive
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : isLate
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : isHalfDay
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}
                        >
                          {isRecordActive ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                              <span>On Duty</span>
                            </>
                          ) : isLate ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>Late Arrival</span>
                            </>
                          ) : isHalfDay ? (
                            <>
                              <span>Half-Day</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span>On-Time</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Office Branch */}
                      <td className="py-3.5 px-4 text-stone-700 max-w-44 truncate">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{record.officeLocationName}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingRecord(record);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-[#ded4c5] text-stone-700 rounded-lg text-[11px] font-bold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-stone-500" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Details Modal / Drawer */}
      {inspectingRecord && (
        <div
          id="attendance-record-modal-backdrop"
          onClick={() => setInspectingRecord(null)}
          className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            id="attendance-record-modal-content"
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-[#ded4c5] rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-base">
                    Attendance Punch Details
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    {inspectingRecord.employeeName} ({inspectingRecord.employeeCode})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Punch Timestamps */}
            <div className="grid grid-cols-2 gap-3 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl p-3.5 text-xs">
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Date</span>
                <span className="font-bold text-stone-900 font-mono text-sm">{inspectingRecord.date}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Department</span>
                <span className="font-bold text-stone-900">{inspectingRecord.department}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Check-In</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  {inspectingRecord.checkInTime || '--:--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Check-Out</span>
                <span className="font-bold font-mono text-stone-900 text-sm">
                  {inspectingRecord.checkOutTime || (inspectingRecord.status === 'active' ? 'Active Shift' : '--:--')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Total Shift Hours</span>
                <span className="font-bold font-mono text-amber-900 text-sm">
                  {inspectingRecord.totalHoursWorked ? `${inspectingRecord.totalHoursWorked} hrs` : '--'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Status</span>
                <span className="font-bold uppercase text-[11px] text-stone-800">
                  {inspectingRecord.status}
                </span>
              </div>
            </div>

            {/* Geofence & GPS Details */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-700" />
                <span>Geofence & Location Verification</span>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Authorized Branch:</span>
                  <strong className="text-stone-900">{inspectingRecord.officeLocationName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Geofence Compliance:</span>
                  <span className="font-semibold text-emerald-700">
                    {inspectingRecord.isGeofenceValid ? 'Verified Inside Perimeter' : 'Outside Perimeter'}
                  </span>
                </div>
                {inspectingRecord.distanceToOfficeMeters !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Distance to Office Center:</span>
                    <strong className="font-mono text-stone-800">
                      {inspectingRecord.distanceToOfficeMeters} meters
                    </strong>
                  </div>
                )}
                {inspectingRecord.checkInCoords && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Punch GPS Coordinates:</span>
                    <span className="font-mono text-stone-600">
                      {inspectingRecord.checkInCoords.latitude.toFixed(5)}, {inspectingRecord.checkInCoords.longitude.toFixed(5)}
                    </span>
                  </div>
                )}
                {inspectingRecord.deviceInfo && (
                  <div className="flex items-center justify-between border-t border-stone-200 pt-1.5 mt-1.5">
                    <span className="text-stone-500">Device Platform:</span>
                    <span className="text-stone-700">{inspectingRecord.deviceInfo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {inspectingRecord.notes && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-stone-900">Notes / Reason:</span>
                <p className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl text-stone-700 text-[11px]">
                  {inspectingRecord.notes}
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                id="print-single-record-voucher-btn"
                onClick={() => printSingleRecord(inspectingRecord)}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-[#ded4c5] text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-stone-600" />
                <span>Print Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
