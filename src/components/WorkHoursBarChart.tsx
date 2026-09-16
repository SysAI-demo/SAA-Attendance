import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { AttendanceRecord, Employee } from '../types';
import {
  Clock,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Flame,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface WorkHoursBarChartProps {
  employee: Employee;
  attendanceRecords: AttendanceRecord[];
  onlyDailyAverage?: boolean;
  title?: string;
  subtitle?: string;
}

type TimeRangeFilter = '30d' | '14d' | '7d' | 'workdays';

interface DailyHoursData {
  date: string;
  dayLabel: string;
  shortLabel: string;
  weekday: string;
  isWeekend: boolean;
  hours: number;
  rawHours: number;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'weekend' | 'leave' | 'active_today';
  statusLabel: string;
  checkInTime?: string;
  checkOutTime?: string;
  locationName?: string;
  notes?: string;
  record?: AttendanceRecord;
}

export const WorkHoursBarChart: React.FC<WorkHoursBarChartProps> = ({
  employee,
  attendanceRecords,
  onlyDailyAverage = false,
  title = 'Attendance History',
  subtitle = 'Hours logged via GPS geofenced terminals over the selected period',
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('30d');
  const [selectedDay, setSelectedDay] = useState<DailyHoursData | null>(null);

  // Generate continuous past 30 days dataset for the current employee
  const full30DaysData = useMemo<DailyHoursData[]>(() => {
    const data: DailyHoursData[] = [];
    const today = new Date();

    // Map existing employee records by date string YYYY-MM-DD
    const empId = employee?.id;
    const empRecords = Array.isArray(attendanceRecords) && empId
      ? attendanceRecords.filter((r) => r.employeeId === empId)
      : [];
    const recordByDate = new Map<string, AttendanceRecord>();
    empRecords.forEach((rec) => {
      recordByDate.set(rec.date, rec);
    });

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const weekdayShort = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayNum = d.getDate();
      const monthShort = d.toLocaleDateString(undefined, { month: 'short' });
      const isWeekend = d.getDay() === 0 || d.getDay() === 6; // Sunday or Saturday

      const record = recordByDate.get(dateStr);
      let hours = 0;
      let status: DailyHoursData['status'] = isWeekend ? 'weekend' : 'absent';
      let statusLabel = isWeekend ? 'Weekend Off' : 'No Punch Logged';

      if (record) {
        if (record.totalHoursWorked && record.totalHoursWorked > 0) {
          hours = Number(record.totalHoursWorked);
        } else if (typeof record.checkInTime === 'string' && typeof record.checkOutTime === 'string') {
          const inParts = record.checkInTime.split(':').map(Number);
          const outParts = record.checkOutTime.split(':').map(Number);
          if (inParts.length >= 2 && outParts.length >= 2 && !isNaN(inParts[0]) && !isNaN(outParts[0])) {
            const diffHours = (outParts[0] + (outParts[1] || 0) / 60) - (inParts[0] + (inParts[1] || 0) / 60);
            hours = Math.max(0, Math.round(diffHours * 10) / 10);
          }
        } else if (typeof record.checkInTime === 'string' && i === 0) {
          // Today active in progress
          const inParts = record.checkInTime.split(':').map(Number);
          if (inParts.length >= 2 && !isNaN(inParts[0])) {
            const nowH = today.getHours() + today.getMinutes() / 60;
            const diffHours = Math.max(0, nowH - (inParts[0] + (inParts[1] || 0) / 60));
            hours = Math.round(diffHours * 10) / 10;
            status = 'active_today';
            statusLabel = 'Shift In Progress';
          }
        }

        if (status !== 'active_today') {
          if (record.status === 'late') {
            status = 'late';
            statusLabel = 'Late Entry';
          } else if (hours < 5 && hours > 0) {
            status = 'half_day';
            statusLabel = 'Half Day / Permission';
          } else if (hours > 0) {
            status = 'present';
            statusLabel = 'Completed Shift';
          }
        }
      }

      data.push({
        date: dateStr,
        dayLabel: `${monthShort} ${dayNum}`,
        shortLabel: i % 4 === 0 || i === 0 || i === 29 ? `${monthShort} ${dayNum}` : `${dayNum}`,
        weekday: weekdayShort,
        isWeekend,
        hours: Math.round(hours * 10) / 10,
        rawHours: hours,
        status,
        statusLabel,
        checkInTime: record?.checkInTime,
        checkOutTime: record?.checkOutTime,
        locationName: record?.officeLocationName,
        notes: record?.notes,
        record,
      });
    }

    return data;
  }, [employee?.id, attendanceRecords]);

  // Filtered dataset based on selected time range
  const filteredData = useMemo<DailyHoursData[]>(() => {
    if (timeRange === '7d') {
      return full30DaysData.slice(-7);
    }
    if (timeRange === '14d') {
      return full30DaysData.slice(-14);
    }
    if (timeRange === 'workdays') {
      return full30DaysData.filter((d) => !d.isWeekend);
    }
    return full30DaysData;
  }, [full30DaysData, timeRange]);

  // Performance & Aggregate Statistics over the last 30 days
  const metrics = useMemo(() => {
    const workdays = full30DaysData.filter((d) => !d.isWeekend);
    const totalHours = full30DaysData.reduce((acc, curr) => acc + curr.hours, 0);
    const presentDays = full30DaysData.filter((d) => d.hours > 0).length;
    const avgHoursPerPresentDay = presentDays > 0 ? totalHours / presentDays : 0;
    const standardTargetHours = workdays.length * 8.0;
    const overtimeHours = Math.max(0, totalHours - standardTargetHours);

    // Longest streak of meeting/exceeding 8 hours
    let currentStreak = 0;
    let maxStreak = 0;
    workdays.forEach((d) => {
      if (d.hours >= 7.8) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    return {
      totalHours: Math.round(totalHours * 10) / 10,
      avgHours: Math.round(avgHoursPerPresentDay * 10) / 10,
      presentDays,
      totalWorkdays: workdays.length,
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      streak: maxStreak,
      complianceRate: workdays.length > 0 ? Math.round((presentDays / workdays.length) * 100) : 100,
    };
  }, [full30DaysData]);

  // Color generator for each bar
  const getBarColor = (d: DailyHoursData): string => {
    if (d.status === 'active_today') return '#3b82f6'; // vibrant blue for active shift today
    if (d.hours >= 8.5) return '#059669'; // deep emerald for overtime / strong shift
    if (d.hours >= 7.8) return '#10b981'; // emerald for standard compliant 8h shift
    if (d.hours > 0 && d.hours < 7.8) return '#f59e0b'; // amber for partial / half-day
    if (d.isWeekend) return '#e7e5e4'; // muted warm neutral for weekends
    return '#fca5a5'; // light rose for missed weekday shift
  };

  return (
    <div className="bg-white border border-[#ded4c5] rounded-2xl p-3.5 sm:p-5 space-y-3.5 shadow-2xs">
      {/* Header with Title & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#ded4c5]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 truncate">
              {title}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Range Selector Pill Group */}
        <div className="flex items-center bg-[#efe8de] p-0.5 rounded-xl border border-[#ded4c5] w-full sm:w-auto justify-between sm:justify-start text-[11px] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTimeRange('30d')}
            className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer text-center flex-1 sm:flex-initial ${
              timeRange === '30d'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            30 Days
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('workdays')}
            className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer text-center flex-1 sm:flex-initial ${
              timeRange === 'workdays'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Workdays
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('14d')}
            className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer text-center flex-1 sm:flex-initial ${
              timeRange === '14d'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            14D
          </button>
          <button
            type="button"
            onClick={() => setTimeRange('7d')}
            className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer text-center flex-1 sm:flex-initial ${
              timeRange === '7d'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            7D
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {onlyDailyAverage ? (
        <div className="bg-[#fbf9f5] border border-[#ded4c5] rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-bold text-stone-500 block">
                Daily Average
              </span>
              <div className="text-xl font-extrabold text-stone-900 font-mono tracking-tight flex items-baseline gap-1.5">
                <span>{metrics.avgHours}</span>
                <span className="text-xs font-sans text-stone-500 font-normal">hrs / workday</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border inline-block ${
                metrics.avgHours >= 8.0
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-stone-100 text-stone-700 border-stone-300'
              }`}
            >
              {metrics.avgHours >= 8.0 ? 'Optimal pace' : 'Standard shift'}
            </span>
            <div className="text-[10px] text-stone-400 font-medium mt-1">
              Active days: {metrics.presentDays} of {metrics.totalWorkdays}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="bg-[#fbf9f5] border border-[#ded4c5] rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1 font-medium">
              <span>Total Logged</span>
              <Clock className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="text-lg font-extrabold text-stone-900 font-mono tracking-tight">
              {metrics.totalHours} <span className="text-xs font-sans text-stone-500 font-normal">hrs</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>Target: 176 hrs</span>
            </div>
          </div>

          <div className="bg-[#fbf9f5] border border-[#ded4c5] rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1 font-medium">
              <span>Daily Average</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-extrabold text-stone-900 font-mono tracking-tight">
              {metrics.avgHours} <span className="text-xs font-sans text-stone-500 font-normal">h/day</span>
            </div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">
              {metrics.avgHours >= 8.0 ? 'Optimal pace' : 'Standard shift'}
            </div>
          </div>

          <div className="bg-[#fbf9f5] border border-[#ded4c5] rounded-xl p-3">
            <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1 font-medium">
              <span>Attendance</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="text-lg font-extrabold text-stone-900 font-mono tracking-tight">
              {metrics.presentDays} <span className="text-xs font-sans text-stone-500 font-normal">/ {metrics.totalWorkdays} d</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {metrics.complianceRate}% attendance
            </div>
          </div>
        </div>
      )}

      {/* Recharts Bar Chart Container */}
      <div className="relative pt-1">
        <div className="w-full h-48 sm:h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 10, right: 4, left: -24, bottom: 0 }}
              onClick={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0 && state.activePayload[0]?.payload) {
                  setSelectedDay(state.activePayload[0].payload as DailyHoursData);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis
                dataKey="shortLabel"
                tickLine={false}
                axisLine={{ stroke: '#ded4c5' }}
                tick={{ fontSize: 10, fill: '#78716c' }}
                interval={filteredData.length > 15 ? 2 : 0}
              />
              <YAxis
                domain={[0, 11]}
                ticks={[0, 4, 8, 10]}
                tickLine={false}
                axisLine={{ stroke: '#ded4c5' }}
                tick={{ fontSize: 10, fill: '#78716c' }}
                unit="h"
              />
              <ReferenceLine
                y={8}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: '8h Target',
                  fill: '#b45309',
                  fontSize: 9,
                  position: 'insideTopRight',
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(239, 232, 222, 0.45)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]?.payload) {
                    const d = payload[0].payload as DailyHoursData;
                    return (
                      <div className="bg-stone-900 text-stone-100 p-2.5 rounded-xl text-xs shadow-xl border border-stone-700 min-w-44 space-y-1.5 pointer-events-none z-50">
                        <div className="flex items-center justify-between border-b border-stone-800 pb-1">
                          <span className="font-bold text-stone-100">
                            {d.weekday}, {d.dayLabel}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              d.hours >= 8
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : d.hours > 0
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {d.statusLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Total Hours:</span>
                          <span className="font-mono font-bold text-sm text-amber-400">
                            {d.hours > 0 ? `${d.hours} hrs` : '0 hrs (Off)'}
                          </span>
                        </div>

                        {d.checkInTime && (
                          <div className="text-[11px] text-stone-300 flex items-center justify-between pt-0.5">
                            <span className="text-stone-400">Punches:</span>
                            <span className="font-mono">
                              {d.checkInTime} → {d.checkOutTime || 'Active'}
                            </span>
                          </div>
                        )}

                        {d.locationName && (
                          <div className="text-[10px] text-stone-400 truncate pt-0.5 border-t border-stone-800">
                            📍 {d.locationName}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {filteredData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry)}
                    className="transition-all hover:opacity-80 cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3 text-[11px] text-stone-600 border-t border-[#ded4c5]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" />
            <span>&gt; 8h Full Shift</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#f59e0b]" />
            <span>&lt; 8h Partial / Permission</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#3b82f6]" />
            <span>Active Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#e7e5e4]" />
            <span>Weekend Off</span>
          </div>
        </div>
      </div>

      {/* Selected Day Drill-down Inspector */}
      {selectedDay && (
        <div className="p-3.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-stone-900">
                {selectedDay.weekday}, {selectedDay.dayLabel} ({selectedDay.date})
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedDay.hours >= 8
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : selectedDay.hours > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-stone-200 text-stone-800'
                }`}
              >
                {selectedDay.statusLabel}
              </span>
            </div>
            <div className="text-stone-600 text-[11px]">
              {selectedDay.checkInTime ? (
                <>
                  In: <strong className="font-mono text-stone-900">{selectedDay.checkInTime}</strong> • Out:{' '}
                  <strong className="font-mono text-stone-900">{selectedDay.checkOutTime || 'Shift in progress'}</strong>
                  {selectedDay.locationName && ` • ${selectedDay.locationName}`}
                </>
              ) : selectedDay.isWeekend ? (
                'Scheduled weekly rest period'
              ) : (
                'No attendance punch logged on this date'
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] text-stone-500 block">Total Shift</span>
              <span className="font-mono font-extrabold text-stone-900 text-sm">
                {selectedDay.hours} hrs
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 px-2 py-1 bg-white border border-[#ded4c5] rounded-lg cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
