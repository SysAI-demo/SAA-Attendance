import React, { useState } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { ShiftTiming, WorkScheduleDefinition } from '../../types';
import {
  CalendarClock,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Check,
  AlertCircle,
  X,
  Sparkles,
  Sun,
  Moon,
  Coffee,
  Calendar,
  Users,
  UserCheck,
  Layers,
} from 'lucide-react';

const PRESET_COLORS = [
  '#0284c7', // Sky
  '#059669', // Emerald
  '#d97706', // Amber
  '#4f46e5', // Indigo
  '#7c3aed', // Purple
  '#be123c', // Rose
];

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
] as const;

export const DefineWorkSchedule: React.FC = () => {
  const {
    workSchedule,
    updateWorkSchedule,
    addShift,
    updateShift,
    deleteShift,
    employees = [],
    updateEmployeeShift,
  } = useAttendance();

  const safeWorkSchedule = workSchedule || {
    id: 'sched_main',
    name: 'Standard Corporate Schedule',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    saturdayRule: 'alternate_off' as const,
    shifts: [],
    defaultShiftId: 'shift_general',
    weeklyWorkHours: 40,
  };
  const workingDays = safeWorkSchedule.workingDays || [];
  const shifts = safeWorkSchedule.shifts || [];
  const safeEmployees = employees || [];

  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftTiming | null>(null);
  const [deleteConfirmShiftId, setDeleteConfirmShiftId] = useState<string | null>(null);

  // Group Shift Assignment State
  const [assignModalShift, setAssignModalShift] = useState<ShiftTiming | null>(null);
  const [assignScope, setAssignScope] = useState<'all' | 'department' | 'individual'>('department');
  const [selectedDept, setSelectedDept] = useState<string>('Engineering');
  const [selectedEmpIdsForShift, setSelectedEmpIdsForShift] = useState<string[]>([]);
  const [shiftToastMsg, setShiftToastMsg] = useState<string | null>(null);

  // Shift form data
  const [shiftFormData, setShiftFormData] = useState<Omit<ShiftTiming, 'id'>>({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    breakDurationMinutes: 60,
    netWorkHours: 8.0,
    isFlexible: false,
    color: '#0284c7',
    applicableDepartments: ['all'],
    isActive: true,
  });

  const [deptInput, setDeptInput] = useState('');

  // Operating Days Toggle
  const handleToggleDay = (day: typeof DAYS_OF_WEEK[number]['id']) => {
    let updatedDays = [...workingDays];
    if (updatedDays.includes(day)) {
      if (updatedDays.length > 1) {
        updatedDays = updatedDays.filter((d) => d !== day);
      }
    } else {
      updatedDays.push(day);
    }
    const weeklyHours = updatedDays.length * 8;
    updateWorkSchedule({
      ...safeWorkSchedule,
      workingDays: updatedDays,
      weeklyWorkHours: weeklyHours,
    });
  };

  const handleSetDefaultShift = (shiftId: string) => {
    updateWorkSchedule({
      ...safeWorkSchedule,
      defaultShiftId: shiftId,
    });
  };

  const handleOpenAddShift = () => {
    setShiftFormData({
      name: '',
      code: '',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      netWorkHours: 8.0,
      isFlexible: false,
      color: PRESET_COLORS[shifts.length % PRESET_COLORS.length] || '#0284c7',
      applicableDepartments: ['all'],
      isActive: true,
    });
    setDeptInput('');
    setIsAddShiftOpen(true);
  };

  const handleOpenEditShift = (shift: ShiftTiming) => {
    setEditingShift(shift);
    setShiftFormData({
      name: shift.name,
      code: shift.code,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDurationMinutes: shift.breakDurationMinutes,
      netWorkHours: shift.netWorkHours,
      isFlexible: shift.isFlexible,
      coreHoursStart: shift.coreHoursStart,
      coreHoursEnd: shift.coreHoursEnd,
      color: shift.color,
      applicableDepartments: [...shift.applicableDepartments],
      isActive: shift.isActive,
    });
    setDeptInput('');
  };

  const handleAddDept = () => {
    if (!deptInput.trim()) return;
    let current = shiftFormData.applicableDepartments.filter((d) => d !== 'all');
    if (!current.includes(deptInput.trim())) {
      current.push(deptInput.trim());
    }
    setShiftFormData({ ...shiftFormData, applicableDepartments: current });
    setDeptInput('');
  };

  const handleRemoveDept = (dept: string) => {
    const current = shiftFormData.applicableDepartments.filter((d) => d !== dept);
    setShiftFormData({
      ...shiftFormData,
      applicableDepartments: current.length === 0 ? ['all'] : current,
    });
  };

  const handleSaveAddShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftFormData.name.trim() || !shiftFormData.code.trim()) return;
    addShift({
      ...shiftFormData,
      code: shiftFormData.code.toUpperCase().trim(),
      name: shiftFormData.name.trim(),
    });
    setIsAddShiftOpen(false);
  };

  const handleSaveEditShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift || !shiftFormData.name.trim() || !shiftFormData.code.trim()) return;
    updateShift({
      ...editingShift,
      ...shiftFormData,
      code: shiftFormData.code.toUpperCase().trim(),
      name: shiftFormData.name.trim(),
    });
    setEditingShift(null);
  };

  const handleToggleShiftActive = (shift: ShiftTiming) => {
    updateShift({
      ...shift,
      isActive: !shift.isActive,
    });
  };

  return (
    <div id="define-work-schedule-module" className="space-y-6">
      {/* Operating Schedule & Weekly Days Section */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 border-b border-[#ded4c5] pb-3">
          <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">Weekly Operating Days & Policies</h3>
            <p className="text-xs text-stone-500">Corporate work week definition and expected weekly hours</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Working Days Selector */}
          <div className="bg-white rounded-2xl p-4 border border-[#ded4c5] space-y-2.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800">Standard Working Days</label>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                {workingDays.length} Days Active
              </span>
            </div>
            <p className="text-[11px] text-stone-500">Click day tokens to toggle business days and mandatory weekly offs.</p>

            <div className="flex flex-wrap gap-2 pt-1">
              {DAYS_OF_WEEK.map((d) => {
                const isActive = workingDays.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleToggleDay(d.id)}
                    className={`w-11 h-11 rounded-2xl font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-stone-900 text-white shadow-xs scale-105'
                        : 'bg-[#f8f5ef] text-stone-400 border border-[#ded4c5] hover:bg-[#ede4d6]'
                    }`}
                  >
                    <span>{d.label}</span>
                    <span className="text-[9px] font-normal opacity-80">{isActive ? 'Work' : 'Off'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weekly Hours Stat */}
          <div className="bg-white rounded-2xl p-4 border border-[#ded4c5] space-y-2 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Standard Work Week</span>
              <p className="text-3xl font-black text-stone-900 mt-1">
                {safeWorkSchedule.weeklyWorkHours} <span className="text-sm font-semibold text-stone-500">hrs/week</span>
              </p>
            </div>
            <p className="text-[11px] text-stone-500">
              Calculated based on {workingDays.length} working days @ standard 8.0h shift duration.
            </p>
          </div>
        </div>
      </div>

      {/* Shifts Definition Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f8f5ef] border border-[#ded4c5] p-4 rounded-2xl">
          <div>
            <h3 className="font-bold text-stone-900 text-base">Defined Work Shifts</h3>
            <p className="text-xs text-stone-500">Configured shift timings, meal breaks, and department rosters</p>
          </div>

          <button
            type="button"
            id="add-shift-btn"
            onClick={handleOpenAddShift}
            className="bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Work Shift</span>
          </button>
        </div>

        {/* Shift List View */}
        <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
          {/* Table / List Header for Desktop */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-3 bg-[#ede4d6] border-b border-[#ded4c5] text-[11px] font-bold text-stone-700 uppercase tracking-wider items-center">
            <div className="col-span-3">Shift Code & Name</div>
            <div className="col-span-2">Timing & Net Hours</div>
            <div className="col-span-2">Meal Break & Flexibility</div>
            <div className="col-span-3">Applicable Departments</div>
            <div className="col-span-2 text-right">Status & Actions</div>
          </div>

          {/* List Rows */}
          <div className="divide-y divide-[#ded4c5]">
            {shifts.map((shift) => {
              const isDefault = safeWorkSchedule.defaultShiftId === shift.id;
              return (
                <div
                  key={shift.id}
                  className={`p-4 sm:p-5 transition-colors hover:bg-[#f1ebe0] ${
                    isDefault ? 'bg-amber-50/20' : 'bg-transparent'
                  } ${!shift.isActive ? 'opacity-60 bg-stone-100/60' : ''}`}
                >
                  {/* Desktop Row View */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 items-center">
                    {/* Col 1: Shift Code & Name */}
                    <div className="col-span-3 flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0"
                        style={{ backgroundColor: shift.color }}
                      >
                        {shift.code}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-stone-900 text-sm truncate">{shift.name}</h4>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isDefault ? (
                            <span className="text-[9px] font-bold uppercase bg-stone-900 text-white px-2 py-0.2 rounded-md">
                              Primary Default
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultShift(shift.id)}
                              className="text-[10px] text-stone-500 hover:text-stone-900 font-semibold underline cursor-pointer"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Timing & Net Hours */}
                    <div className="col-span-2 space-y-0.5">
                      <div className="flex items-center gap-1 text-stone-900 font-mono font-bold text-xs">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        <span>{shift.startTime} – {shift.endTime}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        Net: <span className="font-bold text-stone-800">{shift.netWorkHours} hrs</span>
                      </p>
                    </div>

                    {/* Col 3: Meal Break & Flexibility */}
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-stone-700">
                        Break: <span className="font-semibold">{shift.breakDurationMinutes} mins</span>
                      </p>
                      {shift.isFlexible && shift.coreHoursStart ? (
                        <span className="inline-block bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-medium px-1.5 py-0.2 rounded">
                          Core: {shift.coreHoursStart}–{shift.coreHoursEnd}
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400">Fixed Shift</span>
                      )}
                    </div>

                    {/* Col 4: Applicable Departments */}
                    <div className="col-span-3">
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {(shift.applicableDepartments || []).includes('all') ? (
                          <span className="bg-white border border-[#ded4c5] text-stone-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                            All Company Departments
                          </span>
                        ) : (
                          (shift.applicableDepartments || []).map((dept) => (
                            <span
                              key={dept}
                              className="bg-white border border-[#ded4c5] text-stone-800 text-[10px] font-medium px-2 py-0.5 rounded-md truncate max-w-[130px]"
                              title={dept}
                            >
                              {dept}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Col 5: Status Toggle & Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                      {(() => {
                        const assignedCount = employees.filter(
                          (e) => e.shiftTimingId === shift.id || (!e.shiftTimingId && isDefault)
                        ).length;
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignModalShift(shift);
                              setAssignScope('department');
                              setSelectedDept('Engineering');
                              setSelectedEmpIdsForShift([]);
                            }}
                            className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Assign this schedule to individual employee or department group"
                          >
                            <Users className="w-3 h-3 text-stone-300" />
                            <span>Assign ({assignedCount})</span>
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => handleToggleShiftActive(shift)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          shift.isActive
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                            : 'text-stone-500 bg-stone-200 hover:bg-stone-300 border border-stone-300'
                        }`}
                        title={shift.isActive ? 'Active (Click to disable)' : 'Inactive (Click to enable)'}
                      >
                        {shift.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{shift.isActive ? 'Active' : 'Disabled'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(shift)}
                        className="p-1.5 bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer transition-colors"
                        title="Edit Shift"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmShiftId(shift.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg cursor-pointer transition-colors"
                          title="Delete Shift"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mobile / Tablet Card-Row View */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0"
                          style={{ backgroundColor: shift.color }}
                        >
                          {shift.code}
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm leading-snug">{shift.name}</h4>
                          {isDefault && (
                            <span className="text-[9px] font-bold uppercase bg-stone-900 text-white px-2 py-0.2 rounded-md inline-block mt-0.5">
                              Primary Default
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleShiftActive(shift)}
                          className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            shift.isActive ? 'text-emerald-700 bg-emerald-50' : 'text-stone-500 bg-stone-200'
                          }`}
                        >
                          {shift.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditShift(shift)}
                          className="p-1.5 bg-white border border-[#ded4c5] text-stone-700 rounded-lg cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmShiftId(shift.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-[#ded4c5] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[10px]">Timing</span>
                        <span className="font-mono font-bold text-stone-900">{shift.startTime} – {shift.endTime}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[10px]">Net Hours</span>
                        <span className="font-bold text-stone-900">{shift.netWorkHours}h ({shift.breakDurationMinutes}m break)</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(shift.applicableDepartments || []).includes('all') ? (
                        <span className="bg-white border border-[#ded4c5] text-stone-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          All Departments
                        </span>
                      ) : (
                        (shift.applicableDepartments || []).map((dept) => (
                          <span
                            key={dept}
                            className="bg-white border border-[#ded4c5] text-stone-800 text-[10px] font-medium px-2 py-0.5 rounded-md"
                          >
                            {dept}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SHIFT */}
      {/* ========================================================= */}
      {(isAddShiftOpen || editingShift) && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingShift ? `Edit Shift: ${editingShift.name}` : 'Define Work Shift'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddShiftOpen(false);
                  setEditingShift(null);
                }}
                className="text-stone-400 hover:text-stone-800 p-1.5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingShift ? handleSaveEditShift : handleSaveAddShift} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Shift Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Early Morning Operations"
                    value={shiftFormData.name}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, name: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Code * (e.g. S-07)</label>
                  <input
                    type="text"
                    required
                    placeholder="EARLY-07"
                    value={shiftFormData.code}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-mono font-bold uppercase focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftFormData.startTime}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">End Time *</label>
                  <input
                    type="time"
                    required
                    value={shiftFormData.endTime}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  />
                </div>

                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block font-semibold text-stone-800 text-xs">Break (Mins)</label>
                  <input
                    type="number"
                    min={0}
                    max={180}
                    step={15}
                    value={shiftFormData.breakDurationMinutes}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, breakDurationMinutes: Number(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Net Working Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min={1}
                    max={16}
                    value={shiftFormData.netWorkHours}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, netWorkHours: Number(e.target.value) })}
                    className="w-full bg-white border border-[#ded4c5] rounded-xl px-3 py-2 text-stone-900 font-bold focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-stone-800 text-xs">Shift Color</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setShiftFormData({ ...shiftFormData, color: c })}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer ${
                          shiftFormData.color === c ? 'ring-2 ring-stone-900 scale-110' : 'border-stone-300'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Department Mapping */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#ded4c5] space-y-2">
                <label className="block font-semibold text-stone-800 text-xs">Department Applicability</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type department (e.g. Engineering, Support)..."
                    value={deptInput}
                    onChange={(e) => setDeptInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDept();
                      }
                    }}
                    className="flex-1 bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-3 py-1.5 text-xs text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                  <button
                    type="button"
                    onClick={handleAddDept}
                    className="bg-stone-900 text-stone-50 px-3 py-1.5 rounded-xl font-semibold text-xs cursor-pointer hover:bg-stone-800"
                  >
                    Add Dept
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(shiftFormData.applicableDepartments || []).map((d) => (
                    <span
                      key={d}
                      className="bg-[#ede4d6] border border-[#ded4c5] text-stone-800 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      <span>{d === 'all' ? 'All Departments' : d}</span>
                      {d !== 'all' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDept(d)}
                          className="text-stone-500 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Flexible Timing Band Toggle */}
              <div className="bg-white rounded-2xl p-3.5 border border-[#ded4c5] space-y-2.5">
                <label className="flex items-center justify-between text-xs font-semibold text-stone-800 cursor-pointer">
                  <span>Is Flexible Timing Band (Core Hours)?</span>
                  <input
                    type="checkbox"
                    checked={shiftFormData.isFlexible}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, isFlexible: e.target.checked })}
                    className="w-4 h-4 accent-stone-900 cursor-pointer"
                  />
                </label>

                {shiftFormData.isFlexible && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#ded4c5]">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-700">Core Hours Start</label>
                      <input
                        type="time"
                        value={shiftFormData.coreHoursStart || '10:00'}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, coreHoursStart: e.target.value })}
                        className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-700">Core Hours End</label>
                      <input
                        type="time"
                        value={shiftFormData.coreHoursEnd || '16:00'}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, coreHoursEnd: e.target.value })}
                        className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#ded4c5]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddShiftOpen(false);
                    setEditingShift(null);
                  }}
                  className="px-4 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {editingShift ? 'Save Changes' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmShiftId && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-stone-900">Delete Work Shift?</h4>
              <p className="text-xs text-stone-600">
                Are you sure you want to remove this shift timing profile?
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmShiftId(null)}
                className="flex-1 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteShift(deleteConfirmShiftId);
                  setDeleteConfirmShiftId(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN SHIFT TO INDIVIDUAL / GROUP MODAL */}
      {assignModalShift && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#ded4c5] pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0"
                  style={{ backgroundColor: assignModalShift.color }}
                >
                  {assignModalShift.code}
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Assign {assignModalShift.name}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    Timing: {assignModalShift.startTime} - {assignModalShift.endTime} ({assignModalShift.netWorkHours} hours/day)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalShift(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#ede4d6] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-700 block">Select Assignment Target Scope:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAssignScope('department')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    assignScope === 'department'
                      ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-[#ded4c5] hover:bg-[#ede4d6]'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>By Department</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignScope('individual')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    assignScope === 'individual'
                      ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-[#ded4c5] hover:bg-[#ede4d6]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Individual Staff</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignScope('all')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    assignScope === 'all'
                      ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-xs'
                      : 'bg-white text-stone-700 border-[#ded4c5] hover:bg-[#ede4d6]'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>All Company</span>
                </button>
              </div>

              {/* Scope Options */}
              {assignScope === 'department' && (
                <div className="space-y-2 bg-white p-3.5 border border-[#ded4c5] rounded-2xl">
                  <label className="text-xs font-bold text-stone-800 block">Select Department Group:</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-[#f8f5ef] border border-[#ded4c5] rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-800 cursor-pointer"
                  >
                    {Array.from(new Set(employees.map((e) => e.department))).map((dept) => (
                      <option key={dept} value={dept}>
                        {dept} ({employees.filter((e) => e.department === dept).length} employees)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-stone-500">
                    Assigning this shift will update all staff members in the selected department.
                  </p>
                </div>
              )}

              {assignScope === 'individual' && (
                <div className="space-y-2 bg-white p-3.5 border border-[#ded4c5] rounded-2xl">
                  <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
                    <span>Select Individual Employees:</span>
                    <span className="text-[10px] text-stone-500">
                      {selectedEmpIdsForShift.length} selected
                    </span>
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {employees.map((emp) => {
                      const isSelected = selectedEmpIdsForShift.includes(emp.id);
                      const currentShift = workSchedule.shifts.find((s) => s.id === emp.shiftTimingId);
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedEmpIdsForShift(selectedEmpIdsForShift.filter((id) => id !== emp.id));
                            } else {
                              setSelectedEmpIdsForShift([...selectedEmpIdsForShift, emp.id]);
                            }
                          }}
                          className={`w-full p-2 rounded-xl text-left border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-stone-900 text-stone-50 border-stone-900'
                              : 'bg-[#f8f5ef] text-stone-800 border-[#ded4c5] hover:bg-[#ede4d6]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded cursor-pointer"
                            />
                            <div>
                              <span className="font-bold block">{emp.name} ({emp.employeeCode})</span>
                              <span className={`text-[10px] ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                                {emp.department} • {currentShift ? currentShift.name : 'Default Shift'}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {assignScope === 'all' && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1">
                  <h4 className="font-bold text-amber-950 text-xs">Assign to Entire Company ({employees.length} Staff)</h4>
                  <p className="text-[11px] text-amber-900">
                    This action will reassign all active employees across all departments to use <strong>{assignModalShift.name}</strong> as their primary work schedule.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#ded4c5]">
              <button
                type="button"
                onClick={() => setAssignModalShift(null)}
                className="px-4 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  let targetIds: string[] = [];
                  if (assignScope === 'all') {
                    targetIds = employees.map((e) => e.id);
                  } else if (assignScope === 'department') {
                    targetIds = employees.filter((e) => e.department === selectedDept).map((e) => e.id);
                  } else {
                    targetIds = selectedEmpIdsForShift;
                  }

                  if (targetIds.length === 0) {
                    alert('Please select at least one employee or group.');
                    return;
                  }

                  updateEmployeeShift(targetIds, assignModalShift.id, workSchedule.id);
                  setShiftToastMsg(`Successfully assigned ${assignModalShift.name} to ${targetIds.length} employee(s)!`);
                  setAssignModalShift(null);
                  setTimeout(() => setShiftToastMsg(null), 3500);
                }}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl font-semibold text-xs cursor-pointer shadow-xs"
              >
                Apply Shift Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {shiftToastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-stone-50 border border-stone-800 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{shiftToastMsg}</span>
        </div>
      )}
    </div>
  );
};
