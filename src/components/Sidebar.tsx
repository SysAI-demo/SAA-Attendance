import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAttendance } from '../context/AttendanceContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
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
  Bell,
  Globe,
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
    employees,
    setCurrentEmployeeId,
    setIsAuthenticated,
    leaveRequests,
    permissionRequests,
    isCurrentHR,
    logout,
  } = useAttendance();
  const { t } = useLanguage();
  const [hoveredTab, setHoveredTab] = useState<NavigationTab | null>(null);

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
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    { id: 'attendance', label: t('nav.attendance', 'Attendance Logs'), icon: UserCheck },
    { id: 'requests', label: t('nav.requests', 'Leave & Requests'), icon: Calendar },
    ...(isCurrentHR
      ? [
          {
            id: 'employees' as NavigationTab,
            label: t('nav.employees', 'Employee Directory'),
            icon: Users,
            badge: 'HR',
          },
          {
            id: 'definitions' as NavigationTab,
            label: t('nav.definitions', 'Definitions'),
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
        <motion.div
          id="sidebar-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
        {/* Top Branding Header with Large Full-Width Logo */}
        <div className="p-3.5 pb-3 border-b border-[#ece4d6] relative">
          {/* Mobile Close Button */}
          <button
            type="button"
            id="close-sidebar-btn"
            onClick={() => setMobileOpen(false)}
            className="md:hidden absolute top-5 right-5 z-20 p-1.5 rounded-xl bg-white/90 text-stone-600 hover:text-stone-900 hover:bg-white cursor-pointer transition-colors border border-[#ded4c5] shadow-xs"
            title="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Full-width Logo Card */}
          <div className="w-full bg-white border border-[#ded4c5] rounded-2xl p-3 shadow-2xs flex flex-col items-center justify-center space-y-2">
            <div className="w-full flex items-center justify-center px-1 py-1">
              <AuthorityLogo
                size="full"
                className="w-full"
                imgClassName="w-full h-16 sm:h-20 object-contain drop-shadow-xs max-w-full"
              />
            </div>
            <div className="w-full text-center border-t border-[#f0e8db] pt-1.5">
              <span className="font-black text-xs sm:text-sm tracking-wide text-stone-900 block uppercase">
                SAA TIME & ATTENDANCE
              </span>
              <span className="text-[9px] text-stone-500 font-bold block uppercase tracking-widest mt-0.5">
                Management System
              </span>
            </div>
          </div>
        </div>

        {/* Floating Navigation Menu Items */}
        <div
          className="flex-1 px-3 py-3.5 space-y-1.5 overflow-y-auto no-scrollbar relative"
          onMouseLeave={() => setHoveredTab(null)}
        >
          <div className="px-3 pt-1 pb-1.5 text-[9px] font-extrabold uppercase tracking-widest text-stone-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isHovered = hoveredTab === item.id;

            return (
              <motion.button
                key={item.id}
                id={`nav-btn-${item.id}`}
                type="button"
                onMouseEnter={() => setHoveredTab(item.id)}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                whileTap={{ scale: 0.98 }}
                whileHover={{ x: 2 }}
                transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold cursor-pointer select-none ${
                  isActive
                    ? 'text-stone-50'
                    : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                {/* Active Sliding Pill Animation */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-2xl bg-stone-900 shadow-md shadow-stone-900/20 z-0"
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 32,
                    }}
                  />
                )}

                {/* Left Active Accent Pip */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-accent-pip"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.7)] z-10"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 32,
                    }}
                  />
                )}

                {/* Hover Sliding Pill Animation for Inactive Items */}
                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      layoutId="sidebar-hover-pill"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 30,
                      }}
                      className="absolute inset-0 rounded-2xl bg-[#ece4d6]/80 border border-[#ded4c5]/70 z-0 shadow-2xs"
                    />
                  )}
                </AnimatePresence>

                {/* Menu Item Content (Icon + Label) */}
                <div className="relative z-10 flex items-center gap-2.5 pl-1.5">
                  <div
                    className={`relative w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'text-amber-400'
                        : isHovered
                        ? 'text-stone-900'
                        : 'text-stone-500'
                    }`}
                  >
                    {/* Active Icon Container Animated Background */}
                    {isActive ? (
                      <motion.div
                        layoutId="sidebar-active-icon-box"
                        className="absolute inset-0 rounded-xl bg-stone-800 shadow-xs z-0"
                        transition={{
                          type: 'spring',
                          stiffness: 420,
                          damping: 32,
                        }}
                      />
                    ) : (
                      <div
                        className={`absolute inset-0 rounded-xl transition-all ${
                          isHovered
                            ? 'bg-white shadow-2xs'
                            : 'bg-stone-100/90'
                        }`}
                      />
                    )}

                    <motion.div
                      animate={{
                        scale: isActive ? 1.08 : isHovered ? 1.06 : 1,
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                      className="relative z-10"
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </motion.div>
                  </div>

                  <span className="tracking-tight transition-colors duration-150">
                    {item.label}
                  </span>
                </div>

                {/* Trailing Badges and Counts */}
                <div className="relative z-10 flex items-center gap-1.5">
                  {item.id === 'requests' && pendingCount > 0 && (
                    <motion.span
                      layout
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs ${
                        isActive
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {pendingCount}
                    </motion.span>
                  )}
                  {item.badge && (
                    <span
                      className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md transition-colors ${
                        isActive
                          ? 'bg-stone-800 text-stone-300 border border-stone-700'
                          : 'bg-stone-200/80 text-stone-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </motion.button>
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
                    <select
                      value={currentEmployee.id}
                      onChange={(e) => {
                        setCurrentEmployeeId(e.target.value);
                        setIsAuthenticated(true);
                      }}
                      className="text-xs font-extrabold text-stone-900 bg-transparent border-none outline-none cursor-pointer p-0 hover:text-amber-800 transition-colors max-w-[110px] truncate"
                      title="Switch Active Account"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id} className="bg-white text-stone-900 font-bold">
                          {emp.name} ({emp.role === 'admin' ? 'HR Admin' : emp.role === 'hr' ? 'HR' : emp.role === 'manager' ? 'Manager' : 'Staff'})
                        </option>
                      ))}
                    </select>
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
                    className="relative p-1.5 rounded-xl bg-stone-50 hover:bg-amber-100/80 text-stone-600 hover:text-amber-950 border border-stone-200 hover:border-amber-300 transition-all cursor-pointer shrink-0 active:scale-95"
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

            {/* Language Switcher in Sidebar */}
            <div className="pt-2 border-t border-[#ece4d6] flex items-center justify-between text-[10.5px]">
              <span className="text-stone-500 font-bold flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-600" />
                <span>{t('header.language', 'Language')}</span>
              </span>
              <LanguageSwitcher variant="pill" />
            </div>

            {/* Authenticated Account Details */}
            <div className="pt-1.5 flex items-center justify-between text-[10.5px]">
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
                <span>{t('header.logout', 'Log Out')}</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

