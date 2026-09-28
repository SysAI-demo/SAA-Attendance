import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut } from 'lucide-react';
import { AttendanceProvider, useAttendance } from './context/AttendanceContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AttendanceView } from './components/AttendanceView';
import { RequestsManager } from './components/RequestsManager';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { DefinitionsView } from './components/DefinitionsView';
import { EmployeeLogin } from './components/EmployeeLogin';
import { EmployeeMobileApp } from './components/EmployeeMobileApp';
import { useDeviceType } from './hooks/useDeviceType';
import { LocationPermissionPrompt } from './components/LocationPermissionPrompt';
import { ErrorBoundary } from './components/ErrorBoundary';

const MainAppContent: React.FC = () => {
  const {
    isAuthenticated,
    currentEmployee,
    isCurrentHR,
    logout,
  } = useAttendance();
  const { t, isRTL } = useLanguage();

  const { isMobile } = useDeviceType();
  const [currentTab, setCurrentTab] = useState<NavigationTab>(() => {
    try {
      const saved = localStorage.getItem('saata_active_tab_v1') as NavigationTab;
      if (
        saved &&
        ['dashboard', 'attendance', 'requests', 'employees', 'definitions', 'locations', 'mobile_terminal'].includes(saved)
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleSetCurrentTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    try {
      localStorage.setItem('saata_active_tab_v1', tab);
    } catch {
      // ignore
    }
  };

  // 1. Not Authenticated: Render Login (automatically adapted to mobile vs desktop)
  if (!isAuthenticated || !currentEmployee) {
    return <EmployeeLogin isMobileScreen={isMobile} />;
  }

  // 2. Phone / Mobile Screen: Strictly and only render the Mobile Application View
  if (isMobile) {
    return (
      <ErrorBoundary fallbackTitle="Mobile App Notice">
        <EmployeeMobileApp />
      </ErrorBoundary>
    );
  }

  // 3. Desktop Site: Strictly and only render the Desktop Version
  const portalTitleKey = isCurrentHR
    ? 'header.hr_portal'
    : currentEmployee?.role === 'manager'
    ? 'header.manager_portal'
    : 'header.employee_portal';

  const portalTitleFallback = isCurrentHR
    ? 'Enterprise Management & HR Control Desk'
    : currentEmployee?.role === 'manager'
    ? 'Department Operations Workspace'
    : 'Employee Attendance & Workspace Portal';

  return (
    <div className={`h-screen max-h-screen bg-[#efe8de] text-stone-900 flex flex-row p-3 gap-3 overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
      {/* Sidebar Navigation on the Left */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleSetCurrentTab}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full max-h-full overflow-hidden">
        {/* Location Permission Top Banner */}
        <LocationPermissionPrompt variant="banner" />

        {/* Desktop Content Canvas Card */}
        <div className="flex-1 flex flex-col bg-[#fcfaf7] rounded-3xl border border-[#ded4c5] shadow-xs overflow-hidden h-full max-h-full min-h-0">
          {/* Desktop Top Header Bar */}
          <div className="shrink-0 bg-white/75 border-b border-[#ded4c5] px-6 py-3 flex items-center justify-between backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-extrabold text-stone-700 uppercase tracking-wider bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
                {t(portalTitleKey, portalTitleFallback)}
              </span>
            </div>

            {currentEmployee && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-stone-800">{currentEmployee.name}</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                    {currentEmployee.role}
                  </span>
                </div>
                <button
                  type="button"
                  id="desktop-header-logout-btn"
                  onClick={logout}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-stone-700 hover:text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors active:scale-95 shadow-2xs"
                  title={t('header.logout', 'Log Out')}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('header.logout', 'Log Out')}</span>
                </button>
              </div>
            )}
          </div>

          {/* View Switcher */}
          <main className="flex-1 min-h-0 p-3.5 sm:p-4 lg:p-5 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.995 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="h-full"
              >
                {currentTab === 'dashboard' && (
                  <Dashboard
                    onNavigateToMobile={() => handleSetCurrentTab('attendance')}
                    onNavigateToRequests={() => handleSetCurrentTab('requests')}
                    onNavigateToEmployees={() => handleSetCurrentTab('employees')}
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
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="SAA Time and Attendance Portal">
      <LanguageProvider>
        <AttendanceProvider>
          <MainAppContent />
        </AttendanceProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
