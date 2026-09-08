import React from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { AuthorityLogo } from './AuthorityLogo';
import {
  Clock,
  LayoutDashboard,
  Smartphone,
  Calendar,
  Users,
  SlidersHorizontal,
  X,
  UserCheck,
  Shield,
  LogOut,
  Database,
  RefreshCw,
  Bell,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'attendance'
  | 'mobile_terminal'
  | 'requests'
  | 'employees'
  | 'locations'
  | 'definitions';

interface SidebarProps {
  currentTab: NavigationTab;
  setCurrentTab: (tab: NavigationTab) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  mobileOpen,
  setMobileOpen,
}) => {
  const {
    currentEmployee,
    leaveRequests,
    permissionRequests,
    isCurrentHR,
    logout,
    isDbConnected,
    isDbSyncing,
  } = useAttendance();

  // If a non-HR/Admin user is on employees, definitions, or locations tab, safely redirect back to dashboard
  React.useEffect(() => {
    if (!isCurrentHR && (currentTab === 'employees' || currentTab === 'definitions' || currentTab === 'locations')) {
      setCurrentTab('dashboard');
    }
  }, [isCurrentHR, currentTab, setCurrentTab]);

  const pendingCount =
    (leaveRequests || []).filter((l) => l.status === 'pending').length +
    (permissionRequests || []).filter((p) => p.status === 'pending').length;

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string;
  }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: UserCheck },
    { id: 'requests', label: 'Requests & Approvals', icon: Calendar },
    ...(isCurrentHR
      ? [
          {
            id: 'employees' as NavigationTab,
            label: 'Employees',
            icon: Users,
            badge: 'HR',
          },
          {
            id: 'definitions' as NavigationTab,
            label: 'Definitions',
            icon: SlidersHorizontal,
            badge: 'Admin/HR',
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          id="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed z-50 transition-all duration-300 ease-out flex flex-col justify-between ${
          /* Mobile Drawer Mode */
          mobileOpen
            ? 'top-2 left-2 bottom-2 w-72 rounded-3xl bg-[#fcfaf7] border border-[#dcd2c1] shadow-2xl translate-x-0'
            : '-translate-x-full md:translate-x-0'
        } /* Desktop Navigation Bubble */
        md:relative md:top-0 md:left-0 md:h-full md:w-68 md:shrink-0 md:rounded-3xl md:bg-[#fcfaf7]/95 md:backdrop-blur-md md:border md:border-[#ded4c5] md:shadow-xl md:shadow-stone-900/5 overflow-hidden`}
      >
        {/* Top Branding Header */}
        <div className="p-4.5 pb-3.5 flex items-center justify-between border-b border-[#ece4d6]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-2xl bg-white border border-[#ded4c5] shadow-xs shrink-0 flex items-center justify-center">
              <AuthorityLogo size="sm" imgClassName="w-6.5 h-6.5 object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-stone-900 leading-none">
                  SAATA
                </span>
              </div>
              <span className="text-[10px] text-stone-500 block uppercase tracking-widest font-bold mt-0.5">
                Admin Workspace
              </span>
            </div>
          </div>

          <button
            type="button"
            id="close-sidebar-btn"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-[#ece4d6] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Navigation Menu Items */}
        <div className="flex-1 px-3 py-3.5 space-y-1.5 overflow-y-auto no-scrollbar">
          <div className="px-3 pt-1 pb-1.5 text-[9px] font-extrabold uppercase tracking-widest text-stone-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                type="button"
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-stone-900 text-stone-50 shadow-md shadow-stone-900/15 translate-x-0.5'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-[#ece4d6]/70 hover:translate-x-0.5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-stone-800 text-amber-400'
                        : 'bg-stone-100 text-stone-500 group-hover:bg-white group-hover:text-stone-900 group-hover:shadow-2xs'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="tracking-tight">{item.label}</span>
                </div>
                {item.id === 'requests' && pendingCount > 0 && (
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
                {item.badge && (
                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-stone-800 text-stone-300'
                        : 'bg-stone-200/80 text-stone-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Floating Profile & System Hub */}
        <div className="p-3 border-t border-[#ece4d6] bg-[#f8f4ec]/80 rounded-b-3xl">
          <div className="bg-white border border-[#ded4c5] p-2.5 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <img
                  src={currentEmployee.avatar}
                  alt={currentEmployee.name}
                  className="w-8.5 h-8.5 rounded-full object-cover border border-[#ded4c5]"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {currentEmployee.name}
                    </span>
                    {isCurrentHR && (
                      <span className="text-[8px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1 py-0.2 rounded-md shrink-0">
                        HR
                      </span>
                    )}
                    {!isCurrentHR && currentEmployee.role === 'manager' && (
                      <span className="text-[8px] font-extrabold uppercase bg-blue-100 text-blue-900 border border-blue-200 px-1 py-0.2 rounded-md shrink-0">
                        Manager
                      </span>
                    )}
                  </div>

                  {/* Notification Bell next to Employee Name */}
                  <button
                    type="button"
                    id="sidebar-profile-notification-bell"
                    onClick={() => {
                      setCurrentTab('requests');
                      setMobileOpen(false);
                    }}
                    className="relative p-1.5 rounded-xl bg-stone-50 hover:bg-amber-100/80 text-stone-600 hover:text-amber-950 border border-stone-200 hover:border-amber-300 transition-all cursor-pointer shrink-0"
                    title={
                      pendingCount > 0
                        ? `${pendingCount} pending requests requiring attention`
                        : 'Notifications / Requests'
                    }
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-stone-950 ring-2 ring-white animate-pulse">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                </div>
                <span className="text-[10px] text-stone-500 block truncate font-medium mt-0.5">
                  {currentEmployee.designation}
                </span>
              </div>
            </div>

            {/* Authenticated Account Details */}
            <div className="pt-2 border-t border-[#ece4d6] flex items-center justify-between text-[10.5px]">
              <span className="text-stone-500 font-medium">Employee ID</span>
              <span className="font-mono font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                {currentEmployee.employeeCode}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10.5px] pb-0.5">
              <span className="text-stone-500 font-medium">Department</span>
              <span className="font-bold text-stone-700 truncate max-w-[120px]">
                {currentEmployee.department || 'Operations'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10.5px] pb-0.5">
              <span className="text-stone-500 font-medium">Mobile Device</span>
              {currentEmployee.isMobileLoggedIn || currentEmployee.activeMobileSession ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded text-[9.5px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>1 Mobile Active</span>
                </span>
              ) : currentEmployee.deviceId ? (
                <span className="text-stone-600 font-medium text-[9.5px] truncate max-w-[120px]" title={currentEmployee.deviceBinding?.deviceName || currentEmployee.deviceId}>
                  📱 {currentEmployee.deviceBinding?.deviceName || '1 Bound (Offline)'}
                </span>
              ) : (
                <span className="text-stone-400 italic text-[9.5px]">Auto-binds on login</span>
              )}
            </div>

            {/* Quick Actions (Logout) */}
            <div className="pt-1.5 border-t border-[#ece4d6]">
              <button
                type="button"
                id="sidebar-logout-btn"
                onClick={logout}
                className="w-full py-2 px-3 bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-stone-700 hover:text-rose-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors active:scale-98"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>

            {/* Live Firestore DB Sync Indicator */}
            <div className="pt-1.5 border-t border-[#ece4d6] flex items-center justify-between text-[9px]">
              <div className="flex items-center gap-1 text-stone-500 font-semibold">
                <Database className="w-2.5 h-2.5 text-emerald-600" />
                <span>Cloud Firestore</span>
              </div>
              <div>
                {isDbSyncing ? (
                  <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    <RefreshCw className="w-2 h-2 animate-spin" />
                    <span>Syncing</span>
                  </span>
                ) : isDbConnected ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Connected</span>
                  </span>
                ) : (
                  <span className="text-stone-500 font-bold bg-stone-100 px-1.5 py-0.5 rounded">
                    Local Cache
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
