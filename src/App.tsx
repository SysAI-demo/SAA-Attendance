import React, { useState } from 'react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AttendanceView } from './components/AttendanceView';
import { RequestsManager } from './components/RequestsManager';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { DefinitionsView } from './components/DefinitionsView';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeeMobileApp } from './components/EmployeeMobileApp';
import { Menu, Clock, Smartphone, LayoutDashboard, LogOut } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    isAuthenticated,
    activeAppMode,
    setActiveAppMode,
    currentEmployee,
    isCurrentHR,
    logout,
  } = useAttendance();

  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // If user is not authenticated, show Employee Mobile Login screen
  if (!isAuthenticated) {
    return <EmployeeLogin />;
  }

  // If active mode is mobile_app (Employee mobile workflow)
  if (activeAppMode === 'mobile_app') {
    return (
      <EmployeeMobileApp
        onSwitchToAdminPortal={() => setActiveAppMode('admin_portal')}
      />
    );
  }

  // Admin / HR / Manager Workspace Desk
  return (
    <div className="h-screen max-h-screen bg-[#efe8de] text-stone-900 flex flex-col md:flex-row md:p-3 md:gap-3 overflow-hidden">
      {/* Top Banner indicating Admin Desk with 1-click Mobile App Switcher */}
      <div className="md:hidden sticky top-0 z-40 bg-stone-900 text-stone-100 px-4 py-2 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-bold">SAATA Workspace</span>
        </div>
        <button
          type="button"
          onClick={() => setActiveAppMode('mobile_app')}
          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-stone-700 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Mobile App</span>
        </button>
      </div>

      {/* Sidebar Navigation on the Left */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full max-h-full overflow-hidden">
        {/* Desktop Content Canvas Card */}
        <div className="flex-1 flex flex-col bg-[#fcfaf7] md:rounded-3xl md:border md:border-[#ded4c5] md:shadow-sm overflow-hidden h-full max-h-full min-h-0">
          {/* Desktop Top Header Bar */}
          <div className="hidden md:flex shrink-0 bg-white/70 border-b border-[#ded4c5] px-6 py-3 items-center justify-between backdrop-blur-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wider bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                Management & HR Control Desk
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500">
                Active User: <strong className="text-stone-900">{currentEmployee.name}</strong> ({currentEmployee.designation})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="desktop-open-mobile-app-btn"
                onClick={() => setActiveAppMode('mobile_app')}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                <span>Open Employee Mobile App</span>
              </button>
            </div>
          </div>

          {/* Mobile Header Bar */}
          <header className="md:hidden shrink-0 sticky top-0 z-30 bg-[#f8f5ef] border-b border-[#ded4c5] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-stone-900 flex items-center justify-center text-[#efe8de]">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-sm text-stone-900">SAATA</span>
            </div>
            <button
              type="button"
              id="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-stone-700 hover:bg-[#ece4d6] cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </header>

          {/* View Switcher */}
          <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-7 overflow-y-auto">
            {currentTab === 'dashboard' && (
              <Dashboard
                onNavigateToMobile={() => setCurrentTab('attendance')}
                onNavigateToRequests={() => setCurrentTab('requests')}
                onNavigateToEmployees={() => setCurrentTab('employees')}
              />
            )}

            {(currentTab === 'attendance' || currentTab === 'mobile_terminal') && (
              <AttendanceView />
            )}

            {currentTab === 'requests' && <RequestsManager />}

            {currentTab === 'employees' && <EmployeeDirectory />}

            {(currentTab === 'definitions' || currentTab === 'locations') && (
              <DefinitionsView initialTab={currentTab === 'locations' ? 'geofences' : undefined} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AttendanceProvider>
      <MainAppContent />
    </AttendanceProvider>
  );
}
