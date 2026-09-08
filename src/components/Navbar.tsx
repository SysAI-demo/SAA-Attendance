import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import {
  Clock,
  LayoutDashboard,
  Smartphone,
  Calendar,
  Users,
  Building2,
} from 'lucide-react';

export type NavigationTab = 'dashboard' | 'mobile_terminal' | 'requests' | 'employees' | 'locations';

interface NavbarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const {
    currentEmployee,
    employees,
    setCurrentEmployeeId,
    leaveRequests,
    permissionRequests,
    isMobileDeviceView,
    setIsMobileDeviceView,
  } = useAttendance();

  const pendingCount =
    leaveRequests.filter((l) => l.status === 'pending').length +
    permissionRequests.filter((p) => p.status === 'pending').length;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 border-b border-slate-800 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Clock className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                SAATA
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('mobile_terminal')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'mobile_terminal'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span>Mobile Check-In</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('requests')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'requests'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Requests & Approvals</span>
              {pendingCount > 0 && (
                <span className="bg-amber-400 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('employees')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'employees'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Employee Directory</span>
              <span className="md:hidden">Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('locations')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                currentTab === 'locations'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Office Geofences</span>
              <span className="md:hidden">Offices</span>
            </button>
          </nav>

          {/* Active User Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Switch Persona Dropdown */}
            <div className="relative flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-inner">
              <img
                src={currentEmployee.avatar}
                alt={currentEmployee.name}
                className="w-7 h-7 rounded-full object-cover border border-indigo-500"
              />
              <div className="text-left hidden lg:block">
                <span className="text-xs font-bold text-white block leading-none">{currentEmployee.name}</span>
                <span className="text-[10px] text-slate-400 capitalize">
                  {currentEmployee.role === 'manager' ? '⚡ Manager & Approver' : '👤 Employee'}
                </span>
              </div>

              {/* Selector for testing different employees & permissions */}
              <select
                value={currentEmployee.id}
                onChange={(e) => setCurrentEmployeeId(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
                title="Switch employee profile to test geofencing rules and approvals"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                    {emp.name} ({emp.role === 'manager' ? 'Manager' : emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
