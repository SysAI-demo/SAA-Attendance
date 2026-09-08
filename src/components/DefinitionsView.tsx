import React, { useState, useEffect } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  SlidersHorizontal,
  Calendar,
  Clock,
  Award,
  Sliders,
  CalendarDays,
  CalendarClock,
  RotateCcw,
  ShieldCheck,
  Lock,
  Building2,
} from 'lucide-react';
import { DefineLeaves } from './definitions/DefineLeaves';
import { DefinePermissions } from './definitions/DefinePermissions';
import { DefineGrades } from './definitions/DefineGrades';
import { DefineTAPolicies } from './definitions/DefineTAPolicies';
import { DefineHolidays } from './definitions/DefineHolidays';
import { DefineWorkSchedule } from './definitions/DefineWorkSchedule';
import { OfficeLocationsView } from './OfficeLocationsView';

export type DefinitionTab =
  | 'leaves'
  | 'permissions'
  | 'geofences'
  | 'grades'
  | 'ta_policies'
  | 'holidays'
  | 'work_schedule';

interface DefinitionsViewProps {
  initialTab?: DefinitionTab;
}

export const DefinitionsView: React.FC<DefinitionsViewProps> = ({ initialTab }) => {
  const {
    isCurrentHR,
    currentEmployee,
    leaveDefinitions,
    permissionDefinitions,
    gradeDefinitions,
    holidayDefinitions,
    workSchedule,
    officeLocations,
    resetAllDefinitions,
  } = useAttendance();

  const [activeTab, setActiveTab] = useState<DefinitionTab>(initialTab || 'leaves');
  const [showResetAllModal, setShowResetAllModal] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Security check: Only accessible by HR and super admin
  if (!isCurrentHR) {
    return (
      <div id="definitions-access-restricted" className="max-w-4xl mx-auto my-12 p-8 bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-stone-900">Restricted Administrator Module</h2>
          <p className="text-xs text-stone-600">
            Definitions (Leaves, Permissions, Office Geofences, Grades, TA Policies, Holidays, and Work Schedule) can only be accessed and modified by authorized HR Managers and Super Administrators.
          </p>
          <p className="text-xs text-stone-500 font-mono pt-1">
            Current Profile: {currentEmployee.name} ({currentEmployee.role.toUpperCase()})
          </p>
        </div>
      </div>
    );
  }

  const settingOptions: {
    id: DefinitionTab;
    label: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    count: string | number;
  }[] = [
    {
      id: 'leaves',
      label: 'Define Leaves',
      description: 'Leave categories, quotas, carry forwards & encashment',
      icon: Calendar,
      count: `${(leaveDefinitions || []).filter((l) => l?.isActive).length} Types`,
    },
    {
      id: 'permissions',
      label: 'Define Permissions',
      description: 'Gate passes, duty slips & short duration limits',
      icon: Clock,
      count: `${(permissionDefinitions || []).filter((p) => p?.isActive).length} Policies`,
    },
    {
      id: 'geofences',
      label: 'Office Geofences',
      description: 'Physical branches, GPS coordinates & boundary radius',
      icon: Building2,
      count: `${(officeLocations || []).length} Geofences`,
    },
    {
      id: 'grades',
      label: 'Define Grades',
      description: 'Job grade codes, grade titles & active status',
      icon: Award,
      count: `${(gradeDefinitions || []).length} Grades`,
    },
    {
      id: 'ta_policies',
      label: 'Define TA Policies',
      description: 'Grace periods, late rules & travel allowances',
      icon: Sliders,
      count: 'Active',
    },
    {
      id: 'holidays',
      label: 'Define Holidays',
      description: 'Annual calendar, public & optional holidays',
      icon: CalendarDays,
      count: `${(holidayDefinitions || []).length} Holidays`,
    },
    {
      id: 'work_schedule',
      label: 'Define Work Schedule',
      description: 'Operating days, Saturday policy & shifts',
      icon: CalendarClock,
      count: `${(workSchedule?.shifts || []).length} Shifts`,
    },
  ];

  return (
    <div id="definitions-view" className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-stone-900 flex items-center justify-center text-stone-100 shadow-xs shrink-0">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-stone-900">System Definitions</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-stone-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>HR & Super Admin Only</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Master organizational configuration for leaves, permissions, office geofences, job grades, attendance tolerances, holidays, and shifts.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowResetAllModal(true)}
          className="text-xs bg-white hover:bg-[#ede4d6] border border-[#ded4c5] text-stone-700 px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
          <span>Reset All Master Data</span>
        </button>
      </div>

      {/* The 7 Setting Options Navigation Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
        {settingOptions.map((opt) => {
          const Icon = opt.icon;
          const isSelected = activeTab === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              id={`tab-${opt.id}`}
              onClick={() => setActiveTab(opt.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm ring-2 ring-stone-900'
                  : 'bg-[#f8f5ef] text-stone-800 border-[#ded4c5] hover:bg-[#ede4d6]'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isSelected ? 'bg-stone-800 text-stone-100' : 'bg-white border border-[#ded4c5] text-stone-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isSelected ? 'bg-stone-800 text-stone-300' : 'bg-white/80 border border-[#ded4c5] text-stone-600'
                  }`}
                >
                  {opt.count}
                </span>
              </div>

              <div>
                <span className="block font-bold text-xs sm:text-sm leading-snug">{opt.label}</span>
                <span
                  className={`block text-[10px] line-clamp-1 mt-0.5 ${
                    isSelected ? 'text-stone-300' : 'text-stone-500'
                  }`}
                >
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Setting View Component */}
      <div className="transition-all duration-200">
        {activeTab === 'leaves' && <DefineLeaves />}
        {activeTab === 'permissions' && <DefinePermissions />}
        {activeTab === 'geofences' && <OfficeLocationsView />}
        {activeTab === 'grades' && <DefineGrades />}
        {activeTab === 'ta_policies' && <DefineTAPolicies />}
        {activeTab === 'holidays' && <DefineHolidays />}
        {activeTab === 'work_schedule' && <DefineWorkSchedule />}
      </div>

      {/* RESET ALL DEFINITIONS MODAL */}
      {showResetAllModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f8f5ef] border border-[#ded4c5] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-stone-900">Reset All Master Definitions?</h4>
              <p className="text-xs text-stone-600">
                This will reset Leaves, Permissions, Grades, TA Policies, Holidays, and Work Schedules back to corporate factory defaults.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetAllModal(false)}
                className="flex-1 py-2 border border-[#ded4c5] rounded-xl text-stone-700 hover:bg-[#ede4d6] font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllDefinitions();
                  setShowResetAllModal(false);
                }}
                className="flex-1 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold text-xs cursor-pointer shadow-xs"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
