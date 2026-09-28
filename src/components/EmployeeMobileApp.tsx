import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAttendance } from '../context/AttendanceContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { checkGeofenceStatus, formatDistance, calculateExpectedOutTime } from '../utils/geoUtils';
import { getEmployeeAnnualQuota } from '../utils/leaveAnniversaryUtils';
import {
  hapticCheckInClick,
  hapticCheckInSuccess,
  hapticCheckOutClick,
  hapticCheckOutSuccess,
  hapticBiometricScan,
  hapticBiometricSuccess,
  hapticError,
} from '../utils/haptics';
import { WorkHoursBarChart } from './WorkHoursBarChart';
import { PunchFeedbackCard, PunchFeedbackState } from './PunchFeedbackCard';
import { PermissionType, LeaveType, LeaveDurationOption, AppNotification, OfficeLocation } from '../types';
import { GeofenceMap } from './GeofenceMap';
import { BiometricAuthModal } from './BiometricAuthModal';
import {
  getDeviceBiometricInfo,
  isIPhoneDevice,
  setBiometricDeviceOverride,
  getBiometricDeviceOverride,
} from '../utils/biometricUtils';
import confetti from 'canvas-confetti';
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Navigation,
  ShieldCheck,
  Building2,
  Calendar,
  FileText,
  User,
  LogOut,
  Send,
  Sparkles,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Award,
  Layers,
  History,
  Info,
  Check,
  X,
  Smartphone,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  ShieldAlert,
  CalendarRange,
  Filter,
  RotateCcw,
  Search,
  CalendarDays,
  TrendingUp,
  FileDown,
  Download,
  Printer,
  Globe,
  Bell,
  CheckCheck,
  Home,
  Settings,
  PlusCircle,
  BarChart2,
  Activity,
  Briefcase,
  Phone,
  UserCheck,
  Zap,
  Sliders,
  Fingerprint,
  ScanFace,
  Eye,
  Table,
  List,
  FileSpreadsheet,
  Volume2,
} from 'lucide-react';

// Audio chime generator for instant real-time approval alerts
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.12, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore browser audio autoplay restrictions
  }
}

interface EmployeeMobileAppProps {
  onSwitchToAdminPortal?: () => void;
}

export type MobileAppTab = 'home' | 'attendance' | 'apply' | 'logs' | 'settings';

// Fallback office definition if no offices are configured yet
const DEFAULT_OFFICE_FALLBACK: OfficeLocation = {
  id: 'loc_hq',
  name: 'Sharjah Archaeology HQ',
  code: 'HQ-SHJ',
  address: 'Archaeology Complex, Al Abar, Sharjah, UAE',
  city: 'Sharjah',
  latitude: 25.3463,
  longitude: 55.4209,
  radiusMeters: 200,
  timezone: 'Asia/Dubai',
  color: '#eab308',
  description: 'Main Headquarters',
  isActive: true,
};

