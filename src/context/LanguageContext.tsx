import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.attendance': 'Attendance Logs',
    'nav.requests': 'Leave & Requests',
    'nav.employees': 'Employee Directory',
    'nav.definitions': 'Definitions',
    'nav.locations': 'Locations & Geofences',
    'nav.mobile_terminal': 'Mobile Kiosk',

    // Header & Actions
    'header.logout': 'Log Out',
    'header.language': 'Language',
    'header.hr_portal': 'Enterprise Management & HR Control Desk',
    'header.manager_portal': 'Department Operations Workspace',
    'header.employee_portal': 'Employee Attendance & Workspace Portal',

    // Common Actions
    'action.save': 'Save Changes',
    'action.cancel': 'Cancel',
    'action.add': 'Add New',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.search': 'Search...',
    'action.filter': 'Filter',
    'action.export': 'Export Data',
    'action.register_employee': 'Register New Employee',
    'action.apply_leave': 'Apply for Leave',
    'action.punch_in': 'Punch In',
    'action.punch_out': 'Punch Out',
    'action.refresh': 'Refresh',

    // Statuses
    'status.present': 'Present',
    'status.absent': 'Absent',
    'status.late': 'Late',
    'status.on_leave': 'On Leave',
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.pending': 'Pending',
    'status.approved': 'Approved',
    'status.rejected': 'Rejected',

    // Employee Tabs
    'emp_tab.basic_profile': 'Basic Profile',
    'emp_tab.account_access': 'Account & Access',
    'emp_tab.joining_leaves': 'Joining & Leaves',

    // Dashboard Cards
    'dash.total_employees': 'Total Workforce',
    'dash.on_duty': 'On Duty Now',
    'dash.late_today': 'Late Arrivals',
    'dash.on_leave': 'On Leave Today',
    'dash.recent_activity': 'Real-Time Activity Log',
    'dash.quick_actions': 'Quick Actions',

    // Login
    'login.title': 'Time & Attendance Portal',
    'login.subtitle': 'Sign in to access your attendance workspace',
    'login.username': 'Employee ID / Email',
    'login.password': 'Password',
    'login.signin_button': 'Sign In to Portal',

    // Definitions tabs
    'def.departments': 'Departments',
    'def.designations': 'Designations',
    'def.grades': 'Job Grades & Quotas',
    'def.shifts': 'Shifts & Timings',
    'def.leaves': 'Leave Policies',
    'def.holidays': 'Public Holidays',
    'def.geofences': 'Work Locations / Geofences',
  },
  ar: {
    // Navigation
    'nav.dashboard': 'لوحة التحكم',
    'nav.attendance': 'سجلات الحضور',
    'nav.requests': 'الإجازات والطلبات',
    'nav.employees': 'دليل الموظفين',
    'nav.definitions': 'التعريفات',
    'nav.locations': 'مواقع العمل والتسيير الجغرافي',
    'nav.mobile_terminal': 'جهاز الحضور المحمول',

    // Header & Actions
    'header.logout': 'تسجيل الخروج',
    'header.language': 'اللغة',
    'header.hr_portal': 'منصة إدارة الموارد البشرية والتحكم',
    'header.manager_portal': 'مساحة عمل عمليات القسم',
    'header.employee_portal': 'بوابة الحضور ومساحة عمل الموظف',

    // Common Actions
    'action.save': 'حفظ التغييرات',
    'action.cancel': 'إلغاء',
    'action.add': 'إضافة جديد',
    'action.edit': 'تعديل',
    'action.delete': 'حذف',
    'action.search': 'بحث...',
    'action.filter': 'تصفية',
    'action.export': 'تصدير البيانات',
    'action.register_employee': 'تسجيل موظف جديد',
    'action.apply_leave': 'تقديم طلب إجازة',
    'action.punch_in': 'تسجيل الدخول',
    'action.punch_out': 'تسجيل الخروج',
    'action.refresh': 'تحديث',

    // Statuses
    'status.present': 'حاضر',
    'status.absent': 'غائب',
    'status.late': 'متأخر',
    'status.on_leave': 'في إجازة',
    'status.active': 'نشط',
    'status.inactive': 'غير نشط',
    'status.pending': 'قيد الانتظار',
    'status.approved': 'مقبول',
    'status.rejected': 'مرفوض',

    // Employee Tabs
    'emp_tab.basic_profile': 'الملف الشخصي الأساسي',
    'emp_tab.account_access': 'الحساب والصلاحيات',
    'emp_tab.joining_leaves': 'الالتحاق والإجازات',

    // Dashboard Cards
    'dash.total_employees': 'إجمالي الموظفين',
    'dash.on_duty': 'على رأس العمل الآن',
    'dash.late_today': 'المتأخرون اليوم',
    'dash.on_leave': 'في إجازة اليوم',
    'dash.recent_activity': 'سجل النشاط المباشر',
    'dash.quick_actions': 'إجراءات سريعة',

    // Login
    'login.title': 'بوابة الحضور والانصراف',
    'login.subtitle': 'قم بتسجيل الدخول للوصول إلى مساحة العمل الخاصة بك',
    'login.username': 'رقم الموظف / البريد الإلكتروني',
    'login.password': 'كلمة المرور',
    'login.signin_button': 'تسجيل الدخول إلى البوابة',

    // Definitions tabs
    'def.departments': 'الأقسام',
    'def.designations': 'المسميات الوظيفية',
    'def.grades': 'الدرجات الوظيفية والكوتا',
    'def.shifts': 'الورديات والمواعيد',
    'def.leaves': 'سياسات الإجازات',
    'def.holidays': 'العطلات الرسمية',
    'def.geofences': 'مواقع العمل والنطاق الجغرافي',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('saata_app_language') as Language;
      if (saved && (saved === 'en' || saved === 'ar')) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'en';
  });

  const isRTL = language === 'ar';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('saata_app_language', lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  useEffect(() => {
    // Set document dir and lang attributes for full CSS/RTL support
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    if (isRTL) {
      document.body.classList.add('font-arabic');
    } else {
      document.body.classList.remove('font-arabic');
    }
  }, [language, isRTL]);

  const t = (key: string, fallback?: string): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    if (translations['en'][key]) {
      return translations['en'][key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
