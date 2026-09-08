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
import { useDeviceType } from './hooks/useDeviceType';
import { LogOut } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    isAuthenticated,
    currentEmployee,
    isCurrentHR,
    logout,
  } = useAttendance();

  const { isMobile } = useDeviceType();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // 1. Not Authenticated: Render Login (automatically adapted to mobile vs desktop)
  if (!isAuthenticated) {
    return <EmployeeLogin isMobileScreen={isMobile} />;
  }

  // 2. Phone / Mobile Screen: Strictly and only render the Mobile Application View
  if (isMobile) {
    return <EmployeeMobileApp />;
  }

  // 3. Desktop Site: Strictly and only render the Desktop Version
  const portalTitle = isCurrentHR
    ? 'Enterprise Management & HR Control Desk'
    : currentEmployee.role === 'manager'
    ? 'Department Operations Workspace'
    : 'Employee Attendance & Workspace Portal';

  return (
    <div className="h-screen max-h-screen bg-[#efe8de] text-stone-900 flex flex-row p-3 gap-3 overflow-hidden">
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
        <div className="flex-1 flex flex-col bg-[#fcfaf7] rounded-3xl border border-[#ded4c5] shadow-xs overflow-hidden h-full max-h-full min-h-0">
          {/* Desktop Top Header Bar */}
          <div className="shrink-0 bg-white/75 border-b border-[#ded4c5] px-6 py-3 flex items-center justify-between backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-extrabold text-stone-700 uppercase tracking-wider bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
                {portalTitle}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="header-desktop-logout-btn"
                onClick={logout}
                title="Log Out of Workspace"
                className="px-3 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-98"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>

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