export const EmployeeMobileApp: React.FC<EmployeeMobileAppProps> = ({ onSwitchToAdminPortal }) => {
  const { t, isRTL } = useLanguage();
  const {
    currentEmployee,
    officeLocations,
    currentCoords,
    isUsingRealGPS,
    gpsError,
    locationPermissionStatus,
    hasAcquiredRealGPS,
    requestLocationPermission,
    setManualLocation,
    enableRealGPS,
    markCheckIn,
    markCheckOut,
    todayRecord,
    applyPermission,
    applyLeave,
    permissionRequests,
    leaveRequests,
    attendanceRecords,
    myActivityLogs,
    employees,
    gradeDefinitions,
    leaveDefinitions,
    permissionDefinitions,
    logout,
    isCurrentHR,
    myNotifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshGPSPosition,
    updateOfficeLocation,
    triggerTestProximityAlert,
    pushNotificationPermission,
    requestPushNotificationPermission,
  } = useAttendance();

  // GPS Radar & Refresh state
  const [isRefreshingGPS, setIsRefreshingGPS] = useState<boolean>(false);
  const [showRadarMap, setShowRadarMap] = useState<boolean>(false);
  const [gpsRefreshMessage, setGpsRefreshMessage] = useState<string | null>(null);

  const handleRefreshGPS = async () => {
    setIsRefreshingGPS(true);
    setGpsRefreshMessage(null);
    try {
      const res = await refreshGPSPosition();
      if (res.success && res.coords) {
        setGpsRefreshMessage(`GPS Refreshed: ±${Math.round(res.coords.accuracy)}m accuracy`);
        setTimeout(() => setGpsRefreshMessage(null), 3500);
      } else {
        setGpsRefreshMessage(res.error || 'Failed to acquire GPS');
        setTimeout(() => setGpsRefreshMessage(null), 4000);
      }
    } finally {
      setIsRefreshingGPS(false);
    }
  };

  const handleCalibrateOfficeToMyGPS = () => {
    if (!detectedOffice) return;
    updateOfficeLocation(
      {
        ...detectedOffice,
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
      },
      true
    );
    setGpsRefreshMessage(`Geofence Updated: "${detectedOffice.name}" calibrated to your phone's live coordinates (${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)})!`);
    setTimeout(() => setGpsRefreshMessage(null), 4500);
  };

  // Active Bottom Navigation Tab
  const [activeTab, setActiveTabState] = useState<MobileAppTab>(() => {
    try {
      const saved = localStorage.getItem('saata_mobile_tab_v1') as MobileAppTab;
      if (saved && ['home', 'attendance', 'apply', 'logs', 'settings'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'home';
  });

  const setActiveTab = (tab: MobileAppTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('saata_mobile_tab_v1', tab);
    } catch {
      // ignore
    }
  };
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [notificationCategoryFilter, setNotificationCategoryFilter] = useState<'all' | 'approvals' | 'unread'>('all');

  // Real-time In-App Notification Alert Banner & Toast State
  const [liveAlertNotification, setLiveAlertNotification] = useState<AppNotification | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef<boolean>(false);

  // Monitor incoming real-time notifications for approval alerts & badges
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      // First load: seed existing notifications so we don't trigger toast on startup
      myNotifications.forEach((n) => seenNotifIdsRef.current.add(n.id));
      initialLoadDoneRef.current = true;
      return;
    }

    // Find any new unread notification for this employee
    const newNotifications = myNotifications.filter(
      (n) => !n.isRead && !seenNotifIdsRef.current.has(n.id)
    );

    if (newNotifications.length > 0) {
      const latest = newNotifications[0];
      // Mark all new notification IDs as tracked in ref
      newNotifications.forEach((n) => seenNotifIdsRef.current.add(n.id));

      // Trigger Floating Real-Time In-App Alert Banner
      setLiveAlertNotification(latest);

      // Play audio chime and trigger celebratory confetti if it is an HR / Manager approval
      if (latest.type === 'leave_approved' || latest.type === 'permission_approved') {
        playNotificationChime();
        confetti({
          particleCount: 55,
          spread: 70,
          origin: { y: 0.15 },
          zIndex: 9999,
        });
      }
    }
  }, [myNotifications]);

  // Auto-dismiss live alert toast after 8 seconds
  useEffect(() => {
    if (!liveAlertNotification) return;
    const timer = setTimeout(() => {
      setLiveAlertNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [liveAlertNotification]);

  // Biometric Auth Settings State
  const [biometricEnabled, setBiometricEnabled] = useState<boolean>(true);
  const [showBiometricModal, setShowBiometricModal] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face'>(() => {
    return getDeviceBiometricInfo().type;
  });

  // Active Punch Biometric (Face ID for iPhone / Fingerprint for Android)
  const [showFacePunchModal, setShowFacePunchModal] = useState<boolean>(false);
  const [pendingPunchType, setPendingPunchType] = useState<'check_in' | 'check_out'>('check_in');

  const isIPhone = isIPhoneDevice();

  const handleToggleBiometric = () => {
    setShowBiometricModal(true);
  };

  // Time ticker
  const [currentTime, setCurrentTime] = useState(new Date());
  const [punchFeedback, setPunchFeedback] = useState<PunchFeedbackState | null>(null);

  // Permission Application Form State
  const [permType, setPermType] = useState<PermissionType>('late_entry');
  const [permDate, setPermDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [permStartTime, setPermStartTime] = useState<string>('09:00');
  const [permEndTime, setPermEndTime] = useState<string>('11:00');
  const [permReason, setPermReason] = useState<string>('');
  const [permSubmittedSuccess, setPermSubmittedSuccess] = useState<string | null>(null);
  const [permValidationError, setPermValidationError] = useState<string | null>(null);

  // Leave Application Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [leaveStartDate, setLeaveStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [leaveEndDate, setLeaveEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [leaveSubmittedSuccess, setLeaveSubmittedSuccess] = useState<string | null>(null);
  const [leaveValidationError, setLeaveValidationError] = useState<string | null>(null);

  // Apply Sub-Mode
  const [requestMode, setRequestMode] = useState<'permission' | 'leave' | 'status'>('leave');
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'permissions' | 'leaves'>('all');

  // Attendance History Tab (Tab 2) Filter & View State
  const [logStartDate, setLogStartDate] = useState<string>('');
  const [logEndDate, setLogEndDate] = useState<string>('');
  const [attLayoutMode, setAttLayoutMode] = useState<'table' | 'cards'>('table');

  // Tab 4 (Activity Logs) State
  const [logActivityCategory, setLogActivityCategory] = useState<'all' | 'punch' | 'leave' | 'permission' | 'auth' | 'system'>('all');
  const [logActivitySearch, setLogActivitySearch] = useState<string>('');
  const [selectedActivityLog, setSelectedActivityLog] = useState<any | null>(null);
  const [logsLayoutMode, setLogsLayoutMode] = useState<'table' | 'cards'>('table');

  // Live timer tick every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live geofence verification
  const geofenceResult = useMemo(() => {
    const allowedIds = currentEmployee?.allowedLocationIds || (officeLocations || []).map((l) => l.id);
    return checkGeofenceStatus(currentCoords, officeLocations || [], allowedIds);
  }, [currentCoords, officeLocations, currentEmployee?.allowedLocationIds]);

  // Automatically detected office based on live GPS position
  const detectedOffice = useMemo(() => {
    return (
      geofenceResult?.activeAuthorizedLocation ||
      geofenceResult?.nearestLocation ||
      (officeLocations && officeLocations.length > 0 ? officeLocations[0] : DEFAULT_OFFICE_FALLBACK)
    );
  }, [geofenceResult, officeLocations]);

  // Find employee's assigned grade definition if available
  const employeeGrade = useMemo(() => {
    if (!currentEmployee?.gradeId || !gradeDefinitions) return undefined;
    return gradeDefinitions.find((g) => g.id === currentEmployee?.gradeId);
  }, [currentEmployee?.gradeId, gradeDefinitions]);

  // Filter leave types allowed by the employee's grade
  const allowedLeaveDefs = useMemo(() => {
    if (!leaveDefinitions) return [];
    const codes = employeeGrade?.allowedLeaveCodes || (employeeGrade as any)?.allowedLeaveTypeCodes;
    if (!employeeGrade || !codes || codes.length === 0) {
      return leaveDefinitions;
    }
    return leaveDefinitions.filter((def) => codes.includes(def.code));
  }, [leaveDefinitions, employeeGrade]);

  // Filter my requests
  const myPermissions = useMemo(() => {
    if (!currentEmployee?.id) return [];
    return (permissionRequests || []).filter((r) => r.employeeId === currentEmployee.id);
  }, [permissionRequests, currentEmployee?.id]);

  const myLeaves = useMemo(() => {
    if (!currentEmployee?.id) return [];
    return (leaveRequests || []).filter((r) => r.employeeId === currentEmployee.id);
  }, [leaveRequests, currentEmployee?.id]);

  // HR Annual Quota & Allowed Leave Allocations
  const hrAnnualQuota = useMemo(() => {
    return getEmployeeAnnualQuota(currentEmployee, gradeDefinitions, leaveDefinitions);
  }, [currentEmployee, gradeDefinitions, leaveDefinitions]);

  // Detailed Annual Leave stats (Balance vs HR Allowance)
  const annualLeaveStats = useMemo(() => {
    const totalAllowed = hrAnnualQuota?.annual || 21;
    const available = currentEmployee?.leaveBalance?.annual ?? totalAllowed;
    const used = Math.max(0, totalAllowed - available);
    const percentLeft = totalAllowed > 0 ? Math.min(100, Math.max(0, Math.round((available / totalAllowed) * 100))) : 100;

    return {
      available,
      totalAllowed,
      used,
      percentLeft,
    };
  }, [hrAnnualQuota, currentEmployee?.leaveBalance]);

  // HR Monthly Permission Hours Allowance & Usage Calculation
  const hrMonthlyPermissionCap = useMemo(() => {
    if (permissionDefinitions && permissionDefinitions.length > 0) {
      const caps = permissionDefinitions.map((p) => p.monthlyHoursCap || 4);
      return Math.max(...caps, 4);
    }
    return 4.0;
  }, [permissionDefinitions]);

  const monthlyPermissionUsage = useMemo(() => {
    const currentYearMonth = `${currentTime.getFullYear()}-${String(currentTime.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthPerms = myPermissions.filter(
      (p) => p.date?.startsWith(currentYearMonth) && p.status !== 'rejected'
    );
    const hoursUsed = thisMonthPerms.reduce(
      (sum, p) => sum + (Number(p.durationHours) || 0),
      0
    );
    const hoursAvailable = Math.max(0, hrMonthlyPermissionCap - hoursUsed);
    const percentLeft = hrMonthlyPermissionCap > 0
      ? Math.min(100, Math.max(0, Math.round((hoursAvailable / hrMonthlyPermissionCap) * 100)))
      : 100;
    const currentMonthName = currentTime.toLocaleDateString(undefined, { month: 'long' });

    return {
      hoursUsed: Number(hoursUsed.toFixed(1)),
      hoursAvailable: Number(hoursAvailable.toFixed(1)),
      hoursCap: hrMonthlyPermissionCap,
      countThisMonth: thisMonthPerms.length,
      monthName: currentMonthName,
      percentLeft,
    };
  }, [myPermissions, hrMonthlyPermissionCap, currentTime]);

  // Calculate my attendance logs
  const myAttendance = useMemo(() => {
    if (!currentEmployee?.id) return [];
    return (attendanceRecords || [])
      .filter((rec) => rec.employeeId === currentEmployee.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceRecords, currentEmployee?.id]);

  // Filtered my attendance logs by date range (From Date / To Date) for Tab 2 Attendance view
  const filteredMyAttendance = useMemo(() => {
    return myAttendance.filter((record) => {
      if (logStartDate && record.date < logStartDate) return false;
      if (logEndDate && record.date > logEndDate) return false;
      return true;
    });
  }, [myAttendance, logStartDate, logEndDate]);

  // Metrics summary for Tab 2 attendance
  const filteredMetrics = useMemo(() => {
    const totalDays = filteredMyAttendance.length;
    const totalHours = filteredMyAttendance.reduce(
      (acc, rec) => acc + (rec.totalHoursWorked || 0),
      0
    );
    const onTimeCount = filteredMyAttendance.filter((rec) => rec.status === 'on_time').length;

    return {
      totalDays,
      totalHours: Number(totalHours.toFixed(1)),
      avgHoursPerDay: totalDays > 0 ? (totalHours / totalDays).toFixed(1) : '0.0',
      onTimeRate: totalDays > 0 ? Math.round((onTimeCount / totalDays) * 100) : 100,
    };
  }, [filteredMyAttendance]);

  const handleResetDateFilter = () => {
    setLogStartDate('');
    setLogEndDate('');
  };

  // Filtered Activity Logs for Tab 4 (Logs)
  const filteredActivityLogs = useMemo(() => {
    return myActivityLogs.filter((log) => {
      const cat = log.category || '';
      const typ = (log.type as string) || '';
      const matchCategory =
        logActivityCategory === 'all' ||
        cat === logActivityCategory ||
        (logActivityCategory === 'auth' && (cat === 'auth' || typ.includes('auth') || typ.includes('biometric') || typ.includes('security'))) ||
        (logActivityCategory === 'punch' && (cat === 'punch' || typ === 'check_in' || typ === 'check_out')) ||
        (logActivityCategory === 'leave' && (cat === 'leave' || typ.includes('leave'))) ||
        (logActivityCategory === 'permission' && (cat === 'permission' || typ.includes('permission')));

      const query = logActivitySearch.trim().toLowerCase();
      const matchSearch =
        !query ||
        (log.title && log.title.toLowerCase().includes(query)) ||
        (log.description && log.description.toLowerCase().includes(query)) ||
        (log.locationName && log.locationName.toLowerCase().includes(query)) ||
        (log.status && log.status.toLowerCase().includes(query)) ||
        (log.date && log.date.includes(query)) ||
        (log.timeFormatted && log.timeFormatted.toLowerCase().includes(query));

      return matchCategory && matchSearch;
    });
  }, [myActivityLogs, logActivityCategory, logActivitySearch]);

  // Activity Logs CSV Exporter
  const handleExportActivityLogsCSV = () => {
    if (!filteredActivityLogs.length) return;
    const headers = ['Date', 'Time', 'Event Title', 'Description', 'Category', 'Status', 'Location', 'Device'];
    const rows = filteredActivityLogs.map((l) => [
      `"${l.date || ''}"`,
      `"${l.timeFormatted || ''}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${l.category || ''}"`,
      `"${l.status || ''}"`,
      `"${l.locationName || ''}"`,
      `"${l.deviceInfo || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeEmpName = (currentEmployee?.name || 'Employee').replace(/\s+/g, '_');
    link.download = `activity_logs_${safeEmpName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // PDF Report Export Handler
  const handleExportAttendancePDF = () => {
    window.print();
  };

  // Pending counts
  const myPendingPermissionsCount = useMemo(() => {
    return myPermissions.filter((r) => r.status === 'pending').length;
  }, [myPermissions]);

  const myPendingLeavesCount = useMemo(() => {
    return myLeaves.filter((r) => r.status === 'pending' || r.currentStage === 'pending_hr').length;
  }, [myLeaves]);

  // HR & Manager Approval Notifications for Home Dashboard highlights and filtered modal views
  const recentApprovalNotifications = useMemo(() => {
    return myNotifications.filter(
      (n) => n.type === 'leave_approved' || n.type === 'permission_approved'
    );
  }, [myNotifications]);

  const latestUnreadApproval = useMemo(() => {
    return (
      myNotifications.find(
        (n) => !n.isRead && (n.type === 'leave_approved' || n.type === 'permission_approved')
      ) || (recentApprovalNotifications || [])[0]
    );
  }, [myNotifications, recentApprovalNotifications]);

  // Filtered Notifications in the In-App Notification Center Modal
  const filteredNotifications = useMemo(() => {
    return myNotifications.filter((n) => {
      if (notificationCategoryFilter === 'unread') return !n.isRead;
      if (notificationCategoryFilter === 'approvals') {
        return n.type === 'leave_approved' || n.type === 'permission_approved';
      }
      return true;
    });
  }, [myNotifications, notificationCategoryFilter]);

  // Greeting time
  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentTime]);

  // Execute final punch to database
  const executeFinalPunch = (
    type: 'check_in' | 'check_out',
    biometricVerified: boolean = true,
    verifiedBioType?: 'face' | 'fingerprint'
  ) => {
    if (!geofenceResult.activeAuthorizedLocation) {
      hapticError();
      return;
    }
    const locationName = geofenceResult.activeAuthorizedLocation.name;
    const finalBioType = verifiedBioType || getDeviceBiometricInfo().type;

    if (type === 'check_in') {
      const result = markCheckIn('', { biometricVerified: true, biometricType: finalBioType });
      if (result.success) {
        hapticCheckInSuccess();
        setPunchFeedback({
          ...result,
          type: 'success',
          punchType: 'check_in',
          locationName,
          biometricVerified: true,
          biometricType: finalBioType,
          message: `Check-IN Successful! Verified via ${finalBioType === 'face' ? 'Apple Face ID' : 'Fingerprint'} at ${locationName}.`,
        });
      } else {
        hapticError();
        setPunchFeedback({
          ...result,
          type: 'error',
          punchType: 'check_in',
          message: result.message,
        });
      }
    } else {
      const result = markCheckOut('', { biometricVerified: true, biometricType: finalBioType });
      if (result.success) {
        hapticCheckOutSuccess();
        setPunchFeedback({
          ...result,
          type: 'success',
          punchType: 'check_out',
          locationName,
          biometricVerified: true,
          biometricType: finalBioType,
          message: `Check-OUT Successful! Verified via ${finalBioType === 'face' ? 'Apple Face ID' : 'Fingerprint'} at ${locationName}.`,
        });
      } else {
        hapticError();
        setPunchFeedback({
          ...result,
          type: 'error',
          punchType: 'check_out',
          message: result.message,
        });
      }
    }
  };

  // Handle Punch In Action (Mandatory phone biometric verification)
  const handlePunchIn = async () => {
    // Immediate tactile click vibration for button press confirmation
    hapticCheckInClick();

    if (locationPermissionStatus !== 'granted' || !hasAcquiredRealGPS) {
      const locRes = await requestLocationPermission();
      if (!locRes.success) {
        hapticError();
        setPunchFeedback({
          success: false,
          type: 'error',
          punchType: 'check_in',
          message: locRes.error || 'Check-in rejected! Please allow device location permission to verify your office geofence.',
        });
        return;
      }
    }

    if (!geofenceResult.isInAllowedGeofence || !geofenceResult.activeAuthorizedLocation) {
      hapticError();
      setPunchFeedback({
        success: false,
        type: 'error',
        punchType: 'check_in',
        message: geofenceResult.statusMessage || `Check-in rejected! You are not inside any authorized office geofence.`,
      });
      return;
    }

    // Biometric is strictly required on mobile check-in
    setPendingPunchType('check_in');
    setShowFacePunchModal(true);
  };

  // Handle Punch Out Action (Mandatory phone biometric verification)
  const handlePunchOut = () => {
    // Immediate tactile click vibration for button press confirmation
    hapticCheckOutClick();

    if (!geofenceResult.isInAllowedGeofence || !geofenceResult.activeAuthorizedLocation) {
      hapticError();
      setPunchFeedback({
        success: false,
        type: 'error',
        punchType: 'check_out',
        message: geofenceResult.statusMessage || `Check-out rejected! You are outside authorized office geofence boundary.`,
      });
      return;
    }

    // Biometric is strictly required on mobile check-out
    setPendingPunchType('check_out');
    setShowFacePunchModal(true);
  };

  // Calculate permission hours
  const calculatePermHours = (): number => {
    if (!permStartTime || !permEndTime) return 0;
    const [sh, sm] = permStartTime.split(':').map(Number);
    const [eh, em] = permEndTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = (endMins - startMins) / 60;
    return diff > 0 ? Number(diff.toFixed(2)) : 0;
  };

  // Handle Permission Submit
  const handlePermissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPermValidationError(null);
    setPermSubmittedSuccess(null);

    const hours = calculatePermHours();
    if (hours <= 0) {
      setPermValidationError('Invalid time range. End time must be after start time.');
      return;
    }

    if (!permReason.trim()) {
      setPermValidationError('Please specify a valid reason for your permission slip.');
      return;
    }

    applyPermission({
      permissionType: permType,
      date: permDate,
      startTime: permStartTime,
      endTime: permEndTime,
      durationHours: hours,
      reason: permReason.trim(),
    });

    setPermSubmittedSuccess(`Permission slip for ${hours} hour(s) submitted successfully.`);
    setPermReason('');
  };

  // Calculate leave days
  const calculateLeaveDays = (): number => {
    if (!leaveStartDate || !leaveEndDate) return 1;
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // Handle Leave Submit
  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveValidationError(null);
    setLeaveSubmittedSuccess(null);

    if (!leaveReason.trim()) {
      setLeaveValidationError('Please provide a reason for taking leave.');
      return;
    }

    const totalDays = calculateLeaveDays();
    if (leaveStartDate > leaveEndDate) {
      setLeaveValidationError('End date cannot be earlier than start date.');
      return;
    }

    applyLeave({
      leaveType,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
      totalDays,
      reason: leaveReason.trim(),
    });

    setLeaveSubmittedSuccess(`Leave application for ${totalDays} day(s) submitted successfully.`);
    setLeaveReason('');
  };

  return (
    <div className="min-h-screen bg-[#efe8de] text-stone-900 pb-24 relative font-sans flex flex-col antialiased selection:bg-amber-200">
      {/* ========================================================================= */}
      {/* REAL-TIME IN-APP NOTIFICATION FLOATING BANNER / ALERT TOAST */}
      {/* ========================================================================= */}
      {liveAlertNotification && (
        <div className="fixed top-3 inset-x-3 z-50 max-w-md mx-auto animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="bg-stone-950 border-2 border-emerald-500 text-stone-100 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 relative overflow-hidden ring-4 ring-emerald-500/20">
            {/* Pulsing indicator & icon */}
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/40 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Real-Time HR Alert
                </span>
                <span className="text-[9px] text-stone-400 font-mono">Just now</span>
              </div>
              <h4 className="text-xs font-black text-white leading-tight">
                {liveAlertNotification.title}
              </h4>
              <p className="text-[11px] text-stone-300 leading-snug line-clamp-2">
                {liveAlertNotification.message}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    markNotificationAsRead(liveAlertNotification.id);
                    setLiveAlertNotification(null);
                    setShowNotificationsModal(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markNotificationAsRead(liveAlertNotification.id);
                    setLiveAlertNotification(null);
                  }}
                  className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-[10px] font-bold transition-colors cursor-pointer active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLiveAlertNotification(null)}
              className="text-stone-400 hover:text-stone-200 p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE APP TOP BAR - Streamlined & Touch-Optimized */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 text-stone-100 shadow-md px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
          <div className="relative shrink-0">
            <img
              src={currentEmployee?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'}
              alt={currentEmployee?.name || 'Employee'}
              className="w-10 h-10 rounded-full object-cover border-2 border-stone-700 shadow-xs"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-stone-900" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs font-extrabold text-stone-100 truncate tracking-tight">
                {currentEmployee?.name || 'Employee'}
              </h1>
              {employeeGrade && (
                <span
                  className="text-[9px] font-extrabold px-1.5 py-0.5 rounded text-stone-900 shrink-0 uppercase tracking-wider"
                  style={{ backgroundColor: employeeGrade.color || '#38bdf8' }}
                >
                  {employeeGrade.gradeCode}
                </span>
              )}
            </div>
            <div className="text-[10px] text-stone-400 truncate flex items-center gap-1">
              <span className="font-mono">{currentEmployee?.employeeCode || 'EMP-000'}</span>
              <span>•</span>
              <span className="truncate">{currentEmployee?.designation || 'Staff'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Admin Switcher if authorized */}
          {onSwitchToAdminPortal && (
            <button
              type="button"
              id="mobile-admin-switch-btn"
              onClick={onSwitchToAdminPortal}
              title="Switch to Admin Desk"
              className="px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1 border border-stone-700 transition-colors cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Admin</span>
            </button>
          )}

          {/* Notifications Bell with Dynamic Pulse Badge */}
          <button
            type="button"
            id="mobile-notifications-btn"
            onClick={() => setShowNotificationsModal(true)}
            title="Notifications & Alerts"
            className="relative p-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl transition-all cursor-pointer active:scale-95 border border-stone-700"
          >
            <Bell className="w-4 h-4 text-stone-200" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black px-1.5 py-0.2 rounded-full text-[9px] ring-2 ring-stone-900 shadow-md flex items-center justify-center animate-pulse min-w-[18px]">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Quick Logout Button */}
          <button
            type="button"
            id="mobile-quick-logout-btn"
            onClick={logout}
            title={t('header.logout', 'Log Out')}
            className="p-2 bg-stone-800 hover:bg-rose-950/60 hover:border-rose-700/60 text-stone-300 hover:text-rose-300 rounded-xl transition-all cursor-pointer active:scale-95 border border-stone-700"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN VIEW CONTENT CONTAINER (RESPONSIVE FOR ALL MOBILE SCREENS) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-3 sm:p-4 max-w-md mx-auto w-full space-y-3.5">
        {/* ======================================================================= */}
        {/* TAB 1: HOME (MOBILE DASHBOARD WITH CHECK-IN & CHECK-OUT 2 BUTTONS) */}
        {/* ======================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            {/* Real-Time HR Approval Alert Banner (High-Priority Mobile Highlight) */}
            {latestUnreadApproval && (
              <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-stone-900 border border-emerald-500/60 rounded-2xl p-3 shadow-md text-stone-100 space-y-2 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/90 px-1.5 py-0.5 rounded border border-emerald-700/60">
                          {latestUnreadApproval.type === 'leave_approved' ? 'Leave Approved' : 'Permission Approved'}
                        </span>
                        {!latestUnreadApproval.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </div>
                      <h3 className="text-xs font-extrabold text-white truncate pt-0.5">
                        {latestUnreadApproval.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => markNotificationAsRead(latestUnreadApproval.id)}
                    title="Mark as Read"
                    className="p-1 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-stone-200 leading-snug">
                  {latestUnreadApproval.message}
                </p>

                <div className="flex items-center justify-between pt-1.5 border-t border-emerald-900/60 text-[10px]">
                  <span className="text-stone-400 font-mono">
                    {new Date(latestUnreadApproval.timestamp || (latestUnreadApproval as any).createdAt || Date.now()).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      markNotificationAsRead(latestUnreadApproval.id);
                      setShowNotificationsModal(true);
                    }}
                    className="text-emerald-300 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Notifications</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Greeting & Live Clock Banner */}
            <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-xl p-2.5 sm:p-3 shadow-xs relative overflow-hidden space-y-1.5">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400">
                    <span>
                      {currentTime.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <h2 className="text-xs sm:text-sm font-extrabold text-stone-50 tracking-tight truncate">
                    {greeting}, {currentEmployee?.name ? currentEmployee.name.split(' ')[0] : 'Employee'}!
                  </h2>
                </div>

                {/* Compact Elegant Time Pill */}
                <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-stone-800/90 border border-stone-700/80 rounded-lg shadow-2xs">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-300 tracking-tight">
                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                <span className="flex items-center gap-1.5 truncate max-w-[170px]">
                  <Building2 className="w-3 h-3 text-stone-400 shrink-0" />
                  <span className="truncate">{currentEmployee?.department || 'Operations'}</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>
                    {todayRecord?.checkInTime
                      ? todayRecord.checkOutTime
                        ? 'Shift Completed'
                        : 'On Duty Active'
                      : 'Shift Ready'}
                  </span>
                </span>
              </div>
            </div>

            {/* ========================================================== */}
            {/* CHECK-IN & CHECK-OUT ACTION TERMINAL (ON HOME PAGE) */}
            {/* ========================================================== */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
              {/* Live Geofence & GPS Radar Terminal Widget */}
              <div className="bg-[#fbf9f5] border border-[#ded4c5] rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs ${
                        geofenceResult.isInAllowedGeofence
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {geofenceResult.isInAllowedGeofence ? '✓' : '📍'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase font-extrabold text-stone-500 tracking-wider">
                          Office Geofence
                        </span>
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.2 rounded-full border inline-flex items-center gap-1 ${
                            geofenceResult.isInAllowedGeofence
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              geofenceResult.isInAllowedGeofence ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'
                            }`}
                          />
                          {geofenceResult.isInAllowedGeofence ? 'Inside Geofence' : 'Outside Geofence'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                        {detectedOffice?.name || 'Authorized Office'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      id="btn-mobile-refresh-gps"
                      onClick={handleRefreshGPS}
                      disabled={isRefreshingGPS}
                      title="Force refresh live GPS position from phone hardware"
                      className="px-2 py-1 bg-white hover:bg-stone-100 text-stone-800 border border-[#ded4c5] rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingGPS ? 'animate-spin text-emerald-600' : ''}`} />
                      <span>{isRefreshingGPS ? 'Locating...' : 'Refresh GPS'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRadarMap(!showRadarMap)}
                      title="Toggle radar map view"
                      className={`p-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                        showRadarMap
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-[#ded4c5]'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Distance & GPS Diagnostics */}
                <div className="bg-white p-2.5 rounded-xl border border-[#ded4c5] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="text-stone-500 font-mono">Distance to center:</span>
                    <span className="font-bold font-mono text-stone-900">
                      {formatDistance(geofenceResult?.distanceToNearestMeters || 0)}{' '}
                      <span className="text-stone-400 font-normal font-sans">(Allowed: {detectedOffice?.radiusMeters || 200}m)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono pt-1 border-t border-stone-100">
                    <span>GPS: {(currentCoords?.latitude || 0).toFixed(5)}, {(currentCoords?.longitude || 0).toFixed(5)}</span>
                    <span className="text-stone-600">±{Math.round(currentCoords?.accuracy || 10)}m {isUsingRealGPS ? '(Live GPS)' : '(Simulated)'}</span>
                  </div>
                </div>

                {gpsRefreshMessage && (
                  <div className="text-[10px] font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{gpsRefreshMessage}</span>
                  </div>
                )}

                {/* Discrete HR Admin GPS Calibration Action */}
                {(isCurrentHR || currentEmployee?.role === 'admin') && !geofenceResult?.isInAllowedGeofence && (
                  <div className="pt-0.5 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCalibrateOfficeToMyGPS}
                      className="text-[10px] font-medium text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      Calibrate office to current GPS
                    </button>
                  </div>
                )}

                {/* Collapsible Radar Map */}
                {showRadarMap && (
                  <div className="pt-1 animate-in fade-in zoom-in-95 duration-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span className="font-bold text-stone-700">Live GPS Radar Map</span>
                      <span>Tap anywhere on map to test position</span>
                    </div>
                    <GeofenceMap height="200px" allowClickToTeleport={true} />
                  </div>
                )}
              </div>

              {/* 2 ACTION BUTTONS (CHECK IN & CHECK OUT - BOTH ALWAYS AVAILABLE) */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                <button
                  type="button"
                  id="mobile-home-punch-in-btn"
                  onClick={handlePunchIn}
                  className="w-full min-h-[64px] py-3 px-2 rounded-2xl font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer select-none active:scale-95 bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-900/20 active:bg-emerald-900 border border-emerald-600"
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
                    <span className="text-xs sm:text-sm font-extrabold tracking-tight">Check In</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-90 truncate">
                    {todayRecord?.checkInTime
                      ? `First In: ${todayRecord.checkInTime}`
                      : 'Tap to Clock In'}
                  </span>
                </button>

                <button
                  type="button"
                  id="mobile-home-punch-out-btn"
                  onClick={handlePunchOut}
                  className="w-full min-h-[64px] py-3 px-2 rounded-2xl font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-sm transition-all cursor-pointer select-none active:scale-95 bg-rose-700 hover:bg-rose-800 text-white shadow-rose-900/20 active:bg-rose-900 border border-rose-600"
                >
                  <div className="flex items-center gap-1.5">
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5 text-rose-200" />
                    <span className="text-xs sm:text-sm font-extrabold tracking-tight">Check Out</span>
                  </div>
                  <span className="text-[10px] font-medium opacity-90 truncate">
                    {todayRecord?.checkOutTime
                      ? `Last Out: ${todayRecord.checkOutTime}`
                      : 'Tap to Clock Out'}
                  </span>
                </button>
              </div>

              {/* Punch Feedback Banner */}
              {punchFeedback && (
                <PunchFeedbackCard
                  feedback={punchFeedback}
                  onDismiss={() => setPunchFeedback(null)}
                />
              )}
            </div>

            {/* Today's Punch Summary Card */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-stone-900">Today's Attendance Status</h3>
                    <p className="text-[10px] text-stone-500">
                      {todayRecord?.officeLocationName || detectedOffice?.name || 'Headquarters'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                    todayRecord?.checkInTime
                      ? todayRecord.checkOutTime
                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {todayRecord?.checkInTime
                    ? todayRecord.checkOutTime
                      ? 'COMPLETED'
                      : 'ON DUTY'
                    : 'NOT CHECKED IN'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#fbf9f5] border border-[#ded4c5] p-2.5 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">First In</span>
                  <span className="font-mono font-bold text-stone-900">
                    {todayRecord?.checkInTime || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">Last Out</span>
                  <span className="font-mono font-bold text-stone-900">
                    {todayRecord?.checkOutTime || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">Hours</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {todayRecord?.totalHoursWorked ? `${todayRecord.totalHoursWorked}h` : '0h'}
                  </span>
                </div>
              </div>
            </div>



            {/* Leave & Permission Allowances Overview Widget */}
            <div className="bg-white border border-[#ded4c5] rounded-xl p-3 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-stone-700" />
                  <span className="text-xs font-extrabold text-stone-900">Allowances & Balances</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('apply');
                      setRequestMode('leave');
                    }}
                    className="text-[10px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    + Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('apply');
                      setRequestMode('permission');
                    }}
                    className="text-[10px] font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    + Perm
                  </button>
                </div>
              </div>

              {/* 2 Main Allowances: Annual Leave & Monthly Permission Hours */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Annual Leave (HR Allowance) */}
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-600 truncate">Annual Leave</span>
                    <span className="text-[9px] font-bold font-mono text-amber-800 bg-amber-100/60 px-1 rounded">
                      HR Quota
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-base font-extrabold text-stone-900">
                      {annualLeaveStats.available}
                    </span>
                    <span className="text-[10px] font-medium text-stone-500">
                      / {annualLeaveStats.totalAllowed} Days
                    </span>
                  </div>

                  <div className="w-full bg-stone-200/80 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${annualLeaveStats.percentLeft}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono">
                    <span>{annualLeaveStats.used}d used</span>
                    <span>{annualLeaveStats.percentLeft}% left</span>
                  </div>
                </div>

                {/* 2. Permission Hours (Monthly HR Allowance) */}
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-600 truncate">Permissions</span>
                    <span className="text-[9px] font-bold font-mono text-indigo-800 bg-indigo-100/60 px-1 rounded">
                      {monthlyPermissionUsage.monthName.slice(0, 3)} Cap
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-base font-extrabold text-stone-900">
                      {monthlyPermissionUsage.hoursAvailable}
                    </span>
                    <span className="text-[10px] font-medium text-stone-500">
                      / {monthlyPermissionUsage.hoursCap} Hrs
                    </span>
                  </div>

                  <div className="w-full bg-stone-200/80 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${monthlyPermissionUsage.percentLeft}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-stone-400 font-mono">
                    <span>{monthlyPermissionUsage.hoursUsed}h used</span>
                    <span>{monthlyPermissionUsage.hoursAvailable}h left</span>
                  </div>
                </div>
              </div>

              {/* Secondary Balance Chips (Casual & Sick Leaves) */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="px-2 py-1.5 bg-[#fcfaf7] border border-stone-200 rounded-md flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-medium text-stone-600">Sick Leave</span>
                  <span className="font-mono text-[10px] font-extrabold text-stone-800">
                    {currentEmployee?.leaveBalance?.sick ?? 10} <span className="text-[9px] font-normal text-stone-400">/ {hrAnnualQuota?.sick || 10}d</span>
                  </span>
                </div>

                <div className="px-2 py-1.5 bg-[#fcfaf7] border border-stone-200 rounded-md flex items-center justify-between text-[11px]">
                  <span className="text-[10px] font-medium text-stone-600">Casual Leave</span>
                  <span className="font-mono text-[10px] font-extrabold text-stone-800">
                    {currentEmployee?.leaveBalance?.casual ?? 8} <span className="text-[9px] font-normal text-stone-400">/ {hrAnnualQuota?.casual || 8}d</span>
                  </span>
                </div>
              </div>
            </div>

            {/* My Pending Requests Quick Card */}
            {(myPendingPermissionsCount > 0 || myPendingLeavesCount > 0) && (
              <div
                onClick={() => {
                  setActiveTab('apply');
                  setRequestMode('status');
                }}
                className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:bg-amber-100/70"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                    ⏱️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">Pending Approval Requests</h4>
                    <p className="text-[10px] text-amber-800">
                      {myPendingPermissionsCount} permission(s), {myPendingLeavesCount} leave(s)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-800" />
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: ATTENDANCE (MY ATTENDANCE HISTORY & PAST RECORDS) */}
        {/* ======================================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-stone-100 rounded-xl px-3 py-2 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center">
                    <History className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-stone-50">Attendance and Reports</h2>
                    <p className="text-[9px] text-stone-300">
                      Past logs & monthly analytics
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportAttendancePDF}
                  disabled={filteredMyAttendance.length === 0}
                  className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg text-[9px] font-bold flex items-center gap-1 border border-stone-700 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3 h-3" />
                  <span>PDF Export</span>
                </button>
              </div>
            </div>

            {/* 30-Day Work Hours Bar Chart */}
            <WorkHoursBarChart
              employee={currentEmployee}
              attendanceRecords={attendanceRecords}
              onlyDailyAverage={true}
            />

            {/* Date Picker & Attendance Filter */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CalendarRange className="w-4 h-4 text-stone-700" />
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                    Filter
                  </h4>
                </div>

                {(logStartDate || logEndDate) && (
                  <button
                    type="button"
                    onClick={handleResetDateFilter}
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* From and To Date Pickers */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label htmlFor="mobile-att-start-date" className="text-[10px] font-bold uppercase text-stone-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    <span>From Date:</span>
                  </label>
                  <input
                    id="mobile-att-start-date"
                    type="date"
                    value={logStartDate}
                    onChange={(e) => setLogStartDate(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="mobile-att-end-date" className="text-[10px] font-bold uppercase text-stone-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    <span>To Date:</span>
                  </label>
                  <input
                    id="mobile-att-end-date"
                    type="date"
                    value={logEndDate}
                    onChange={(e) => setLogEndDate(e.target.value)}
                    className="w-full bg-[#fbf9f5] border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-800"
                  />
                </div>
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">Total Logs</span>
                  <span className="text-xs font-mono font-extrabold text-stone-900">
                    {filteredMetrics.totalDays} days
                  </span>
                </div>
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">Daily Average</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-800">
                    {filteredMetrics.avgHoursPerDay} hrs
                  </span>
                </div>
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">On-Time Rate</span>
                  <span className="text-xs font-mono font-extrabold text-blue-800">
                    {filteredMetrics.onTimeRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance Records List & View Mode Switcher */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-600" />
                  <span>My Attendance Records ({filteredMyAttendance.length})</span>
                </h4>
                <div className="flex items-center bg-[#ede4d6] p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAttLayoutMode('table')}
                    className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      attLayoutMode === 'table'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                    title="Full Table View"
                  >
                    <Table className="w-3 h-3" />
                    <span>Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttLayoutMode('cards')}
                    className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      attLayoutMode === 'cards'
                        ? 'bg-stone-900 text-white shadow-2xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                    title="Cards View"
                  >
                    <List className="w-3 h-3" />
                    <span>Cards</span>
                  </button>
                </div>
              </div>

              {filteredMyAttendance.length === 0 ? (
                <div className="p-6 bg-white border border-[#ded4c5] rounded-2xl text-center space-y-2 shadow-2xs">
                  <CalendarDays className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs font-bold text-stone-800">No attendance records found</p>
                  <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                    Try clearing or adjusting your date range filter.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetDateFilter}
                    className="mt-2 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                </div>
              ) : attLayoutMode === 'table' ? (
                /* OPTIMIZED ATTENDANCE FULL DATA TABLE */
                <div className="bg-white border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs w-full">
                  <div className="w-full overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px] table-fixed">
                      <thead className="bg-[#f7f3ec] border-b border-[#ded4c5] text-[9.5px] font-extrabold uppercase text-stone-600 tracking-wider">
                        <tr>
                          <th className="py-2.5 px-2 w-[26%]">Date</th>
                          <th className="py-2.5 px-1.5 w-[22%]">Check-In</th>
                          <th className="py-2.5 px-1.5 w-[22%]">Check-Out</th>
                          <th className="py-2.5 px-1 w-[14%] text-center">Hrs</th>
                          <th className="py-2.5 px-1.5 w-[16%] text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ded4c5]/60">
                        {filteredMyAttendance.map((record) => {
                          const todayIso = new Date().toISOString().split('T')[0];
                          const isTodayRec = record.date === todayIso;
                          const [y, m, d] = (record.date || '').split('-').map(Number);
                          const dateObj = (y && m && d) ? new Date(y, m - 1, d) : new Date();
                          const dayShort = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                          const dateShort = dateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

                          return (
                            <tr key={record.id} className="hover:bg-[#faf7f2] transition-colors">
                              {/* Date Column */}
                              <td className="py-2.5 px-2 align-middle">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-stone-900 text-[10.5px] truncate">
                                    {dateShort}
                                  </span>
                                  <span className={`text-[8.5px] font-extrabold px-1 rounded ${
                                    isTodayRec ? 'bg-amber-100 text-amber-900 font-black' : 'bg-stone-100 text-stone-600'
                                  }`}>
                                    {dayShort}
                                  </span>
                                </div>
                              </td>

                              {/* Check In Column */}
                              <td className="py-2.5 px-1.5 align-middle">
                                <div className="font-mono font-bold text-emerald-800 text-[10.5px] truncate">
                                  {record.checkInTime || '—'}
                                </div>
                                <div className="text-[8.5px] text-stone-400 truncate max-w-[70px]">
                                  {record.officeLocationName ? record.officeLocationName.split(' ')[0] : 'Office'}
                                </div>
                              </td>

                              {/* Check Out Column */}
                              <td className="py-2.5 px-1.5 align-middle">
                                <div className="font-mono font-bold text-blue-800 text-[10.5px] truncate">
                                  {record.checkOutTime || '—'}
                                </div>
                              </td>

                              {/* Hours Column */}
                              <td className="py-2.5 px-1 text-center align-middle">
                                <span className="font-mono font-extrabold text-stone-900 text-[10.5px]">
                                  {record.totalHoursWorked ? `${record.totalHoursWorked}h` : '—'}
                                </span>
                              </td>

                               {/* Status Column */}
                              <td className="py-2.5 px-1.5 text-right align-middle">
                                <span
                                  className={`inline-block px-1 py-0.5 rounded text-[8px] font-black uppercase tracking-tight truncate max-w-full ${
                                    record.status === 'on_time' || record.status === 'completed' || (record.status as string) === 'present'
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                      : record.status === 'late'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                      : record.status === 'half_day'
                                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                      : record.status === 'active'
                                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                      : 'bg-stone-100 text-stone-700 border border-stone-200'
                                  }`}
                                >
                                  {record.status === 'on_time'
                                    ? 'On-Time'
                                    : record.status === 'late'
                                    ? 'Late'
                                    : record.status === 'half_day'
                                    ? 'Half'
                                    : record.status === 'active'
                                    ? 'Active'
                                    : record.status?.toUpperCase() || 'OK'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Table Footer */}
                  <div className="bg-[#f7f3ec] border-t border-[#ded4c5] p-2.5 px-3 flex items-center justify-between text-[10.5px] font-bold text-stone-700">
                    <span>Total Days: {filteredMyAttendance.length}</span>
                    <span className="font-mono text-emerald-800">
                      Total: {filteredMetrics.totalHours} hrs
                    </span>
                  </div>
                </div>
              ) : (
                /* EXPANDED ATTENDANCE CARDS */
                filteredMyAttendance.map((record) => {
                  const todayIso = new Date().toISOString().split('T')[0];
                  const isTodayRec = record.date === todayIso;
                  const [y, m, d] = (record.date || '').split('-').map(Number);
                  const dateObj = (y && m && d) ? new Date(y, m - 1, d) : new Date();
                  const formattedDate = dateObj.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={record.id}
                      className="p-3.5 bg-white border border-[#ded4c5] rounded-2xl space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-stone-900">{formattedDate}</span>
                          {isTodayRec && (
                            <span className="text-[9px] uppercase font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-md">
                              Today
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            record.status === 'on_time'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : record.status === 'late'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : record.status === 'half_day'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-stone-100 text-stone-800 border-stone-300'
                          }`}
                        >
                          {record.status === 'on_time'
                            ? 'ON-TIME'
                            : record.status === 'late'
                            ? 'LATE ENTRY'
                            : record.status === 'half_day'
                            ? 'HALF DAY'
                            : record.status?.toUpperCase() || 'COMPLETED'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 bg-[#fbf9f5] border border-[#ded4c5] p-2 rounded-xl text-center">
                        <div>
                          <span className="text-[9px] uppercase font-semibold text-stone-500 block">In</span>
                          <span className="font-mono font-bold text-stone-900 text-xs">
                            {record.checkInTime || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-semibold text-stone-500 block">Out</span>
                          <span className="font-mono font-bold text-stone-900 text-xs">
                            {record.checkOutTime || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-semibold text-stone-500 block">Hours</span>
                          <span className="font-mono font-extrabold text-emerald-800 text-xs">
                            {record.totalHoursWorked ? `${record.totalHoursWorked} hrs` : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                        <div className="flex items-center gap-1 truncate max-w-[200px]">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span className="truncate">{record.officeLocationName || 'Office HQ'}</span>
                        </div>

                        <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[10px]">
                          <ShieldCheck className="w-3 h-3" />
                          <span>GPS Verified</span>
                        </div>
                      </div>

                      {record.notes && (
                        <div className="text-[11px] text-stone-600 bg-[#f8f5ef] px-2.5 py-1 rounded-lg border border-[#ded4c5]">
                          <span className="font-semibold text-stone-700">Note:</span> {record.notes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: APPLY (PERMISSIONS & LEAVES) */}
        {/* ======================================================================= */}
        {activeTab === 'apply' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Sub-Switch: Permission Slip vs Leave Request vs My Applications */}
            <div className="bg-[#ede4d6] p-1 rounded-xl grid grid-cols-3 gap-1 text-center">
              <button
                type="button"
                onClick={() => setRequestMode('leave')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  requestMode === 'leave'
                    ? 'bg-stone-900 text-stone-50 shadow-xs'
                    : 'text-stone-700 hover:bg-[#ded4c5]'
                }`}
              >
                🏖️ Leave
              </button>
              <button
                type="button"
                onClick={() => setRequestMode('permission')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  requestMode === 'permission'
                    ? 'bg-stone-900 text-stone-50 shadow-xs'
                    : 'text-stone-700 hover:bg-[#ded4c5]'
                }`}
              >
                ⏱️ Permission
              </button>
              <button
                type="button"
                onClick={() => setRequestMode('status')}
                className={`py-2 px-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer relative ${
                  requestMode === 'status'
                    ? 'bg-stone-900 text-stone-50 shadow-xs'
                    : 'text-stone-700 hover:bg-[#ded4c5]'
                }`}
              >
                📋 Track Status
                {(myPendingPermissionsCount > 0 || myPendingLeavesCount > 0) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[#ede4d6]" />
                )}
              </button>
            </div>

            {/* ================= LEAVE APPLICATION FORM ================= */}
            {requestMode === 'leave' && (
              <div className="bg-white border border-[#ded4c5] rounded-2xl p-3 space-y-2.5 shadow-2xs">
                {/* Header & Balance Compact Bar */}
                <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-amber-800" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs font-black text-stone-900 leading-tight truncate">
                        Apply for Leave
                      </h2>
                      <p className="text-[10px] text-stone-500 truncate">
                        Grade {employeeGrade?.gradeCode || 'Standard'} Quota
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-extrabold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] inline-block">
                      {annualLeaveStats.available}/{annualLeaveStats.totalAllowed}d Balance
                    </span>
                  </div>
                </div>

                {leaveSubmittedSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{leaveSubmittedSuccess}</span>
                  </div>
                )}

                {leaveValidationError && (
                  <div className="p-2 bg-rose-50 border border-rose-300 rounded-lg text-rose-900 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">{leaveValidationError}</span>
                  </div>
                )}

                <form onSubmit={handleLeaveSubmit} className="space-y-2">
                  {/* Row 1: Leave Type (2/3 width) + Calculated Duration Badge (1/3 width) */}
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div className="col-span-2 space-y-0.5">
                      <label htmlFor="mobile-leave-type-select" className="text-[10px] font-extrabold uppercase text-stone-600 block">
                        Leave Type *
                      </label>
                      <select
                        id="mobile-leave-type-select"
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                        className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-stone-800"
                      >
                        {allowedLeaveDefs.map((def) => {
                          let optVal: LeaveType = 'casual';
                          if (def.code === 'CL') optVal = 'casual';
                          else if (def.code === 'SL') optVal = 'sick';
                          else if (def.code === 'AL') optVal = 'annual';
                          else if (def.code === 'ML') optVal = 'maternity';
                          else if (def.code === 'PL') optVal = 'paternity';
                          else if (def.code === 'BL') optVal = 'bereavement';
                          else if (def.code === 'UL' || def.code === 'LOP') optVal = 'unpaid';
                          else if (def.code === 'EL' || def.code === 'EML') optVal = 'emergency';

                          return (
                            <option key={def.id} value={optVal}>
                              {def.code} — {def.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold uppercase text-stone-600 block">
                        Duration
                      </span>
                      <div className="bg-[#f5efe4] border border-[#ded4c5] rounded-xl py-1.5 px-2 text-center text-xs font-mono font-black text-stone-900">
                        {calculateLeaveDays()} {calculateLeaveDays() === 1 ? 'Day' : 'Days'}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Date Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label htmlFor="mobile-leave-start-date" className="text-[10px] font-extrabold uppercase text-stone-600 block">
                        Start Date *
                      </label>
                      <input
                        id="mobile-leave-start-date"
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label htmlFor="mobile-leave-end-date" className="text-[10px] font-extrabold uppercase text-stone-600 block">
                        End Date *
                      </label>
                      <input
                        id="mobile-leave-end-date"
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                      />
                    </div>
                  </div>

                  {/* Row 3: Reason */}
                  <div className="space-y-0.5">
                    <label htmlFor="mobile-leave-reason-input" className="text-[10px] font-extrabold uppercase text-stone-600 block">
                      Reason for Leave *
                    </label>
                    <textarea
                      id="mobile-leave-reason-input"
                      rows={2}
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Specify reason for leave..."
                      className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-2.5 py-1.5 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800 resize-none"
                    />
                  </div>

                  {/* Row 4: Submit Button */}
                  <button
                    type="submit"
                    id="submit-leave-btn"
                    className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>Submit Leave Application</span>
                  </button>
                </form>
              </div>
            )}

            {/* ================= PERMISSION SLIP FORM ================= */}
            {requestMode === 'permission' && (
              <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 space-y-4 shadow-2xs">
                <div className="border-b border-[#ded4c5] pb-2.5">
                  <h2 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-stone-700" />
                    <span>Apply for Permission</span>
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    Short-duration official or personal permissions during work hours
                  </p>
                </div>

                {/* Live Monthly Permission Allowance Quick Glance */}
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-700">{monthlyPermissionUsage.monthName} Permissions:</span>
                    <span className="font-mono font-extrabold text-indigo-900 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded text-[11px]">
                      {monthlyPermissionUsage.hoursAvailable} / {monthlyPermissionUsage.hoursCap} Hrs
                    </span>
                  </div>

                  <div className="w-full bg-stone-200/80 h-1 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${monthlyPermissionUsage.percentLeft}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-stone-500 font-mono">
                    <span>HR Cap: {monthlyPermissionUsage.hoursCap}h / mo</span>
                    <span>{monthlyPermissionUsage.hoursUsed > 0 ? `${monthlyPermissionUsage.hoursUsed}h used` : '0 used'} • {monthlyPermissionUsage.hoursAvailable}h left</span>
                  </div>
                </div>

                {permSubmittedSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Permission Slip Submitted!</strong>
                      <span>{permSubmittedSuccess}</span>
                    </div>
                  </div>
                )}

                {permValidationError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{permValidationError}</span>
                  </div>
                )}

                <form onSubmit={handlePermissionSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <label htmlFor="mobile-perm-type-select" className="text-xs font-bold text-stone-700 block">
                      Permission Category *
                    </label>
                    <select
                      id="mobile-perm-type-select"
                      value={permType}
                      onChange={(e) => setPermType(e.target.value as PermissionType)}
                      className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-3 py-2 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                    >
                      <option value="late_entry">⏱️ Late Coming / Delayed Arrival</option>
                      <option value="early_exit">🚪 Early Exit / Early Departure</option>
                      <option value="doctor_appointment">🏥 Hospital / Doctor Appointment</option>
                      <option value="official_duty">💼 Official Field Duty / Client Visit</option>
                      <option value="mid_day_personal">👤 Personal Urgent Work</option>
                      <option value="weather_permission">🌧️ Weather / Transit Disruption</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="mobile-perm-date-input" className="text-xs font-bold text-stone-700 block">
                      Date *
                    </label>
                    <input
                      id="mobile-perm-date-input"
                      type="date"
                      value={permDate}
                      onChange={(e) => setPermDate(e.target.value)}
                      className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-3 py-2 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label htmlFor="mobile-perm-start-time" className="text-xs font-bold text-stone-700 block">
                        From Time *
                      </label>
                      <input
                        id="mobile-perm-start-time"
                        type="time"
                        value={permStartTime}
                        onChange={(e) => setPermStartTime(e.target.value)}
                        className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-3 py-2 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="mobile-perm-end-time" className="text-xs font-bold text-stone-700 block">
                        To Time *
                      </label>
                      <input
                        id="mobile-perm-end-time"
                        type="time"
                        value={permEndTime}
                        onChange={(e) => setPermEndTime(e.target.value)}
                        className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-3 py-2 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#f5efe4] border border-[#ded4c5] rounded-xl flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-700">Calculated Hours:</span>
                    <span className="font-mono font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-[#ded4c5]">
                      {calculatePermHours()} Hours
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="mobile-perm-reason-input" className="text-xs font-bold text-stone-700 block">
                      Reason / Remarks *
                    </label>
                    <textarea
                      id="mobile-perm-reason-input"
                      rows={2}
                      value={permReason}
                      onChange={(e) => setPermReason(e.target.value)}
                      placeholder="Details for manager review..."
                      className="w-full bg-[#fcfaf7] border border-[#ded4c5] rounded-xl px-3 py-2 text-xs font-medium text-stone-900 focus:outline-hidden focus:border-stone-800"
                    />
                  </div>

                  <button
                    type="submit"
                    id="submit-permission-btn"
                    className="w-full bg-stone-900 hover:bg-stone-800 text-stone-50 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit Permission Slip</span>
                  </button>
                </form>
              </div>
            )}

            {/* ================= TRACK REQUEST STATUS ================= */}
            {requestMode === 'status' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
                  <h2 className="text-xs font-extrabold text-stone-900">Application Track History</h2>
                  <div className="flex items-center gap-1 bg-[#ede4d6] p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRequestsFilter('all')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        requestsFilter === 'all' ? 'bg-stone-900 text-stone-50' : 'text-stone-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestsFilter('permissions')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        requestsFilter === 'permissions' ? 'bg-stone-900 text-stone-50' : 'text-stone-700'
                      }`}
                    >
                      Perms
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestsFilter('leaves')}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                        requestsFilter === 'leaves' ? 'bg-stone-900 text-stone-50' : 'text-stone-700'
                      }`}
                    >
                      Leaves
                    </button>
                  </div>
                </div>

                {/* Permissions List */}
                {(requestsFilter === 'all' || requestsFilter === 'permissions') && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Permission Slips ({myPermissions.length})
                    </div>

                    {myPermissions.length === 0 ? (
                      <div className="p-4 bg-white border border-[#ded4c5] rounded-xl text-center text-xs text-stone-500">
                        No permission requests submitted yet.
                      </div>
                    ) : (
                      myPermissions.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 bg-white border border-[#ded4c5] rounded-xl space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900">
                              ⏱️ {req.permissionType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                req.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {req.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 flex items-center justify-between">
                            <span>Date: <strong>{req.date}</strong></span>
                            <span>Time: <strong>{req.startTime} - {req.endTime} ({req.durationHours}h)</strong></span>
                          </div>

                          <p className="text-xs text-stone-700 bg-[#fbf9f5] p-2 rounded-lg border border-[#ded4c5]">
                            "{req.reason}"
                          </p>

                          {req.reviewerComments && (
                            <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-100">
                              <span className="font-semibold text-stone-800">Manager Note:</span> {req.reviewerComments}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Leaves List */}
                {(requestsFilter === 'all' || requestsFilter === 'leaves') && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      Leave Applications ({myLeaves.length})
                    </div>

                    {myLeaves.length === 0 ? (
                      <div className="p-4 bg-white border border-[#ded4c5] rounded-xl text-center text-xs text-stone-500">
                        No leave applications submitted yet.
                      </div>
                    ) : (
                      myLeaves.map((req) => (
                        <div
                          key={req.id}
                          className="p-3 bg-white border border-[#ded4c5] rounded-xl space-y-2 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-stone-900">
                              🏖️ {req.leaveType.toUpperCase()} LEAVE
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                req.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                  : req.currentStage === 'pending_hr'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {req.status === 'approved'
                                ? 'APPROVED ✓'
                                : req.status === 'rejected'
                                ? 'REJECTED'
                                : req.currentStage === 'pending_hr'
                                ? 'HR REVIEW'
                                : 'MGR REVIEW'}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 flex items-center justify-between">
                            <span>Dates: <strong>{req.startDate} to {req.endDate}</strong></span>
                            <span>Duration: <strong>{req.totalDays} Day(s)</strong></span>
                          </div>

                          <p className="text-xs text-stone-700 bg-[#fbf9f5] p-2 rounded-lg border border-[#ded4c5]">
                            "{req.reason}"
                          </p>

                          {(req.managerApproval?.comments || req.hrApproval?.comments || req.reviewerComments) && (
                            <div className="text-[11px] text-stone-600 pt-1 border-t border-stone-100">
                              <span className="font-semibold text-stone-800">Note: </span>
                              {req.hrApproval?.comments || req.managerApproval?.comments || req.reviewerComments}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: LOGS (ALL USER ACTIVITIES IN OPTIMIZED FULL DATA TABLE FORMAT) */}
        {/* ======================================================================= */}
        {activeTab === 'logs' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Header & Controls Card */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-900">
                      Activity Logs
                    </h3>
                    <p className="text-[10px] text-stone-500 font-medium">
                      Punches, leaves, permissions & security events
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportActivityLogsCSV}
                    disabled={filteredActivityLogs.length === 0}
                    title="Export Logs as CSV"
                    className="px-2 py-1 bg-[#ede4d6] hover:bg-[#ded4c5] text-stone-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-3 h-3" />
                    <span>CSV</span>
                  </button>
                  <div className="flex items-center bg-[#ede4d6] p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setLogsLayoutMode('table')}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        logsLayoutMode === 'table'
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                      title="Full Table View"
                    >
                      <Table className="w-3 h-3" />
                      <span>Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogsLayoutMode('cards')}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        logsLayoutMode === 'cards'
                          ? 'bg-stone-900 text-white shadow-2xs'
                          : 'text-stone-700 hover:text-stone-900'
                      }`}
                      title="Cards View"
                    >
                      <List className="w-3 h-3" />
                      <span>Cards</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logActivitySearch}
                  onChange={(e) => setLogActivitySearch(e.target.value)}
                  placeholder="Search logs by keyword, location, date..."
                  className="w-full bg-[#fbf9f5] border border-[#ded4c5] rounded-xl pl-8 pr-7 py-1.5 text-[11px] font-medium text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-stone-800"
                />
                {logActivitySearch && (
                  <button
                    type="button"
                    onClick={() => setLogActivitySearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[10px] font-bold">
                {[
                  { id: 'all', label: 'All Logs' },
                  { id: 'punch', label: 'Punches' },
                  { id: 'leave', label: 'Leaves' },
                  { id: 'permission', label: 'Permissions' },
                  { id: 'auth', label: 'Auth & GPS' },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setLogActivityCategory(chip.id as any)}
                    className={`px-2.5 py-1 rounded-lg shrink-0 transition-all cursor-pointer ${
                      logActivityCategory === chip.id
                        ? 'bg-stone-900 text-stone-50 font-extrabold shadow-2xs'
                        : 'bg-[#fbf9f5] text-stone-600 border border-[#ded4c5] hover:bg-[#ede4d6]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs Table / Cards Container */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl overflow-hidden shadow-2xs">
              {filteredActivityLogs.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <History className="w-8 h-8 text-stone-400 mx-auto" />
                  <p className="text-xs font-bold text-stone-800">No activity recorded matching filter</p>
                  <p className="text-[11px] text-stone-500">
                    Try changing your search query or category filter.
                  </p>
                  {(logActivitySearch || logActivityCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLogActivitySearch('');
                        setLogActivityCategory('all');
                      }}
                      className="mt-2 px-3 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Filters</span>
                    </button>
                  )}
                </div>
              ) : logsLayoutMode === 'table' ? (
                /* OPTIMIZED FULL DATA TABLE WITH ALL COLUMNS VISIBLE ON MOBILE */
                <div className="w-full overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px] table-fixed">
                    <thead className="bg-[#f7f3ec] border-b border-[#ded4c5] text-[9.5px] font-extrabold uppercase text-stone-600 tracking-wider">
                      <tr>
                        <th className="py-2.5 px-2 w-[28%]">Time / Date</th>
                        <th className="py-2.5 px-1.5 w-[36%]">Activity & Details</th>
                        <th className="py-2.5 px-1.5 w-[18%] text-center">Category</th>
                        <th className="py-2.5 px-2 w-[18%] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ded4c5]/60">
                      {filteredActivityLogs.map((log, idx) => {
                        let timeOnly = log.timeFormatted || '';
                        let dateOnly = log.date || '';
                        if (log.timestamp) {
                          try {
                            const d = new Date(log.timestamp);
                            if (!isNaN(d.getTime())) {
                              timeOnly = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                              dateOnly = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            }
                          } catch (e) {
                            // ignore error
                          }
                        }

                        const isPunch = log.category === 'punch' || log.type === 'check_in' || log.type === 'check_out';
                        const isLeave = log.category === 'leave';
                        const isPerm = log.category === 'permission';

                        return (
                          <tr
                            key={log.id || idx}
                            onClick={() => setSelectedActivityLog(log)}
                            className="hover:bg-[#faf7f2] active:bg-[#f3ede3] transition-colors cursor-pointer"
                          >
                            {/* 1. Time / Date Column */}
                            <td className="py-2.5 px-2 align-middle">
                              <div className="font-mono font-bold text-stone-900 text-[10.5px] leading-tight truncate">
                                {timeOnly || log.date}
                              </div>
                              <div className="text-[9px] font-medium text-stone-500 font-mono truncate">
                                {dateOnly || log.date}
                              </div>
                            </td>

                            {/* 2. Activity & Event Details */}
                            <td className="py-2.5 px-1.5 align-middle">
                              <div className="font-bold text-stone-900 text-[10.5px] leading-tight truncate">
                                {log.title}
                              </div>
                              <div className="text-[9px] text-stone-500 truncate max-w-[130px]">
                                {log.locationName || log.description || 'System Log'}
                              </div>
                            </td>

                            {/* 3. Category Column */}
                            <td className="py-2.5 px-1.5 text-center align-middle">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tight truncate max-w-full ${
                                  isPunch
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    : isLeave
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : isPerm
                                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                                }`}
                              >
                                {log.category || log.type || 'Log'}
                              </span>
                            </td>

                            {/* 4. Status Column */}
                            <td className="py-2.5 px-2 text-right align-middle">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-tight truncate max-w-full ${
                                  log.status === 'success' || log.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : log.status === 'warning' || (log.status as string) === 'late'
                                    ? 'bg-amber-100 text-amber-900'
                                    : log.status === 'error' || log.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-900'
                                    : log.status === 'pending'
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-stone-100 text-stone-700'
                                }`}
                              >
                                {log.status || 'Done'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* EXPANDED CARDS VIEW */
                <div className="p-3 space-y-2">
                  {filteredActivityLogs.map((log, idx) => {
                    let formattedTime = log.timeFormatted ? `${log.date} ${log.timeFormatted}` : log.date;
                    if (log.timestamp) {
                      try {
                        const d = new Date(log.timestamp);
                        if (!isNaN(d.getTime())) {
                          formattedTime = d.toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        }
                      } catch (e) {
                        // ignore error
                      }
                    }
                    return (
                      <div
                        key={log.id || idx}
                        onClick={() => setSelectedActivityLog(log)}
                        className="p-3 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl space-y-1.5 text-xs hover:bg-[#f5ede0] transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-extrabold text-stone-900 text-xs truncate">{log.title}</span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-md bg-stone-200 text-stone-700">
                              {log.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-stone-500 shrink-0">{formattedTime}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 leading-snug">{log.description}</p>
                        {log.locationName && (
                          <div className="flex items-center gap-1 text-[10px] text-stone-500 pt-0.5">
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">{log.locationName}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table Footer Bar */}
              <div className="bg-[#f7f3ec] border-t border-[#ded4c5] p-2.5 px-3 flex items-center justify-between text-[10.5px] font-bold text-stone-700">
                <span>Total Events: {filteredActivityLogs.length}</span>
                <span className="text-[9.5px] text-stone-500 font-medium">Tap any row for full details</span>
              </div>
            </div>

            {/* Selected Activity Log Modal */}
            {selectedActivityLog && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-[#ded4c5] max-w-sm w-full p-4 space-y-3.5 shadow-xl animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-stone-900 text-amber-400 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-black text-stone-900 uppercase">Log Entry Details</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedActivityLog(null)}
                      className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-extrabold text-stone-500 block">Event Title</span>
                      <p className="font-black text-stone-900 text-xs">{selectedActivityLog.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">Date & Time</span>
                        <span className="font-mono font-bold text-stone-900 text-[11px]">
                          {selectedActivityLog.timeFormatted ? `${selectedActivityLog.date} ${selectedActivityLog.timeFormatted}` : selectedActivityLog.date}
                        </span>
                      </div>
                      <div className="p-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-stone-500 block">Status</span>
                        <span className="font-black uppercase text-[10px] text-emerald-800">
                          {selectedActivityLog.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl space-y-1">
                      <span className="text-[10px] uppercase font-extrabold text-stone-500 block">Full Description</span>
                      <p className="text-stone-800 text-[11px] leading-relaxed">{selectedActivityLog.description || '—'}</p>
                    </div>

                    {selectedActivityLog.locationName && (
                      <div className="p-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 font-medium">Location:</span>
                        <span className="font-bold text-stone-900">{selectedActivityLog.locationName}</span>
                      </div>
                    )}

                    {selectedActivityLog.deviceInfo && (
                      <div className="p-2 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 font-medium">Device:</span>
                        <span className="font-bold text-stone-900">{selectedActivityLog.deviceInfo}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedActivityLog(null)}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 5: SETTINGS (PROFILE, GPS PREFERENCES & APP INFO) */}
        {/* ======================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Profile Overview Card */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <img
                  src={currentEmployee?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'}
                  alt={currentEmployee?.name || 'Employee'}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#ded4c5]"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-stone-900 truncate">
                    {currentEmployee?.name || 'Employee'}
                  </h3>
                  <p className="text-xs text-stone-600 truncate">{currentEmployee?.designation || 'Staff'}</p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {currentEmployee?.department || 'Operations'} • Code: <strong className="text-stone-800">{currentEmployee?.employeeCode || 'EMP-000'}</strong>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#ded4c5]">
                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                  <span className="text-[10px] text-stone-500 block">Assigned Grade</span>
                  <span className="font-bold text-stone-900 flex items-center gap-1">
                    {employeeGrade?.gradeCode || '—'}
                    {employeeGrade && (
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: employeeGrade.color || '#38bdf8' }}
                      />
                    )}
                  </span>
                </div>

                <div className="p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl">
                  <span className="text-[10px] text-stone-500 block">Joined Date</span>
                  <span className="font-bold text-stone-900 font-mono">
                    {currentEmployee?.joinedDate || '2023-01-01'}
                  </span>
                </div>
              </div>

              {/* Allowances Summary */}
              <div className="pt-2 border-t border-[#ded4c5] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-700 flex items-center gap-1">
                    <span>🏖️</span> Annual Leave Balance:
                  </span>
                  <span className="font-mono font-extrabold text-stone-900">
                    {annualLeaveStats.available} / {annualLeaveStats.totalAllowed} Days ({annualLeaveStats.percentLeft}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-700 flex items-center gap-1">
                    <span>⏱️</span> {monthlyPermissionUsage.monthName} Permission Hours:
                  </span>
                  <span className="font-mono font-extrabold text-stone-900">
                    {monthlyPermissionUsage.hoursAvailable} / {monthlyPermissionUsage.hoursCap} Hrs Available
                  </span>
                </div>
              </div>
            </div>

            {/* GPS & Location Preferences Card */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-[#ded4c5] pb-2">
                <Navigation className="w-4 h-4 text-stone-700" />
                <span>Location & Geofence Settings</span>
              </h4>

              <div className="flex items-center justify-between p-2.5 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl text-xs">
                <div>
                  <strong className="block text-stone-900 font-bold">Real Browser GPS</strong>
                  <span className="text-[10px] text-stone-500">
                    {isUsingRealGPS ? 'Active live device coordinates' : 'Manual Office Location Selected'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={enableRealGPS}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isUsingRealGPS
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-stone-900 text-stone-50'
                  }`}
                >
                  {isUsingRealGPS ? 'GPS Active' : 'Enable GPS'}
                </button>
              </div>

              <div className="text-[11px] text-stone-600 bg-[#f8f5ef] p-3 rounded-xl border border-[#ded4c5] space-y-1">
                <div className="font-bold text-stone-800 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>Auto-Detected Office:</span>
                </div>
                <p className="text-[10px]">
                  {detectedOffice?.name || 'Sharjah Headquarters'} ({detectedOffice?.city || 'Sharjah'}) — Radius {detectedOffice?.radiusMeters || 200}m
                </p>
              </div>

              {/* Proactive 50m Geofence Proximity Alert Settings */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <div>
                      <strong className="block text-xs font-extrabold text-stone-900">
                        {t('prox.setting_title', 'Proactive 50m Geofence Alert')}
                      </strong>
                      <span className="text-[10px] text-stone-600">
                        {pushNotificationPermission === 'granted'
                          ? 'Local Push & Haptics Enabled'
                          : pushNotificationPermission === 'denied'
                          ? 'Push Notifications Blocked'
                          : 'Tap below to enable Push Notifications'}
                      </span>
                    </div>
                  </div>
                  {pushNotificationPermission !== 'granted' && pushNotificationPermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={requestPushNotificationPermission}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[10px] rounded-lg shadow-2xs cursor-pointer"
                    >
                      Allow Push
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={triggerTestProximityAlert}
                  className="w-full py-2 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-700 hover:to-teal-800 text-emerald-100 font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-emerald-600/40"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{t('prox.test_btn', 'Test 50m Proximity Alert & Vibration')}</span>
                </button>
              </div>
            </div>

            {/* Device Security & Policy Card */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 space-y-3 shadow-2xs">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-[#ded4c5] pb-2">
                <Smartphone className="w-4 h-4 text-stone-700" />
                <span>Device Binding & Security</span>
              </h4>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Mobile Device Bound</span>
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                      1-Phone Lock Active
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900 font-medium">
                    {currentEmployee?.deviceBinding?.deviceName || 'Authorized Mobile Device'}
                  </p>
                  <p className="text-[10px] text-emerald-800">
                    Mobile punches and requests are tied strictly to this physical mobile device.
                  </p>
                </div>

                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1">
                  <div className="font-bold text-stone-900 flex items-center gap-1.5">
                    <span>🖥️ Desktop Workstation Access</span>
                    <span className="text-[9px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-bold">Unrestricted</span>
                  </div>
                  <p className="text-[10px] text-stone-600">
                    You can log in freely from any office desktop or PC workstation without device pairing limits.
                  </p>
                </div>
              </div>
            </div>

            {/* Biometric Authentication Settings Card */}
            <div className="bg-white border border-[#ded4c5] rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#ded4c5] pb-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                  {isIPhone ? (
                    <ScanFace className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Fingerprint className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>{isIPhone ? 'Apple Face ID Biometrics' : 'Mobile Fingerprint Biometrics'}</span>
                </h4>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isIPhone
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {isIPhone ? ' Face ID Active' : 'Touch Sensor Active'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#fbf9f5] border border-[#ded4c5] rounded-xl gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isIPhone ? (
                      <ScanFace className="w-4 h-4 text-amber-700 shrink-0" />
                    ) : (
                      <Fingerprint className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                    <strong className="text-xs font-extrabold text-stone-900">
                      {isIPhone ? 'Apple TrueDepth Face ID' : 'Biometric Fingerprint Sensor'}
                    </strong>
                  </div>
                  <p className="text-[10.5px] text-stone-600 leading-snug">
                    {isIPhone
                      ? 'Apple facial recognition is enforced on this iPhone for sign-in and attendance check-in/out.'
                      : 'Biometric fingerprint is enforced on this mobile device for sign-in and attendance check-in/out.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBiometricModal(true)}
                  className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer shadow-2xs"
                >
                  Test Sensor
                </button>
              </div>

              {/* Hardware Device Simulator Switcher (iPhone vs Android) */}
              <div className="p-2.5 bg-stone-100/80 border border-stone-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-800">
                  <span>Phone Biometric Hardware:</span>
                  <span className="font-mono text-[10px] text-stone-600">
                    {isIPhone ? 'Apple iPhone Face ID' : 'Android / Other Phone'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricDeviceOverride('iphone');
                      setBiometricType('face');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isIPhone
                        ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs'
                        : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <ScanFace className="w-3.5 h-3.5 text-amber-700" />
                    iPhone (Face ID)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricDeviceOverride('android');
                      setBiometricType('fingerprint');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      !isIPhone
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-950 shadow-2xs'
                        : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-700" />
                    Other (Fingerprint)
                  </button>
                </div>
              </div>
            </div>

            {/* Admin Desk Switcher if authorized */}
            {onSwitchToAdminPortal && (
              <div className="bg-stone-900 text-stone-100 rounded-2xl p-4 space-y-2 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-amber-400" />
                    <div>
                      <h4 className="text-xs font-extrabold text-stone-50">HR & Admin Workspace Desk</h4>
                      <p className="text-[10px] text-stone-400">Switch to desktop management view</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onSwitchToAdminPortal}
                    className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
                  >
                    Open Desk &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Language Preference Setting */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <div>
                  <h4 className="text-xs font-bold text-stone-100">Language / اللغة</h4>
                  <p className="text-[10px] text-stone-400">Choose display language</p>
                </div>
              </div>
              <LanguageSwitcher variant="pill" className="bg-stone-800 border-stone-700 text-stone-200" />
            </div>

            {/* Log Out Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={logout}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Employee Mobile App</span>
              </button>
            </div>

            {/* App Footer Info */}
            <div className="text-center pt-2 space-y-1">
              <p className="text-[10px] font-mono text-stone-400">
                SAATA Mobile • v2.5.0
              </p>
              <p className="text-[9px] text-stone-400">
                Sharjah Archaeology Authority Mobile Attendance Terminal
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* STICKY BOTTOM NAVIGATION BAR (FIXED BOTTOM MENU ITEMS) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 text-stone-300 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16">
          {/* 1. HOME */}
          <button
            type="button"
            id="mobile-nav-home"
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              activeTab === 'home'
                ? 'text-amber-400 font-bold border-t-2 border-amber-400 bg-stone-800/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          {/* 2. ATTENDANCE */}
          <button
            type="button"
            id="mobile-nav-attendance"
            onClick={() => setActiveTab('attendance')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              activeTab === 'attendance'
                ? 'text-amber-400 font-bold border-t-2 border-amber-400 bg-stone-800/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Attendance</span>
          </button>

          {/* 3. APPLY */}
          <button
            type="button"
            id="mobile-nav-apply"
            onClick={() => setActiveTab('apply')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              activeTab === 'apply'
                ? 'text-amber-400 font-bold border-t-2 border-amber-400 bg-stone-800/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Apply</span>
            {(myPendingPermissionsCount > 0 || myPendingLeavesCount > 0) && (
              <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-stone-900" />
            )}
          </button>

          {/* 4. LOGS */}
          <button
            type="button"
            id="mobile-nav-logs"
            onClick={() => setActiveTab('logs')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              activeTab === 'logs'
                ? 'text-amber-400 font-bold border-t-2 border-amber-400 bg-stone-800/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Logs</span>
          </button>

          {/* 5. SETTINGS */}
          <button
            type="button"
            id="mobile-nav-settings"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
              activeTab === 'settings'
                ? 'text-amber-400 font-bold border-t-2 border-amber-400 bg-stone-800/60'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/30'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Settings</span>
          </button>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* MOBILE NOTIFICATIONS & REAL-TIME ALERTS MODAL */}
      {/* ============================================================ */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#ded4c5] rounded-3xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl max-h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#ded4c5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-xs">
                  <Bell className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-stone-900 tracking-tight">
                    In-App Notification Center
                  </h3>
                  <p className="text-[10px] text-stone-500 font-medium">
                    {unreadNotificationCount} unread alert{unreadNotificationCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadNotificationCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-extrabold underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1 text-stone-400 hover:text-stone-800 hover:bg-[#ede4d6] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#ede4d6] rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setNotificationCategoryFilter('all')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  notificationCategoryFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All ({myNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setNotificationCategoryFilter('approvals')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  notificationCategoryFilter === 'approvals'
                    ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Approvals ({recentApprovalNotifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setNotificationCategoryFilter('unread')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer ${
                  notificationCategoryFilter === 'unread'
                    ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Unread ({unreadNotificationCount})
              </button>
            </div>

            {/* Notification items list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-10 text-stone-500 text-xs space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                    <Bell className="w-5 h-5 opacity-60" />
                  </div>
                  <p className="font-bold text-xs text-stone-700">No notifications found</p>
                  <p className="text-[10px] text-stone-400 max-w-[200px] mx-auto leading-relaxed">
                    {notificationCategoryFilter === 'approvals'
                      ? 'No HR or Manager approval alerts yet.'
                      : notificationCategoryFilter === 'unread'
                      ? 'You have caught up with all notifications.'
                      : 'Workflow approvals and announcements will show here.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isApproval = notif.type === 'leave_approved' || notif.type === 'permission_approved';
                  const isRejected = notif.type === 'leave_rejected' || notif.type === 'permission_rejected';
                  const isForwarded = notif.type === 'leave_forwarded_hr';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationAsRead(notif.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-xs space-y-1.5 relative ${
                        isApproval
                          ? notif.isRead
                            ? 'bg-emerald-50/40 border-emerald-200/80 text-stone-800'
                            : 'bg-emerald-50 border-emerald-400 text-emerald-950 font-medium ring-1 ring-emerald-300'
                          : isRejected
                          ? notif.isRead
                            ? 'bg-rose-50/40 border-rose-200/80 text-stone-800'
                            : 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                          : isForwarded
                          ? notif.isRead
                            ? 'bg-amber-50/40 border-amber-200/80 text-stone-800'
                            : 'bg-amber-50 border-amber-300 text-amber-950 font-medium ring-1 ring-amber-300'
                          : notif.isRead
                          ? 'bg-[#fbf9f5] border-[#ded4c5] text-stone-700'
                          : 'bg-amber-50/70 border-amber-300 text-amber-950 font-medium'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isApproval ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : isRejected ? (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : isForwarded ? (
                            <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />
                          ) : (
                            <Info className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                          <span className="font-bold text-stone-900 text-[11px] truncate">
                            {notif.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          )}
                          <span className="text-[9px] text-stone-400 font-mono">
                            {new Date(notif.timestamp || (notif as any).createdAt || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-stone-600 text-[11px] leading-relaxed pl-5.5">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[9px] text-stone-400 pl-5.5">
                        <span className="capitalize">
                          {isApproval ? 'Status: Approved' : isRejected ? 'Status: Rejected' : 'Notification'}
                        </span>
                        <span className="text-emerald-700 font-bold">
                          {notif.isRead ? 'Read' : 'Tap to mark read'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-[#ded4c5] flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotificationsModal(false)}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-xl text-xs font-bold transition-colors cursor-pointer active:scale-98"
              >
                Close Notification Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* PUNCH BIOMETRIC VERIFICATION MODAL (APPLE FACE ID / PHONE FINGERPRINT) */}
      {/* ======================================================================= */}
      <BiometricAuthModal
        isOpen={showFacePunchModal}
        onClose={() => setShowFacePunchModal(false)}
        onSuccess={(verifiedType) => {
          setShowFacePunchModal(false);
          executeFinalPunch(pendingPunchType, true, verifiedType);
        }}
        actionType={pendingPunchType}
        employeeName={currentEmployee?.name || 'Employee'}
        employeeCode={currentEmployee?.employeeCode}
        department={currentEmployee?.department}
        customTitle={
          isIPhone
            ? pendingPunchType === 'check_in'
              ? 'Apple Face ID Check-In'
              : 'Apple Face ID Check-Out'
            : pendingPunchType === 'check_in'
            ? 'Fingerprint Check-In'
            : 'Fingerprint Check-Out'
        }
        customSubtitle={
          isIPhone
            ? `Hold your iPhone in front of your face to verify your attendance punch for ${currentEmployee?.name}`
            : `Place and hold your registered finger on the sensor to verify attendance punch`
        }
      />

      {/* ======================================================================= */}
      {/* SETTINGS / HARDWARE TEST BIOMETRIC MODAL */}
      {/* ======================================================================= */}
      <BiometricAuthModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onSuccess={() => {
          setShowBiometricModal(false);
          setBiometricEnabled(true);
        }}
        actionType="test"
        employeeName={currentEmployee?.name || 'Employee'}
        employeeCode={currentEmployee?.employeeCode}
        department={currentEmployee?.department}
        customTitle={isIPhone ? 'Apple Face ID Hardware Test' : 'Biometric Sensor Hardware Test'}
      />
    </div>
  );
};
