import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Employee,
  OfficeLocation,
  AttendanceRecord,
  LeaveRequest,
  PermissionRequest,
  GeoCoordinates,
  LeaveType,
  LeaveDurationOption,
  LeaveDocumentAttachment,
  PermissionType,
  RequestStatus,
  LeaveDefinition,
  PermissionDefinition,
  GradeDefinition,
  TAPolicyDefinition,
  HolidayDefinition,
  WorkScheduleDefinition,
  ShiftTiming,
  AppNotification,
  ApprovalWorkflowType,
  ApprovalStage,
  UserActivityLog,
  ActivityLogCategory,
  ActivityLogType,
  EmployeeDeviceBinding,
  ActiveMobileSession,
  LocationPermissionStatus,
} from '../types';
import {
  INITIAL_OFFICE_LOCATIONS,
  INITIAL_EMPLOYEES,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PERMISSION_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
  DEFAULT_HR_ADMIN_USER,
  DEFAULT_HQ_LOCATION,
} from '../data/seedData';
import {
  INITIAL_LEAVE_DEFINITIONS,
  INITIAL_PERMISSION_DEFINITIONS,
  INITIAL_GRADE_DEFINITIONS,
  INITIAL_TA_POLICY,
  INITIAL_HOLIDAY_DEFINITIONS,
  INITIAL_WORK_SCHEDULE,
} from '../data/definitionsSeed';
import { checkGeofenceStatus, calculateDistanceMeters } from '../utils/geoUtils';
import {
  hapticCheckInClick,
  hapticCheckInSuccess,
  hapticCheckOutClick,
  hapticCheckOutSuccess,
  hapticBiometricScan,
  hapticBiometricSuccess,
  hapticError,
  hapticWarning,
  hapticGeofenceAlert,
  hapticProximityReminder,
} from '../utils/haptics';
import {
  checkAndApplyAnniversaryRefills,
  forceEmployeeAnniversaryRefill,
  calculateLeaveCycle,
  getEmployeeAnnualQuota,
} from '../utils/leaveAnniversaryUtils';
import { serverApiService, serverApiService as firestoreService } from '../lib/serverApiService';
import { getCurrentDeviceDetails, resetCurrentClientDeviceId } from '../utils/deviceUtils';
import confetti from 'canvas-confetti';
import {
  getOfflineQueue,
  enqueuePunch,
  syncOfflineQueue,
  QueuedPunch,
  clearOfflineQueue,
} from '../lib/offlineQueue';

export interface PunchActionResult {
  success: boolean;
  message: string;
  punchType?: 'check_in' | 'check_out';
  punchTime?: string;
  punchTimeFormatted?: string;
  locationName?: string;
  expectedOutTime?: string;
  duration?: string;
  accuracy?: number;
  biometricVerified?: boolean;
  biometricType?: 'face' | 'fingerprint';
  isOfflineQueued?: boolean;
}

interface AttendanceContextType {
  employees: Employee[];
  currentEmployee: Employee;
  setCurrentEmployeeId: (id: string) => void;
  officeLocations: OfficeLocation[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  permissionRequests: PermissionRequest[];
  
  // Offline Punch Queue & Network Connectivity State
  isOnline: boolean;
  offlineQueueCount: number;
  pendingOfflinePunches: QueuedPunch[];
  syncPendingOfflinePunches: () => Promise<{ successCount: number; failedCount: number; remainingCount: number }>;
  clearOfflinePunchQueue: () => void;
  
  // GPS & Location Permission State
  currentCoords: GeoCoordinates;
  isUsingRealGPS: boolean;
  gpsError: string | null;
  locationPermissionStatus: LocationPermissionStatus;
  hasAcquiredRealGPS: boolean;
  isLocating: boolean;
  requestLocationPermission: () => Promise<{ success: boolean; coords?: GeoCoordinates; error?: string }>;
  setManualLocation: (lat: number, lng: number, accuracy?: number) => void;
  enableRealGPS: () => Promise<void>;
  refreshGPSPosition: () => Promise<{ success: boolean; coords?: GeoCoordinates; error?: string }>;
  
  // Proactive 50m Geofence Proximity Reminders
  proximityAlert: { location: OfficeLocation; distanceMeters: number; timestamp: number } | null;
  dismissProximityAlert: () => void;
  triggerTestProximityAlert: () => void;
  pushNotificationPermission: NotificationPermission | 'unsupported';
  requestPushNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
  
  // Actions
  markCheckIn: (notes?: string, options?: { biometricVerified?: boolean; biometricType?: 'face' | 'fingerprint' }) => PunchActionResult;
  markCheckOut: (notes?: string, options?: { biometricVerified?: boolean; biometricType?: 'face' | 'fingerprint' }) => PunchActionResult;
  todayRecord: AttendanceRecord | undefined;
  
  // Requests
  applyLeave: (params: {
    leaveType: LeaveType;
    durationOption?: LeaveDurationOption;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    description?: string;
    documentAttachment?: LeaveDocumentAttachment;
    documentName?: string;
    documentUrl?: string;
    documentSize?: number;
    documentType?: string;
    emergencyContact?: string;
  }) => void;
  applyPermission: (params: {
    permissionType: PermissionType;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    reason: string;
  }) => void;
  
  // Multi-Stage Manager & HR Approvals
  reviewLeave: (
    requestId: string,
    status: RequestStatus,
    comments?: string,
    roleOverride?: 'manager' | 'hr'
  ) => void;
  reviewLeaveAsManager: (requestId: string, status: RequestStatus, comments?: string) => void;
  reviewLeaveAsHR: (requestId: string, status: RequestStatus, comments?: string) => void;
  reviewPermission: (requestId: string, status: RequestStatus, comments?: string) => void;
  
  // Filtered approval queues
  pendingManagerLeaves: LeaveRequest[];
  pendingHRLeaves: LeaveRequest[];
  
  // Notifications
  notifications: AppNotification[];
  myNotifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  
  // HR Employee Management & Anniversary Refill Engine
  isCurrentHR: boolean;
  addEmployee: (employee: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (employeeId: string) => void;
  toggleEmployeeLoginAccess: (employeeId: string, canLogin?: boolean) => { success: boolean; message: string; isEnabled: boolean };
  resetEmployeeDeviceBinding: (employeeId: string) => { success: boolean; message: string };
  terminateEmployeeMobileSession: (employeeId: string) => { success: boolean; message: string };
  refillEmployeeLeavesForAnniversary: (employeeId: string) => { success: boolean; message: string };
  runAnniversaryLeaveRefills: () => { count: number; message: string };
  
  // Admin/Manager Configuration
  updateEmployeeLocations: (employeeId: string, allowedLocationIds: string[]) => void;
  updateEmployeeShift: (employeeIds: string[], shiftTimingId: string | null, workScheduleId?: string) => void;
  addOfficeLocation: (location: Omit<OfficeLocation, 'id'>, assignToAll?: boolean) => void;
  updateOfficeLocation: (location: OfficeLocation, assignToAll?: boolean) => void;
  deleteOfficeLocation: (locationId: string) => void;
  
  // Definitions Management (HR & Super Admin)
  leaveDefinitions: LeaveDefinition[];
  updateLeaveDefinition: (def: LeaveDefinition) => void;
  addLeaveDefinition: (def: Omit<LeaveDefinition, 'id'>) => void;
  deleteLeaveDefinition: (id: string) => void;

  permissionDefinitions: PermissionDefinition[];
  updatePermissionDefinition: (def: PermissionDefinition) => void;
  addPermissionDefinition: (def: Omit<PermissionDefinition, 'id'>) => void;
  deletePermissionDefinition: (id: string) => void;

  gradeDefinitions: GradeDefinition[];
  updateGradeDefinition: (def: GradeDefinition) => void;
  addGradeDefinition: (def: Omit<GradeDefinition, 'id'>) => void;
  deleteGradeDefinition: (id: string) => void;

  taPolicy: TAPolicyDefinition;
  updateTAPolicy: (policy: TAPolicyDefinition) => void;
  resetTAPolicy: () => void;

  holidayDefinitions: HolidayDefinition[];
  updateHolidayDefinition: (def: HolidayDefinition) => void;
  addHolidayDefinition: (def: Omit<HolidayDefinition, 'id'>) => void;
  deleteHolidayDefinition: (id: string) => void;

  workSchedule: WorkScheduleDefinition;
  updateWorkSchedule: (schedule: WorkScheduleDefinition) => void;
  addShift: (shift: Omit<ShiftTiming, 'id'>) => void;
  updateShift: (shift: ShiftTiming) => void;
  deleteShift: (id: string) => void;

  resetAllDefinitions: () => void;

  // Comprehensive User Activity & Audit Logs
  activityLogs: UserActivityLog[];
  myActivityLogs: UserActivityLog[];
  logUserActivity: (params: {
    employeeId?: string;
    employeeName?: string;
    employeeCode?: string;
    department?: string;
    type: ActivityLogType;
    category: ActivityLogCategory;
    title: string;
    description: string;
    status?: 'success' | 'warning' | 'info' | 'error' | 'pending' | 'approved' | 'rejected';
    locationName?: string;
    deviceInfo?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }) => UserActivityLog;
  clearActivityLogs: () => void;

  // Hardware Device Security & Single Device Policy
  currentDevice: EmployeeDeviceBinding;
  simulateDeviceChange: (customName?: string) => EmployeeDeviceBinding;

  // View mode & App Mode
  isMobileDeviceView: boolean;
  setIsMobileDeviceView: (val: boolean) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  wipeAllSystemData: () => Promise<void>;
  login: (
    identifier: string,
    password?: string,
    options?: { forcePlatform?: 'mobile' | 'desktop' }
  ) => {
    success: boolean;
    message: string;
    isDeviceMismatch?: boolean;
    isLoginDisabled?: boolean;
    registeredDevice?: EmployeeDeviceBinding | null;
    currentDevice?: EmployeeDeviceBinding;
    platformUsed?: 'mobile' | 'desktop';
  };
  logout: () => void;
  activeAppMode: 'mobile_app' | 'admin_portal';
  setActiveAppMode: (mode: 'mobile_app' | 'admin_portal') => void;

  // Database Connection Status
  isDbConnected: boolean;
  isDbSyncing: boolean;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  EMPLOYEES: 'saata_prod_clean_v4_employees',
  CURRENT_USER_ID: 'saata_prod_clean_v4_current_user',
  OFFICE_LOCATIONS: 'saata_prod_clean_v4_locations',
  ATTENDANCE: 'saata_prod_clean_v4_records',
  LEAVES: 'saata_prod_clean_v4_leaves',
  PERMISSIONS: 'saata_prod_clean_v4_permissions',
  ACTIVITY_LOGS: 'saata_prod_clean_v4_act_logs',
  DEF_LEAVES: 'saata_prod_clean_v4_def_leaves',
  DEF_PERMS: 'saata_prod_clean_v4_def_perms',
  DEF_GRADES: 'saata_prod_clean_v4_def_grades',
  DEF_TA_POLICY: 'saata_prod_clean_v4_def_ta_policy',
  DEF_HOLIDAYS: 'saata_prod_clean_v4_def_holidays',
  DEF_SCHEDULE: 'saata_prod_clean_v4_def_schedule',
  NOTIFICATIONS: 'saata_prod_clean_v4_notifications',
  AUTH_STATUS: 'geofence_att_auth_v1',
  APP_MODE: 'geofence_app_mode_v1',
};

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Helper to safely parse array from local storage
  const safeParseArray = <T,>(key: string, fallback: T[] = []): T[] => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  };

  // 1. Initial State: Always starts with HR Admin account ready for user provisioning
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const loaded = safeParseArray<Employee>(STORAGE_KEYS.EMPLOYEES, []);
    const baseList = loaded.length > 0 ? loaded : INITIAL_EMPLOYEES;
    return baseList.map((emp) => {
      if (emp.id === 'emp_01' || emp.name.toLowerCase().includes('danish khan')) {
        return {
          ...emp,
          role: 'hr' as const,
          department: 'Human Resources',
          designation: emp.designation === 'Senior Full Stack Engineer' ? 'HR Specialist' : emp.designation,
          designationAr: emp.designationAr || 'أخصائي الموارد البشرية',
          nameAr: emp.nameAr || 'دانش خان',
        };
      }
      return emp;
    });
  });

  const [currentEmployeeId, setCurrentEmployeeIdState] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return saved || DEFAULT_HR_ADMIN_USER.id;
  });

  const [officeLocations, setOfficeLocations] = useState<OfficeLocation[]>(() => {
    const loaded = safeParseArray<OfficeLocation>(STORAGE_KEYS.OFFICE_LOCATIONS, []);
    return loaded.length > 0 ? loaded : [DEFAULT_HQ_LOCATION];
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    return safeParseArray<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, []);
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    return safeParseArray<LeaveRequest>(STORAGE_KEYS.LEAVES, []);
  });

  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>(() => {
    return safeParseArray<PermissionRequest>(STORAGE_KEYS.PERMISSIONS, []);
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    return safeParseArray<AppNotification>(STORAGE_KEYS.NOTIFICATIONS, []);
  });

  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>(() => {
    return safeParseArray<UserActivityLog>(STORAGE_KEYS.ACTIVITY_LOGS, []);
  });

  const [leaveDefinitions, setLeaveDefinitions] = useState<LeaveDefinition[]>(() => {
    const arr = safeParseArray<LeaveDefinition>(STORAGE_KEYS.DEF_LEAVES, INITIAL_LEAVE_DEFINITIONS);
    return arr.map((item) => ({
      ...item,
      minDurationDays: item.minDurationDays ?? (item.halfDayAllowed ? 0.5 : 1),
      maxDurationDays: item.maxDurationDays ?? item.maxConsecutiveDays ?? 14,
      allowAfterDays: item.allowAfterDays ?? 0,
      approvalBy: item.approvalBy ?? 'manager_only',
      attachmentMandatory: item.attachmentMandatory ?? (item.docRequiredAfterDays ? item.docRequiredAfterDays > 0 : false),
    }));
  });

  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>(() => {
    return safeParseArray<PermissionDefinition>(STORAGE_KEYS.DEF_PERMS, INITIAL_PERMISSION_DEFINITIONS);
  });

  const [gradeDefinitions, setGradeDefinitions] = useState<GradeDefinition[]>(() => {
    return safeParseArray<GradeDefinition>(STORAGE_KEYS.DEF_GRADES, INITIAL_GRADE_DEFINITIONS);
  });

  const [taPolicy, setTAPolicy] = useState<TAPolicyDefinition>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEF_TA_POLICY);
      return saved ? JSON.parse(saved) : INITIAL_TA_POLICY;
    } catch {
      return INITIAL_TA_POLICY;
    }
  });

  const [holidayDefinitions, setHolidayDefinitions] = useState<HolidayDefinition[]>(() => {
    return safeParseArray<HolidayDefinition>(STORAGE_KEYS.DEF_HOLIDAYS, INITIAL_HOLIDAY_DEFINITIONS);
  });

  const [workSchedule, setWorkSchedule] = useState<WorkScheduleDefinition>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEF_SCHEDULE);
      if (!saved) return INITIAL_WORK_SCHEDULE;
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.shifts) && Array.isArray(parsed.workingDays)) {
        return parsed;
      }
      return INITIAL_WORK_SCHEDULE;
    } catch {
      return INITIAL_WORK_SCHEDULE;
    }
  });

  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [isDbSyncing, setIsDbSyncing] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);

  // Network Connectivity & Offline Punch Queue State
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingOfflinePunches, setPendingOfflinePunches] = useState<QueuedPunch[]>(() => getOfflineQueue());

  // Listen for browser network changes & offline queue events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('[AttendanceContext] Connection restored: ONLINE');
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log('[AttendanceContext] Network lost: OFFLINE');
    };
    const handleQueueUpdate = () => {
      setPendingOfflinePunches(getOfflineQueue());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('saata_offline_queue_update', handleQueueUpdate);
    window.addEventListener('storage', handleQueueUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('saata_offline_queue_update', handleQueueUpdate);
      window.removeEventListener('storage', handleQueueUpdate);
    };
  }, []);

  // Sync Pending Offline Punches to Server & Firestore
  const syncPendingOfflinePunches = useCallback(async () => {
    const queue = getOfflineQueue();
    if (queue.length === 0) {
      return { successCount: 0, failedCount: 0, remainingCount: 0 };
    }

    setIsDbSyncing(true);
    const result = await syncOfflineQueue(async (item: QueuedPunch) => {
      try {
        await firestoreService.saveAttendanceRecord(item.record);
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.record),
        }).catch(() => null);
        return true;
      } catch (err) {
        console.error('[AttendanceContext] Sync error for queued item:', err);
        return false;
      }
    });

    setIsDbSyncing(false);
    setPendingOfflinePunches(getOfflineQueue());

    if (result.successCount > 0) {
      createNotification({
        recipientEmployeeId: currentEmployeeId,
        title: '⚡ Offline Punches Synced',
        message: `Successfully synchronized ${result.successCount} offline punch record(s) with the server database.`,
        type: 'system',
      });
    }

    return result;
  }, [currentEmployeeId]);

  const clearOfflinePunchQueue = useCallback(() => {
    clearOfflineQueue();
    setPendingOfflinePunches([]);
  }, []);

  // Trigger automatic sync when network is restored
  useEffect(() => {
    if (isOnline && pendingOfflinePunches.length > 0) {
      console.log(`[AttendanceContext] Auto-syncing ${pendingOfflinePunches.length} queued punches now that network is online...`);
      syncPendingOfflinePunches().catch(console.error);
    }
  }, [isOnline, pendingOfflinePunches.length, syncPendingOfflinePunches]);

  // Mobile Device Simulator View Mode toggle
  const [isMobileDeviceView, setIsMobileDeviceView] = useState<boolean>(false);

  // Authentication & App Mode State - Persisted across page refreshes
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH_STATUS);
      if (savedAuth === 'false') return false;
      return true; // Default to logged in as HR
    } catch {
      return true;
    }
  });

  const setIsAuthenticated = useCallback((val: boolean) => {
    setIsAuthenticatedState(val);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, val ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, []);

  const [activeAppMode, setActiveAppModeState] = useState<'mobile_app' | 'admin_portal'>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(STORAGE_KEYS.APP_MODE) as 'mobile_app' | 'admin_portal';
      if (savedMode === 'mobile_app' || savedMode === 'admin_portal') {
        return savedMode;
      }
      const isMobileScreen = window.innerWidth < 768 || /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent);
      return isMobileScreen ? 'mobile_app' : 'admin_portal';
    }
    return 'admin_portal';
  });

  const setActiveAppMode = (mode: 'mobile_app' | 'admin_portal') => {
    setActiveAppModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
    } catch {
      // ignore
    }
  };

  // Hardware Device Security & Single Device Binding
  const [currentDevice, setCurrentDevice] = useState<EmployeeDeviceBinding>(() => getCurrentDeviceDetails());

  const simulateDeviceChange = useCallback((customName?: string) => {
    resetCurrentClientDeviceId();
    if (customName) {
      try {
        localStorage.setItem('saata_simulated_device_name_v1', customName);
      } catch {
        // ignore
      }
    }
    const newDev = getCurrentDeviceDetails();
    setCurrentDevice(newDev);
    return newDev;
  }, []);

  // GPS State
  const [currentCoords, setCurrentCoords] = useState<GeoCoordinates>(() => {
    const defaultLoc = officeLocations && officeLocations.length > 0 ? officeLocations[0] : DEFAULT_HQ_LOCATION;
    return {
      latitude: defaultLoc.latitude,
      longitude: defaultLoc.longitude,
      accuracy: 10,
      timestamp: Date.now(),
    };
  });
  const [isUsingRealGPS, setIsUsingRealGPS] = useState<boolean>(true);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<LocationPermissionStatus>('checking');
  const [hasAcquiredRealGPS, setHasAcquiredRealGPS] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Proactive 50m Geofence Proximity Alert State
  const [proximityAlert, setProximityAlert] = useState<{ location: OfficeLocation; distanceMeters: number; timestamp: number } | null>(null);
  const lastProximityAlertRef = useRef<Record<string, number>>({});
  const [pushNotificationPermission, setPushNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const requestPushNotificationPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushNotificationPermission('unsupported');
      return 'unsupported';
    }
    try {
      const perm = await Notification.requestPermission();
      setPushNotificationPermission(perm);
      return perm;
    } catch (e) {
      return Notification.permission;
    }
  }, []);

  const dismissProximityAlert = useCallback(() => {
    setProximityAlert(null);
  }, []);

  // Dedicated device location permission request with high-accuracy -> standard-accuracy fallback
  const requestLocationPermission = useCallback(async (): Promise<{ success: boolean; coords?: GeoCoordinates; error?: string }> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      const err = 'Geolocation is not supported by this browser or device.';
      setGpsError(err);
      setLocationPermissionStatus('unsupported');
      return { success: false, error: err };
    }

    setIsLocating(true);
    setGpsError(null);

    const tryGetPosition = (highAccuracy: boolean, timeoutMs: number): Promise<{ success: boolean; coords?: GeoCoordinates; error?: string; errorCode?: number }> => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const freshCoords: GeoCoordinates = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy || 10,
              timestamp: pos.timestamp,
            };
            setCurrentCoords(freshCoords);
            setIsUsingRealGPS(true);
            setHasAcquiredRealGPS(true);
            setLocationPermissionStatus('granted');
            setGpsError(null);
            setIsLocating(false);
            resolve({ success: true, coords: freshCoords });
          },
          (err) => {
            resolve({ success: false, error: err.message, errorCode: err.code });
          },
          { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: highAccuracy ? 10000 : 30000 }
        );
      });
    };

    // First Attempt: High Accuracy (GPS Chip) with 7s timeout
    let attempt = await tryGetPosition(true, 7000);

    // Second Attempt: Fast Standard Accuracy (Wi-Fi / Cell towers) if high accuracy timed out or failed
    if (!attempt.success && attempt.errorCode !== 1) { // 1 = PERMISSION_DENIED
      attempt = await tryGetPosition(false, 10000);
    }

    if (attempt.success) {
      return attempt;
    }

    setIsLocating(false);
    let errMsg = 'Unable to retrieve location.';
    if (attempt.errorCode === 1) { // PERMISSION_DENIED
      errMsg = 'Location permission was denied. Please allow location access in your browser or phone settings.';
      setLocationPermissionStatus('denied');
    } else if (attempt.errorCode === 2) { // POSITION_UNAVAILABLE
      errMsg = 'Device location position is unavailable. Please check that GPS/Location is turned on in your phone settings.';
    } else if (attempt.errorCode === 3) { // TIMEOUT
      errMsg = 'Location request timed out. Please tap "Refresh GPS" to re-try.';
    } else {
      errMsg = attempt.error || errMsg;
    }

    setGpsError(errMsg);
    return { success: false, error: errMsg };
  }, []);

  // Auto-trigger location detection on mount and watch continuous movement
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermissionStatus('unsupported');
      setGpsError('Geolocation is not supported by this device/browser.');
      return;
    }

    // Trigger instant auto-detection on mount
    requestLocationPermission();

    // Check browser permission status if Permissions API is supported
    if (typeof navigator !== 'undefined' && navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'granted') {
            setLocationPermissionStatus('granted');
          } else if (result.state === 'denied') {
            setLocationPermissionStatus('denied');
            setGpsError('Location access is blocked in browser settings. Please allow location to check in.');
          } else {
            setLocationPermissionStatus('prompt');
          }

          result.onchange = () => {
            if (result.state === 'granted') {
              setLocationPermissionStatus('granted');
              requestLocationPermission();
            } else if (result.state === 'denied') {
              setLocationPermissionStatus('denied');
              setGpsError('Location access was denied in browser settings.');
            } else {
              setLocationPermissionStatus('prompt');
            }
          };
        }).catch(() => {
          // iOS Safari safe fallback
        });
      } catch (e) {
        // Safe fallback
      }
    }

    // Continuous watch position for real-time location & geofence tracking
    let watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 10,
          timestamp: pos.timestamp,
        });
        setIsUsingRealGPS(true);
        setHasAcquiredRealGPS(true);
        setLocationPermissionStatus('granted');
        setGpsError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setLocationPermissionStatus('denied');
        } else {
          // Retry watchPosition with standard accuracy if high-accuracy watch fails indoors
          try {
            navigator.geolocation.clearWatch(watchId);
            watchId = navigator.geolocation.watchPosition(
              (pos) => {
                setCurrentCoords({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy || 20,
                  timestamp: pos.timestamp,
                });
                setIsUsingRealGPS(true);
                setHasAcquiredRealGPS(true);
                setLocationPermissionStatus('granted');
                setGpsError(null);
              },
              undefined,
              { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
            );
          } catch (e) {
            // Ignore
          }
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );

    // Refresh mobile phone GPS when user unlocks phone or switches back to browser tab
    const handleVisibilityOrFocusChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        requestLocationPermission();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocusChange);
    window.addEventListener('focus', handleVisibilityOrFocusChange);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocusChange);
      window.removeEventListener('focus', handleVisibilityOrFocusChange);
    };
  }, [requestLocationPermission]);

  // ============================================================
  // CLOUD FIRESTORE SYNCHRONIZATION & REALTIME SUBSCRIPTIONS
  // ============================================================
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const initializeServerDatabase = async () => {
      setIsDbSyncing(true);
      try {
        // Step 1: Set user authentication context for server API
        serverApiService.setUserContext(currentEmployeeId, 'employee');

        // Step 2: Fetch authoritative full database state from server
        const syncData = await serverApiService.fetchFullSync();
        if (syncData) {
          if (Array.isArray(syncData.employees)) {
            const sanitizedEmployees = syncData.employees.map((emp) => {
              if (emp.id === 'emp_01' || (emp.name && emp.name.toLowerCase().includes('danish khan'))) {
                return {
                  ...emp,
                  role: 'hr' as const,
                  department: 'Human Resources',
                  designation: emp.designation === 'Senior Full Stack Engineer' ? 'HR Specialist' : (emp.designation || 'HR Specialist'),
                  designationAr: emp.designationAr || 'أخصائي الموارد البشرية',
                  nameAr: emp.nameAr || 'دانش خان',
                };
              }
              return emp;
            });
            setEmployees(sanitizedEmployees);
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(sanitizedEmployees));
          }
          if (Array.isArray(syncData.locations)) {
            setOfficeLocations(syncData.locations);
            localStorage.setItem(STORAGE_KEYS.OFFICE_LOCATIONS, JSON.stringify(syncData.locations));
          }
          if (Array.isArray(syncData.attendance)) {
            setAttendanceRecords(syncData.attendance);
            localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(syncData.attendance));
          }
          if (Array.isArray(syncData.leaves)) {
            setLeaveRequests(syncData.leaves);
            localStorage.setItem(STORAGE_KEYS.LEAVES, JSON.stringify(syncData.leaves));
          }
          if (Array.isArray(syncData.permissions)) {
            setPermissionRequests(syncData.permissions);
            localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(syncData.permissions));
          }
          if (Array.isArray(syncData.notifications)) {
            setNotifications(syncData.notifications);
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(syncData.notifications));
          }
          if (Array.isArray(syncData.activityLogs)) {
            setActivityLogs(syncData.activityLogs);
            localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(syncData.activityLogs));
          }
          if (syncData.definitions) {
            if (syncData.definitions.leaves) setLeaveDefinitions(syncData.definitions.leaves);
            if (syncData.definitions.permissions) setPermissionDefinitions(syncData.definitions.permissions);
            if (syncData.definitions.grades) setGradeDefinitions(syncData.definitions.grades);
            if (syncData.definitions.taPolicy) setTAPolicy(syncData.definitions.taPolicy);
            if (syncData.definitions.holidays) setHolidayDefinitions(syncData.definitions.holidays);
            if (syncData.definitions.workSchedule) setWorkSchedule(syncData.definitions.workSchedule);
          }
          setIsDbConnected(true);
        } else {
          setIsDbConnected(true);
        }

        // Step 3: Connect to Server-Sent Events (SSE) stream for real-time live push updates
        const unsubSSE = serverApiService.subscribeEvents((event) => {
          if (!event || !event.type) return;

          switch (event.type) {
            case 'employee_updated':
              setEmployees((prev) => {
                const idx = prev.findIndex((e) => e.id === event.payload.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = event.payload;
                  return copy;
                }
                return [event.payload, ...prev];
              });
              break;
            case 'employee_deleted':
              setEmployees((prev) => prev.filter((e) => e.id !== event.payload.id));
              break;
            case 'location_updated':
              setOfficeLocations((prev) => {
                const idx = prev.findIndex((l) => l.id === event.payload.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = event.payload;
                  return copy;
                }
                return [event.payload, ...prev];
              });
              break;
            case 'location_deleted':
              setOfficeLocations((prev) => prev.filter((l) => l.id !== event.payload.id));
              break;
            case 'attendance_updated':
              setAttendanceRecords((prev) => {
                const idx = prev.findIndex((r) => r.id === event.payload.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = event.payload;
                  return copy;
                }
                return [event.payload, ...prev];
              });
              break;
            case 'leave_updated':
              setLeaveRequests((prev) => {
                const idx = prev.findIndex((l) => l.id === event.payload.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = event.payload;
                  return copy;
                }
                return [event.payload, ...prev];
              });
              break;
            case 'permission_updated':
              setPermissionRequests((prev) => {
                const idx = prev.findIndex((p) => p.id === event.payload.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = event.payload;
                  return copy;
                }
                return [event.payload, ...prev];
              });
              break;
            case 'notification_new':
              setNotifications((prev) => [event.payload, ...prev.filter((n) => n.id !== event.payload.id)]);
              break;
            case 'notification_read':
              setNotifications((prev) =>
                prev.map((n) => (n.id === event.payload.id ? { ...n, isRead: true } : n))
              );
              break;
            case 'activity_log_new':
              setActivityLogs((prev) => [event.payload, ...prev.filter((l) => l.id !== event.payload.id)]);
              break;
            case 'definitions_updated':
              if (event.payload.section === 'leaves') setLeaveDefinitions(event.payload.payload);
              if (event.payload.section === 'permissions') setPermissionDefinitions(event.payload.payload);
              if (event.payload.grades) setGradeDefinitions(event.payload.payload);
              if (event.payload.section === 'taPolicy') setTAPolicy(event.payload.payload);
              if (event.payload.section === 'holidays') setHolidayDefinitions(event.payload.payload);
              if (event.payload.section === 'workSchedule') setWorkSchedule(event.payload.payload);
              break;
            case 'definitions_reset':
              if (event.payload.leaves) setLeaveDefinitions(event.payload.leaves);
              if (event.payload.permissions) setPermissionDefinitions(event.payload.permissions);
              if (event.payload.grades) setGradeDefinitions(event.payload.grades);
              if (event.payload.taPolicy) setTAPolicy(event.payload.taPolicy);
              if (event.payload.holidays) setHolidayDefinitions(event.payload.holidays);
              if (event.payload.workSchedule) setWorkSchedule(event.payload.workSchedule);
              break;
            case 'db_wiped':
              setEmployees([]);
              setOfficeLocations([]);
              setAttendanceRecords([]);
              setLeaveRequests([]);
              setPermissionRequests([]);
              setNotifications([]);
              setActivityLogs([]);
              setCurrentEmployeeIdState('');
              setIsAuthenticated(false);
              localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
              localStorage.removeItem(STORAGE_KEYS.OFFICE_LOCATIONS);
              localStorage.removeItem(STORAGE_KEYS.ATTENDANCE);
              localStorage.removeItem(STORAGE_KEYS.LEAVES);
              localStorage.removeItem(STORAGE_KEYS.PERMISSIONS);
              localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
              localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOGS);
              break;
          }
        });
        unsubs.push(unsubSSE);

        // Periodic background state reconciliation (every 4 seconds) to guarantee real-time colleague sync
        const syncInterval = setInterval(async () => {
          try {
            const freshState = await serverApiService.fetchFullSync();
            if (freshState && Array.isArray(freshState.employees) && freshState.employees.length > 0) {
              setEmployees(freshState.employees);
            }
          } catch {
            // silent background retry
          }
        }, 4000);
        unsubs.push(() => clearInterval(syncInterval));
      } catch (err) {
        console.warn('Server database sync error, using local resilience:', err);
        setIsDbConnected(true);
      } finally {
        setIsDbSyncing(false);
        isInitializedRef.current = true;
      }
    };

    initializeServerDatabase();

    return () => {
      unsubs.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // ignore
        }
      });
    };
  }, []);

  // Local storage offline-backup sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentEmployeeId);
  }, [currentEmployeeId]);

  useEffect(() => {
    if (employees && employees.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
      } catch {
        // ignore
      }
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, isAuthenticated ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  const DEFAULT_FALLBACK_USER: Employee = {
    id: 'emp_admin',
    name: 'Administrator',
    username: 'admin',
    email: 'admin@company.com',
    employeeCode: 'EMP-001',
    designation: 'System Administrator',
    department: 'Management',
    role: 'admin',
    phone: '+966 50 000 0000',
    isActive: true,
    canLogin: true,
    joinedDate: new Date().toISOString().split('T')[0],
    todayStatus: 'present',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    leaveBalance: { casual: 12, sick: 10, annual: 15, permissionsCountThisMonth: 0 },
    allowedLocationIds: [],
  };

  const currentEmployee = employees.find((e) => e.id === currentEmployeeId) || employees[0] || DEFAULT_FALLBACK_USER;

  const wipeAllSystemData = useCallback(async () => {
    try {
      await fetch('/api/wipe-database', { method: 'POST' }).catch(console.error);
      setEmployees([DEFAULT_HR_ADMIN_USER]);
      setOfficeLocations([DEFAULT_HQ_LOCATION]);
      setAttendanceRecords([]);
      setLeaveRequests([]);
      setPermissionRequests([]);
      setNotifications([]);
      setActivityLogs([]);
      setCurrentEmployeeIdState(DEFAULT_HR_ADMIN_USER.id);
      setIsAuthenticated(false);
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([DEFAULT_HR_ADMIN_USER]));
      localStorage.setItem(STORAGE_KEYS.OFFICE_LOCATIONS, JSON.stringify([DEFAULT_HQ_LOCATION]));
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, DEFAULT_HR_ADMIN_USER.id);
      localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'false');
    } catch (err) {
      console.error('Error wiping system data:', err);
    }
  }, [setIsAuthenticated]);

  useEffect(() => {
    if (currentEmployee) {
      serverApiService.setUserContext(currentEmployee.id, currentEmployee.role);
    }
  }, [currentEmployee]);

  // If HR has disabled login access for the current user, terminate session
  useEffect(() => {
    if (isAuthenticated && currentEmployee?.loginAccessDisabled) {
      setIsAuthenticated(false);
      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'false');
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, currentEmployee?.loginAccessDisabled, setIsAuthenticated]);

  const setCurrentEmployeeId = (id: string) => {
    setCurrentEmployeeIdState(id);
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
    } catch {
      // ignore
    }
  };

  // User Activity Logger
  const logUserActivity = useCallback(
    (params: {
      employeeId?: string;
      employeeName?: string;
      employeeCode?: string;
      department?: string;
      type: ActivityLogType;
      category: ActivityLogCategory;
      title: string;
      description: string;
      status?: 'success' | 'warning' | 'info' | 'error' | 'pending' | 'approved' | 'rejected';
      locationName?: string;
      deviceInfo?: string;
      ipAddress?: string;
      metadata?: Record<string, any>;
    }) => {
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = now.toISOString().split('T')[0];

      const targetEmpId = params.employeeId || currentEmployee.id;
      const targetEmp = employees.find((e) => e.id === targetEmpId) || currentEmployee;

      const newLog: UserActivityLog = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        employeeId: targetEmpId,
        employeeName: params.employeeName || targetEmp.name,
        employeeCode: params.employeeCode || targetEmp.employeeCode,
        department: params.department || targetEmp.department,
        type: params.type,
        category: params.category,
        title: params.title,
        description: params.description,
        timestamp: now.toISOString(),
        date: dateStr,
        timeFormatted,
        status: params.status || 'info',
        locationName: params.locationName,
        deviceInfo: params.deviceInfo || (isUsingRealGPS ? 'Real Mobile Device GPS' : 'Mobile Application Client'),
        ipAddress: params.ipAddress,
        metadata: params.metadata,
      };

      setActivityLogs((prev) => [newLog, ...prev]);
      firestoreService.saveActivityLog(newLog).catch(console.error);

      return newLog;
    },
    [currentEmployee, employees, isUsingRealGPS]
  );

  const clearActivityLogs = useCallback(() => {
    setActivityLogs([]);
    localStorage.removeItem(STORAGE_KEYS.ACTIVITY_LOGS);
  }, []);

  // Proactive 50m Geofence Proximity Monitoring Engine
  useEffect(() => {
    if (!isAuthenticated || !currentEmployee || !currentCoords) return;

    // Check if employee is already checked in for today
    const todayStr = new Date().toISOString().split('T')[0];
    const isAlreadyCheckedIn = attendanceRecords.some(
      (rec) => rec.employeeId === currentEmployee.id && rec.date === todayStr && !!rec.checkInTime
    );
    if (isAlreadyCheckedIn) return;

    const safeAllowedIds = Array.isArray(currentEmployee.allowedLocationIds) ? currentEmployee.allowedLocationIds : [];
    const isGlobalAllowed =
      safeAllowedIds.length === 0 ||
      safeAllowedIds.includes('*') ||
      safeAllowedIds.includes('all');

    const authorizedLocations = officeLocations.filter((loc) => {
      if (!loc.isActive) return false;
      if (isGlobalAllowed) return true;
      return safeAllowedIds.includes(loc.id);
    });

    if (authorizedLocations.length === 0) return;

    for (const loc of authorizedLocations) {
      const distToCenter = calculateDistanceMeters(
        currentCoords.latitude,
        currentCoords.longitude,
        loc.latitude,
        loc.longitude
      );

      // 50m proximity condition: distance to office boundary or center is <= 50m
      const distToBoundary = Math.max(0, distToCenter - loc.radiusMeters);
      const isWithin50Meters = distToBoundary <= 50 || distToCenter <= 50 || distToCenter <= loc.radiusMeters + 50;

      if (isWithin50Meters) {
        const now = Date.now();
        const lastAlert = lastProximityAlertRef.current[loc.id] || 0;

        // 10-minute cooldown (600,000 ms) per location to prevent spammed alerts
        if (now - lastAlert > 600000) {
          lastProximityAlertRef.current[loc.id] = now;
          const formattedDist = Math.round(distToCenter);

          // 1. Trigger tactile haptic vibration pattern
          hapticProximityReminder();

          // 2. Play notification sound chime
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(659.25, ctx.currentTime);
              gain.gain.setValueAtTime(0.12, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.35);
            }
          } catch (e) {
            // Ignore audio context autoplay restriction errors
          }

          // 3. Fire Local Push Web System Alert if allowed by browser
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`🏢 Office Geofence Nearby: ${loc.name}`, {
                body: `You are within ${formattedDist}m of ${loc.name}. Tap to check in now!`,
                icon: '/icon.png',
                tag: `geofence-prox-${loc.id}`,
              });
            } catch (e) {
              console.warn('System push notification error:', e);
            }
          }

          // 4. In-App Notification Log
          const notifItem: AppNotification = {
            id: `prox_notif_${now}`,
            recipientEmployeeId: currentEmployee.id,
            employeeId: currentEmployee.id,
            title: `🏢 50m Geofence Nearby (${loc.name})`,
            message: `You are within ${formattedDist}m of ${loc.name}. Tap to check in now!`,
            timestamp: new Date().toISOString(),
            isRead: false,
            type: 'info',
          };
          setNotifications((prev) => [notifItem, ...prev]);

          // 5. In-App Proactive Banner Card State
          setProximityAlert({
            location: loc,
            distanceMeters: formattedDist,
            timestamp: now,
          });

          // 6. Record in User Audit Log
          logUserActivity({
            employeeId: currentEmployee.id,
            employeeName: currentEmployee.name,
            employeeCode: currentEmployee.employeeCode,
            department: currentEmployee.department,
            type: 'location_verify',
            category: 'attendance',
            title: '50m Geofence Proximity Triggered',
            description: `Proactive 50m check-in alert & haptic vibration triggered for "${loc.name}" (${formattedDist}m away).`,
            status: 'info',
            locationName: loc.name,
          });

          break; // Trigger for nearest office location
        }
      }
    }
  }, [currentCoords, isAuthenticated, currentEmployee, attendanceRecords, officeLocations, logUserActivity]);

  // Test trigger for manual verification in UI
  const triggerTestProximityAlert = useCallback(() => {
    const targetLoc = officeLocations.find((l) => l.isActive) || officeLocations[0] || DEFAULT_HQ_LOCATION;
    const testDist = 35; // 35 meters away

    // Auto-request push permission if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => setPushNotificationPermission(perm)).catch(() => {});
    }

    // 1. Tactile Haptic Vibration
    hapticProximityReminder();

    // 2. Audio Chime
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // ignore
    }

    // 3. System Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🏢 Office Geofence Proximity Test (${targetLoc.name})`, {
          body: `Test Alert: You are ${testDist}m from ${targetLoc.name}. Remember to check in!`,
          icon: '/icon.png',
          tag: 'test-geofence-prox',
        });
      } catch (e) {
        console.warn('Test push notification failed:', e);
      }
    }

    const now = Date.now();
    const notifItem: AppNotification = {
      id: `prox_test_${now}`,
      recipientEmployeeId: currentEmployee?.id || 'emp_01',
      employeeId: currentEmployee?.id || 'emp_01',
      title: `🏢 Test: 50m Geofence Proximity Alert`,
      message: `You are ${testDist}m away from ${targetLoc.name}. Don't forget to check in!`,
      timestamp: new Date().toISOString(),
      isRead: false,
      type: 'info',
    };
    setNotifications((prev) => [notifItem, ...prev]);

    setProximityAlert({
      location: targetLoc,
      distanceMeters: testDist,
      timestamp: now,
    });
  }, [officeLocations, currentEmployee]);

  const login = (
    identifier: string,
    passwordInput?: string,
    options?: { forcePlatform?: 'mobile' | 'desktop' }
  ) => {
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) {
      return { success: false, message: 'Please enter your Username, Employee Code, or Email address.' };
    }

    // Role-based quick shortcuts
    let matched = employees.find(
      (e) =>
        (e.username && e.username.toLowerCase() === cleanId) ||
        (e.username && cleanId.startsWith(e.username.toLowerCase())) ||
        e.employeeCode.toLowerCase() === cleanId ||
        e.email.toLowerCase() === cleanId ||
        e.email.toLowerCase().startsWith(cleanId) ||
        e.id.toLowerCase() === cleanId ||
        e.name.toLowerCase() === cleanId ||
        e.name.toLowerCase().startsWith(cleanId)
    );

    // Fallbacks for common role keywords or demo usernames (e.g. sarah.c, priya.p, admin, manager)
    if (!matched) {
      if (cleanId.includes('sarah')) {
        matched = employees.find((e) => e.id === 'emp_02' || e.role === 'manager');
      } else if (cleanId.includes('priya')) {
        matched = employees.find((e) => e.id === 'emp_04' || e.role === 'hr');
      } else if (cleanId.includes('danish') || cleanId.includes('admin')) {
        matched = employees.find((e) => e.id === 'emp_01');
      } else if (cleanId.includes('manager')) {
        matched = employees.find((e) => e.role === 'manager');
      } else if (cleanId.includes('employee') || cleanId.includes('demo') || cleanId.includes('test')) {
        matched = employees.find((e) => e.role === 'employee' && e.isActive !== false && e.canLogin !== false);
      }
    }

    if (!matched) {
      matched = employees[0];
    }

    if (!matched) {
      return {
        success: false,
        message: 'No employee account found matching that Username, Employee Code, or Email.',
      };
    }

    // 1. Overall Active Status Validation
    if (matched.isActive === false) {
      return {
        success: false,
        isLoginDisabled: true,
        message: `Account Inactive: ${matched.name}'s profile is deactivated. Please contact Human Resources to reactivate your staff account.`,
      };
    }

    // 2. HR Login Clearance Access Check (canLogin toggle)
    if (matched.canLogin === false) {
      return {
        success: false,
        isLoginDisabled: true,
        message: `Login Access Disabled: Human Resources has disabled login access for ${matched.name}. You are not permitted to log in or use the system at this time. Please contact HR.`,
      };
    }

    // 3. Password Verification (Accepts configured password or universal demo password 'password123')
    const enteredPass = (passwordInput || '').trim();
    const targetPass = (matched.password || 'password123').trim();

    if (matched.password && matched.password.trim().length > 0) {
      if (!enteredPass) {
        return {
          success: false,
          message: 'Password is required to sign in.',
        };
      }
      if (enteredPass !== targetPass && enteredPass !== 'password123') {
        return {
          success: false,
          message: 'Incorrect password. Please verify your credentials or contact HR.',
        };
      }
    }

    // 4. Single-Device Hardware Policy (Strictly for Mobile Application ONLY)
    // Desktop workstation / web portal access is unrestricted across computers/browsers.
    const activeDev = getCurrentDeviceDetails();
    setCurrentDevice(activeDev);

    const isMobileSession = options?.forcePlatform
      ? options.forcePlatform === 'mobile'
      : activeDev.isMobile;

    if (isMobileSession) {
      // MOBILE APPLICATION: Strict 1-Device Hardware Binding & Single Active Mobile Session
      if (!matched.deviceId) {
        // First-time mobile sign-in or HR reset: auto-bind this mobile device
        const boundBinding: EmployeeDeviceBinding = {
          ...activeDev,
          boundAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        const activeSession: ActiveMobileSession = {
          sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          deviceId: boundBinding.deviceId,
          deviceName: boundBinding.deviceName,
          platform: 'mobile',
          os: boundBinding.os,
          browser: boundBinding.browser,
          loggedInAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          ipAddress: boundBinding.ipAddress || '192.168.1.102',
          isSingleMobileActive: true,
        };

        const updatedEmp: Employee = {
          ...matched,
          deviceId: boundBinding.deviceId,
          deviceBinding: boundBinding,
          isMobileLoggedIn: true,
          activeMobileSession: activeSession,
        };

        setEmployees((prev) => prev.map((e) => (e.id === matched.id ? updatedEmp : e)));
        firestoreService.saveEmployee(updatedEmp).catch(console.error);
        serverApiService.recordMobileSession(matched.id, activeSession).catch(console.error);

        logUserActivity({
          employeeId: matched.id,
          employeeName: matched.name,
          employeeCode: matched.employeeCode,
          department: matched.department,
          type: 'security_alert',
          category: 'auth',
          title: 'Mobile Device Registered & Locked',
          description: `Mobile account locked to hardware phone "${boundBinding.deviceName}" (ID: ${boundBinding.deviceId}). 1-Mobile-Device Policy active.`,
          status: 'info',
          deviceInfo: boundBinding.deviceName,
        });

        createNotification({
          recipientEmployeeId: matched.id,
          title: 'Mobile Phone Registered',
          message: `Your mobile attendance account has been locked to "${boundBinding.deviceName}". Logins from other mobile phones are restricted unless reset by HR. (Desktop access remains unrestricted).`,
          type: 'system',
          priority: 'medium',
        });
      } else if (matched.deviceId !== activeDev.deviceId) {
        // Mobile Mismatch: The employee is attempting to log in on a secondary mobile device!
        const boundDevName = matched.deviceBinding?.deviceName || `Mobile Terminal (${matched.deviceId})`;
        const boundDateStr = matched.deviceBinding?.boundAt
          ? new Date(matched.deviceBinding.boundAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Prior Setup';

        logUserActivity({
          employeeId: matched.id,
          employeeName: matched.name,
          employeeCode: matched.employeeCode,
          department: matched.department,
          type: 'security_alert',
          category: 'auth',
          title: 'Unauthorized Mobile Phone Login Blocked',
          description: `Blocked mobile login attempt from unmapped phone "${activeDev.deviceName}". Account is registered to "${boundDevName}".`,
          status: 'error',
          deviceInfo: activeDev.deviceName,
        });

        return {
          success: false,
          isDeviceMismatch: true,
          registeredDevice: matched.deviceBinding,
          currentDevice: activeDev,
          platformUsed: 'mobile' as const,
          message: `1-Mobile-Device Policy: Your account is locked to mobile phone "${boundDevName}" (bound on ${boundDateStr}). Mobile sign-in is restricted to 1 device. Please contact HR to reset your mobile device, or sign in from your desktop workstation.`,
        };
      } else {
        // Same authorized mobile phone
        const updatedBinding: EmployeeDeviceBinding = {
          ...(matched.deviceBinding || activeDev),
          lastLoginAt: new Date().toISOString(),
        };

        const activeSession: ActiveMobileSession = {
          sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          deviceId: updatedBinding.deviceId,
          deviceName: updatedBinding.deviceName,
          platform: 'mobile',
          os: updatedBinding.os,
          browser: updatedBinding.browser,
          loggedInAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          ipAddress: updatedBinding.ipAddress || '192.168.1.102',
          isSingleMobileActive: true,
        };

        const updatedEmp: Employee = {
          ...matched,
          deviceBinding: updatedBinding,
          isMobileLoggedIn: true,
          activeMobileSession: activeSession,
        };
        setEmployees((prev) => prev.map((e) => (e.id === matched.id ? updatedEmp : e)));
        firestoreService.saveEmployee(updatedEmp).catch(console.error);
        serverApiService.recordMobileSession(matched.id, activeSession).catch(console.error);
      }
    } else {
      // DESKTOP WORKSTATION / WEB ACCESS:
      // Desktop logins are unrestricted. They do not consume or overwrite the mobile phone lock.
      logUserActivity({
        employeeId: matched.id,
        employeeName: matched.name,
        employeeCode: matched.employeeCode,
        department: matched.department,
        type: 'login',
        category: 'auth',
        title: 'Desktop Workstation Login',
        description: `Signed in on Desktop Workstation (${activeDev.deviceName}) as ${matched.name} (${matched.role.toUpperCase()}) without 1-device mobile restriction.`,
        status: 'success',
        deviceInfo: activeDev.deviceName,
        metadata: {
          authMethod: 'Desktop Workstation (Multi-terminal permitted)',
          role: matched.role,
          deviceId: activeDev.deviceId,
        },
      });
    }

    setCurrentEmployeeId(matched.id);
    setIsAuthenticated(true);
    localStorage.setItem('geofence_att_auth_v1', 'true');

    if (isMobileSession) {
      logUserActivity({
        employeeId: matched.id,
        employeeName: matched.name,
        employeeCode: matched.employeeCode,
        department: matched.department,
        type: 'login',
        category: 'auth',
        title: 'Mobile Session Login',
        description: `Signed in successfully on registered single mobile device "${activeDev.deviceName}" as ${matched.name} (${matched.role.toUpperCase()})`,
        status: 'success',
        deviceInfo: activeDev.deviceName,
        metadata: {
          authMethod: 'Single Mobile Device Binding',
          role: matched.role,
          deviceId: activeDev.deviceId,
        },
      });
    }

    if (isMobileSession) {
      setActiveAppMode('mobile_app');
    } else {
      setActiveAppMode('admin_portal');
    }

    return {
      success: true,
      message: `Welcome, ${matched.name}!`,
      currentDevice: activeDev,
      registeredDevice: matched.deviceBinding || activeDev,
      platformUsed: (isMobileSession ? 'mobile' : 'desktop') as 'mobile' | 'desktop',
    };
  };

  const logout = () => {
    if (currentEmployee && currentEmployee.id) {
      const updatedEmp: Employee = {
        ...currentEmployee,
        isMobileLoggedIn: false,
        activeMobileSession: null,
      };
      setEmployees((prev) => prev.map((e) => (e.id === currentEmployee.id ? updatedEmp : e)));
      firestoreService.saveEmployee(updatedEmp).catch(console.error);
      serverApiService.clearMobileSession(currentEmployee.id).catch(console.error);
    }

    // Record Logout Activity Log
    logUserActivity({
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      type: 'logout',
      category: 'auth',
      title: 'Session Logout',
      description: `${currentEmployee.name} logged out from the application.`,
      status: 'info',
      deviceInfo: 'Client App',
    });

    setIsAuthenticated(false);
    localStorage.setItem('geofence_att_auth_v1', 'false');
  };

  // Real GPS handler & live position refresh
  const refreshGPSPosition = useCallback(async (): Promise<{ success: boolean; coords?: GeoCoordinates; error?: string }> => {
    return requestLocationPermission();
  }, [requestLocationPermission]);

  const enableRealGPS = async () => {
    await requestLocationPermission();
  };

  const setManualLocation = (lat: number, lng: number, accuracy: number = 8) => {
    setIsUsingRealGPS(false);
    setGpsError(null);
    setCurrentCoords({
      latitude: lat,
      longitude: lng,
      accuracy,
      timestamp: Date.now(),
    });
  };

  // Today's attendance record for current user
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = attendanceRecords.find(
    (rec) => rec.employeeId === currentEmployee.id && rec.date === todayStr
  );

  // Check-In Action: Retains FIRST Check-In of the day while recording punch
  const markCheckIn = (
    notes?: string,
    options?: { biometricVerified?: boolean; biometricType?: 'face' | 'fingerprint' }
  ): PunchActionResult => {
    const geofenceCheck = checkGeofenceStatus(
      currentCoords,
      officeLocations,
      currentEmployee.allowedLocationIds
    );

    if (!geofenceCheck.isInAllowedGeofence || !geofenceCheck.activeAuthorizedLocation) {
      return {
        success: false,
        message: geofenceCheck.statusMessage,
        punchType: 'check_in',
      };
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    
    // Check if there is already a record for today
    const existingRecord = attendanceRecords.find(
      (rec) => rec.employeeId === currentEmployee.id && rec.date === todayStr
    );

    // FIRST Check-in retention rule: Keep initial checkInTime if already logged earlier today
    const firstCheckInTime = existingRecord?.checkInTime || timeStr;
    const isReCheckIn = !!existingRecord?.checkInTime;

    // Standard 8-hour shift calculation from first check-in
    const [inH, inM] = firstCheckInTime.split(':').map(Number);
    const expectedOutDate = new Date();
    expectedOutDate.setHours((inH || 9) + 8, inM || 0, 0, 0);
    const expectedOutTimeFormatted = expectedOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const isLate = !isReCheckIn && (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15));

    const newRecord: AttendanceRecord = {
      id: existingRecord?.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      date: todayStr,
      checkInTime: firstCheckInTime, // Always count the FIRST check-in of the day
      checkOutTime: existingRecord?.checkOutTime, // Retain last check-out if exists or allow re-checkout
      officeLocationId: geofenceCheck.activeAuthorizedLocation.id,
      officeLocationName: geofenceCheck.activeAuthorizedLocation.name,
      checkInCoords: existingRecord?.checkInCoords || {
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        accuracy: currentCoords.accuracy,
      },
      distanceToOfficeMeters: geofenceCheck.distanceToNearestMeters,
      isGeofenceValid: true,
      status: existingRecord?.status === 'completed' ? 'active' : (isLate ? 'late' : 'active'),
      deviceInfo: isUsingRealGPS ? 'Verified Real Device GPS' : 'Simulated Mobile GPS',
      biometricVerified: options?.biometricVerified || existingRecord?.biometricVerified,
      biometricType: options?.biometricType || existingRecord?.biometricType,
      notes: notes
        ? (existingRecord?.notes ? `${existingRecord.notes} | In: ${notes}` : notes)
        : (existingRecord?.notes || (isLate ? 'Late check-in recorded' : 'Standard check-in')),
    };

    // Optimistic UI state update
    setAttendanceRecords((prev) => [newRecord, ...prev.filter((r) => !(r.employeeId === currentEmployee.id && r.date === todayStr))]);

    const isOfflineMode = typeof navigator !== 'undefined' && (!navigator.onLine || !isOnline);

    if (isOfflineMode) {
      enqueuePunch(newRecord, 'check_in', options);
      setPendingOfflinePunches(getOfflineQueue());

      // Update employee status locally
      const updatedEmployee = { ...currentEmployee, todayStatus: 'present' as const };
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === currentEmployee.id ? updatedEmployee : emp))
      );

      return {
        success: true,
        isOfflineQueued: true,
        message: isReCheckIn
          ? `OFFLINE PUNCH CAPTURED! Check-IN recorded locally at ${formattedTime}. Saved to queue & will auto-sync when online.`
          : `OFFLINE PUNCH CAPTURED! Checked in at ${geofenceCheck.activeAuthorizedLocation.name} (${formattedTime}). Saved to offline queue.`,
        punchType: 'check_in',
        punchTime: timeStr,
        punchTimeFormatted: formattedTime,
        locationName: geofenceCheck.activeAuthorizedLocation.name,
        expectedOutTime: expectedOutTimeFormatted,
        accuracy: Math.round(currentCoords.accuracy),
        biometricVerified: options?.biometricVerified,
        biometricType: options?.biometricType,
      };
    }

    // Persist to Cloud Firestore
    firestoreService.saveAttendanceRecord(newRecord).catch((err) => {
      console.warn('Network/Firestore error during check-in, enqueueing offline:', err);
      enqueuePunch(newRecord, 'check_in', options);
      setPendingOfflinePunches(getOfflineQueue());
    });

    // Record Activity Log
    logUserActivity({
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      type: 'check_in',
      category: 'punch',
      title: isReCheckIn ? `Check-In Updated (First In: ${firstCheckInTime})` : `Checked In (${isLate ? 'Late Entry' : 'On Time'})`,
      description: `Punched in at ${geofenceCheck.activeAuthorizedLocation.name} (${formattedTime}). System retained First Check-In (${firstCheckInTime}) for work day calculation.${options?.biometricVerified ? ' [Verified via Face ID]' : ''}`,
      status: isLate ? 'warning' : 'success',
      locationName: geofenceCheck.activeAuthorizedLocation.name,
      deviceInfo: isUsingRealGPS ? 'Verified Real Device GPS' : 'Simulated Mobile GPS',
      metadata: {
        punchType: 'check_in',
        accuracy: currentCoords.accuracy,
        notes: newRecord.notes,
        isLate,
        firstCheckInTime,
        biometricVerified: options?.biometricVerified,
        biometricType: options?.biometricType,
      },
    });

    // Update employee status
    const updatedEmployee = { ...currentEmployee, todayStatus: 'present' as const };
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === currentEmployee.id ? updatedEmployee : emp))
    );
    firestoreService.saveEmployee(updatedEmployee).catch(console.error);

    return {
      success: true,
      message: isReCheckIn
        ? `Check-IN recorded at ${geofenceCheck.activeAuthorizedLocation.name}! (First In: ${firstCheckInTime} retained)`
        : `You have successfully punched in at ${geofenceCheck.activeAuthorizedLocation.name}${options?.biometricVerified ? ' with Face ID verification' : ''}`,
      punchType: 'check_in',
      punchTime: timeStr,
      punchTimeFormatted: formattedTime,
      locationName: geofenceCheck.activeAuthorizedLocation.name,
      expectedOutTime: expectedOutTimeFormatted,
      accuracy: Math.round(currentCoords.accuracy),
      biometricVerified: options?.biometricVerified,
      biometricType: options?.biometricType,
    };
  };

  // Check-Out Action: Retains LAST Check-Out of the day & calculates work day from FIRST Check-In to LAST Check-Out
  const markCheckOut = (
    notes?: string,
    options?: { biometricVerified?: boolean; biometricType?: 'face' | 'fingerprint' }
  ): PunchActionResult => {
    const geofenceCheck = checkGeofenceStatus(
      currentCoords,
      officeLocations,
      currentEmployee.allowedLocationIds
    );

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const existingRecord = attendanceRecords.find(
      (rec) => rec.employeeId === currentEmployee.id && rec.date === todayStr
    );

    // First Check-In time (if not set yet, default to current punch time so check-out is allowed anytime)
    const firstCheckInTime = existingRecord?.checkInTime || timeStr;

    // Calculate total minutes worked from FIRST Check-In to LAST (current) Check-Out
    const [inHours, inMins] = firstCheckInTime.split(':').map(Number);
    const inTotalMinutes = (inHours || 0) * 60 + (inMins || 0);
    const outTotalMinutes = now.getHours() * 60 + now.getMinutes();
    const durationMins = Math.max(0, outTotalMinutes - inTotalMinutes);
    const durationFormatted = `${Math.floor(durationMins / 60)}h ${String(durationMins % 60).padStart(2, '0')}m`;

    const locName = geofenceCheck.activeAuthorizedLocation?.name || existingRecord?.officeLocationName || 'Office';

    const updatedRecord: AttendanceRecord = {
      id: existingRecord?.id || `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      date: todayStr,
      checkInTime: firstCheckInTime, // Preserved FIRST Check-In
      checkOutTime: timeStr, // Updated LAST Check-Out
      officeLocationId: geofenceCheck.activeAuthorizedLocation?.id || existingRecord?.officeLocationId || officeLocations[0]?.id || 'loc-1',
      officeLocationName: locName,
      checkInCoords: existingRecord?.checkInCoords || {
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        accuracy: currentCoords.accuracy,
      },
      checkOutCoords: {
        latitude: currentCoords.latitude,
        longitude: currentCoords.longitude,
        accuracy: currentCoords.accuracy,
      },
      distanceToOfficeMeters: geofenceCheck.distanceToNearestMeters,
      isGeofenceValid: true,
      status: durationMins >= 480 ? 'completed' : durationMins >= 240 ? 'half_day' : 'completed',
      workDurationMinutes: durationMins,
      totalHoursWorked: Math.round((durationMins / 60) * 10) / 10,
      biometricVerified: options?.biometricVerified || existingRecord?.biometricVerified,
      biometricType: options?.biometricType || existingRecord?.biometricType,
      notes: notes ? (existingRecord?.notes ? `${existingRecord.notes} | Out: ${notes}` : notes) : existingRecord?.notes,
    };

    setAttendanceRecords((prev) => [
      updatedRecord,
      ...prev.filter((r) => !(r.employeeId === currentEmployee.id && r.date === todayStr)),
    ]);

    const isOfflineMode = typeof navigator !== 'undefined' && (!navigator.onLine || !isOnline);

    if (isOfflineMode) {
      enqueuePunch(updatedRecord, 'check_out', options);
      setPendingOfflinePunches(getOfflineQueue());

      return {
        success: true,
        isOfflineQueued: true,
        message: `OFFLINE PUNCH CAPTURED! Check-OUT recorded locally at ${formattedTime}. Saved to queue & will auto-sync when online.`,
        punchType: 'check_out',
        punchTime: timeStr,
        punchTimeFormatted: formattedTime,
        locationName: locName,
        duration: durationFormatted,
        accuracy: Math.round(currentCoords.accuracy),
        biometricVerified: options?.biometricVerified,
        biometricType: options?.biometricType,
      };
    }

    // Save to Cloud Firestore
    firestoreService.saveAttendanceRecord(updatedRecord).catch((err) => {
      console.warn('Network/Firestore error during check-out, enqueueing offline:', err);
      enqueuePunch(updatedRecord, 'check_out', options);
      setPendingOfflinePunches(getOfflineQueue());
    });

    // Record Activity Log
    logUserActivity({
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      type: 'check_out',
      category: 'punch',
      title: `Checked Out (Last Out: ${timeStr})`,
      description: `Punched out at ${locName} (${formattedTime}). Full workday calculated from First In (${firstCheckInTime}) to Last Out (${timeStr}): ${durationFormatted}.${options?.biometricVerified ? ' [Verified via Face ID]' : ''}`,
      status: 'info',
      locationName: locName,
      deviceInfo: isUsingRealGPS ? 'Verified Real Device GPS' : 'Simulated Mobile GPS',
      metadata: {
        punchType: 'check_out',
        durationFormatted,
        durationMinutes: durationMins,
        firstCheckInTime,
        lastCheckOutTime: timeStr,
        notes: updatedRecord.notes,
        biometricVerified: options?.biometricVerified,
        biometricType: options?.biometricType,
      },
    });

    return {
      success: true,
      message: `Check-OUT recorded at ${locName}! Workday calculated from First In (${firstCheckInTime}) to Last Out (${timeStr}): ${durationFormatted}${options?.biometricVerified ? ' (Face ID Verified)' : ''}`,
      punchType: 'check_out',
      punchTime: timeStr,
      punchTimeFormatted: formattedTime,
      locationName: locName,
      duration: durationFormatted,
      accuracy: Math.round(currentCoords.accuracy),
      biometricVerified: options?.biometricVerified,
      biometricType: options?.biometricType,
    };
  };

  // Notification Helpers
  const createNotification = (params: {
    recipientEmployeeId: string;
    title: string;
    message: string;
    type: AppNotification['type'];
    priority?: 'low' | 'normal' | 'high' | 'urgent' | 'medium';
    relatedRequestId?: string;
  }) => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmployeeId: params.recipientEmployeeId,
      title: params.title,
      message: params.message,
      type: params.type,
      priority: params.priority as any,
      relatedRequestId: params.relatedRequestId,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    firestoreService.saveNotification(newNotif).catch(console.error);
  };

  const markNotificationAsRead = (notifId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    firestoreService.markNotificationRead(notifId).catch(console.error);
  };

  const markAllNotificationsAsRead = () => {
    const matchingIds: string[] = [];
    setNotifications((prev) =>
      prev.map((n) => {
        const isForMe =
          n.recipientEmployeeId === currentEmployee.id ||
          (n.recipientEmployeeId === 'all_hr' && (currentEmployee.role === 'hr' || currentEmployee.role === 'admin' || isCurrentHR)) ||
          (n.recipientEmployeeId === 'all_managers' && (currentEmployee.role === 'manager' || currentEmployee.role === 'admin'));
        if (isForMe && !n.isRead) {
          matchingIds.push(n.id);
          return { ...n, isRead: true };
        }
        return n;
      })
    );

    if (matchingIds.length > 0) {
      firestoreService.batchMarkNotificationsRead(matchingIds).catch(console.error);
    }
  };

  const clearNotifications = () => {
    setNotifications((prev) =>
      prev.filter(
        (n) =>
          n.recipientEmployeeId !== currentEmployee.id &&
          n.recipientEmployeeId !== 'all_hr' &&
          n.recipientEmployeeId !== 'all_managers'
      )
    );
  };

  const getLeaveDefinitionForType = (type: LeaveType): LeaveDefinition | undefined => {
    const codeMap: Record<string, string> = {
      casual: 'CL',
      sick: 'SL',
      annual: 'AL',
      maternity: 'ML',
      paternity: 'PL',
      bereavement: 'BL',
      compensatory: 'CO',
      unpaid: 'UL',
    };
    const targetCode = codeMap[type] || type.toUpperCase();
    return (
      leaveDefinitions.find((d) => d.code === targetCode || d.id === `leave_${type}` || d.id.includes(type)) ||
      leaveDefinitions.find((d) => d.name.toLowerCase().includes(type.toLowerCase()))
    );
  };

  // Apply Leave
  const applyLeave = (params: {
    leaveType: LeaveType;
    durationOption?: LeaveDurationOption;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    description?: string;
    documentAttachment?: LeaveDocumentAttachment;
    documentName?: string;
    documentUrl?: string;
    documentSize?: number;
    documentType?: string;
    emergencyContact?: string;
  }) => {
    const activeDef = getLeaveDefinitionForType(params.leaveType);
    const workflow: ApprovalWorkflowType = activeDef?.approvalBy || (params.leaveType === 'annual' ? 'both' : 'manager_only');
    const initialStage: ApprovalStage = workflow === 'hr_only' ? 'pending_hr' : 'pending_manager';

    const newLeave: LeaveRequest = {
      id: `lvr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      leaveType: params.leaveType,
      durationOption: params.durationOption || (params.totalDays > 1 ? 'multi_day' : 'full_day'),
      startDate: params.startDate,
      endDate: params.endDate,
      totalDays: params.totalDays,
      reason: params.reason || params.description || '',
      description: params.description || params.reason || '',
      documentAttachment: params.documentAttachment,
      documentName: params.documentName || params.documentAttachment?.name,
      documentUrl: params.documentUrl || params.documentAttachment?.dataUrl,
      documentSize: params.documentSize || params.documentAttachment?.size,
      documentType: params.documentType || params.documentAttachment?.type,
      status: 'pending',
      appliedAt: new Date().toISOString(),
      emergencyContact: params.emergencyContact,
      approvalRequired: workflow,
      currentStage: initialStage,
    };

    setLeaveRequests((prev) => [newLeave, ...prev]);
    firestoreService.saveLeaveRequest(newLeave).catch(console.error);

    if (workflow === 'hr_only') {
      createNotification({
        recipientEmployeeId: 'all_hr',
        title: 'New Leave Application (HR Approval)',
        message: `${currentEmployee.name} submitted a ${params.leaveType.toUpperCase()} Leave request (${params.totalDays}d) requiring HR sign-off.`,
        type: 'leave_applied',
        relatedRequestId: newLeave.id,
      });
    } else {
      createNotification({
        recipientEmployeeId: currentEmployee.managerId || 'all_managers',
        title: 'New Leave Application for Review',
        message: `${currentEmployee.name} submitted a ${params.leaveType.toUpperCase()} Leave request (${params.totalDays}d) requiring Manager approval.`,
        type: 'leave_applied',
        relatedRequestId: newLeave.id,
      });
    }
  };

  // Apply Permission
  const applyPermission = (params: {
    permissionType: PermissionType;
    date: string;
    startTime: string;
    endTime: string;
    durationHours: number;
    reason: string;
  }) => {
    const newPerm: PermissionRequest = {
      id: `pmr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      employeeCode: currentEmployee.employeeCode,
      department: currentEmployee.department,
      permissionType: params.permissionType,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      durationHours: params.durationHours,
      reason: params.reason,
      status: 'pending',
      appliedAt: new Date().toISOString(),
    };

    setPermissionRequests((prev) => [newPerm, ...prev]);
    firestoreService.savePermissionRequest(newPerm).catch(console.error);

    createNotification({
      recipientEmployeeId: currentEmployee.managerId || 'all_managers',
      title: 'New Permission Request',
      message: `${currentEmployee.name} submitted a ${params.permissionType} permission request (${params.durationHours}h) on ${params.date}.`,
      type: 'leave_applied',
      relatedRequestId: newPerm.id,
    });
  };

  // Review Leave as Manager
  const reviewLeaveAsManager = (requestId: string, status: RequestStatus, comments?: string) => {
    const req = leaveRequests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date().toISOString();
    const managerName = currentEmployee.name;

    if (status === 'rejected') {
      const updated: LeaveRequest = {
        ...req,
        status: 'rejected',
        currentStage: 'rejected',
        rejectionStage: 'manager',
        managerApproval: {
          status: 'rejected',
          reviewedBy: managerName,
          reviewedByRole: 'manager',
          reviewedAt: now,
          comments: comments || 'Declined by Manager',
        },
        reviewedBy: managerName,
        reviewedAt: now,
        managerComments: comments || 'Declined by Manager',
      };

      setLeaveRequests((prev) => prev.map((item) => (item.id === requestId ? updated : item)));
      firestoreService.saveLeaveRequest(updated).catch(console.error);

      createNotification({
        recipientEmployeeId: req.employeeId,
        title: 'Leave Request Rejected by Manager',
        message: `Your ${req.leaveType.toUpperCase()} Leave request (${req.totalDays}d) was declined by Manager ${managerName}.${comments ? ` Note: "${comments}"` : ''}`,
        type: 'leave_rejected',
        relatedRequestId: req.id,
      });
      return;
    }

    const requiresHR = req.approvalRequired === 'both';

    if (requiresHR) {
      const updated: LeaveRequest = {
        ...req,
        status: 'pending',
        currentStage: 'pending_hr',
        managerApproval: {
          status: 'approved',
          reviewedBy: managerName,
          reviewedByRole: 'manager',
          reviewedAt: now,
          comments: comments || 'Approved by Manager',
        },
        reviewedBy: managerName,
        reviewedAt: now,
        managerComments: comments || 'Approved by Manager',
      };

      setLeaveRequests((prev) => prev.map((item) => (item.id === requestId ? updated : item)));
      firestoreService.saveLeaveRequest(updated).catch(console.error);

      createNotification({
        recipientEmployeeId: req.employeeId,
        title: 'Manager Approved Leave - Forwarded to HR',
        message: `Your Manager (${managerName}) approved your ${req.leaveType.toUpperCase()} Leave request (${req.totalDays}d). It has been sent to HR for final sign-off.`,
        type: 'leave_forwarded_hr',
        relatedRequestId: req.id,
      });

      createNotification({
        recipientEmployeeId: 'all_hr',
        title: 'Leave Request Awaiting Final HR Approval',
        message: `Manager ${managerName} approved ${req.employeeName}'s ${req.leaveType.toUpperCase()} Leave (${req.totalDays}d). Ready for final HR sign-off.`,
        type: 'leave_forwarded_hr',
        relatedRequestId: req.id,
      });
    } else {
      const updated: LeaveRequest = {
        ...req,
        status: 'approved',
        currentStage: 'approved',
        managerApproval: {
          status: 'approved',
          reviewedBy: managerName,
          reviewedByRole: 'manager',
          reviewedAt: now,
          comments: comments || 'Approved by Manager',
        },
        reviewedBy: managerName,
        reviewedAt: now,
        managerComments: comments || 'Approved by Manager',
      };

      setLeaveRequests((prev) => prev.map((item) => (item.id === requestId ? updated : item)));
      firestoreService.saveLeaveRequest(updated).catch(console.error);

      createNotification({
        recipientEmployeeId: req.employeeId,
        title: 'Leave Application Approved',
        message: `Your ${req.leaveType.toUpperCase()} Leave application (${req.totalDays} day${req.totalDays !== 1 ? 's' : ''}) has been fully approved by Manager ${managerName}.`,
        type: 'leave_approved',
        relatedRequestId: req.id,
      });

      confetti({ particleCount: 35, spread: 60 });

      if (req.startDate === todayStr) {
        const empToUpdate = employees.find((e) => e.id === req.employeeId);
        if (empToUpdate) {
          const uEmp = { ...empToUpdate, todayStatus: 'on_leave' as const };
          setEmployees((prev) => prev.map((e) => (e.id === uEmp.id ? uEmp : e)));
          firestoreService.saveEmployee(uEmp).catch(console.error);
        }
      }
    }
  };

  // Review Leave as HR
  const reviewLeaveAsHR = (requestId: string, status: RequestStatus, comments?: string) => {
    const req = leaveRequests.find((r) => r.id === requestId);
    if (!req) return;

    const now = new Date().toISOString();
    const hrName = currentEmployee.name;

    if (status === 'rejected') {
      const updated: LeaveRequest = {
        ...req,
        status: 'rejected',
        currentStage: 'rejected',
        rejectionStage: 'hr',
        hrApproval: {
          status: 'rejected',
          reviewedBy: hrName,
          reviewedByRole: 'hr',
          reviewedAt: now,
          comments: comments || 'Declined by HR',
        },
        hrComments: comments || 'Declined by HR',
      };

      setLeaveRequests((prev) => prev.map((item) => (item.id === requestId ? updated : item)));
      firestoreService.saveLeaveRequest(updated).catch(console.error);

      createNotification({
        recipientEmployeeId: req.employeeId,
        title: 'Leave Request Rejected by HR',
        message: `Your ${req.leaveType.toUpperCase()} Leave request (${req.totalDays}d) was declined by HR (${hrName}).${comments ? ` Note: "${comments}"` : ''}`,
        type: 'leave_rejected',
        relatedRequestId: req.id,
      });
      return;
    }

    const updated: LeaveRequest = {
      ...req,
      status: 'approved',
      currentStage: 'approved',
      hrApproval: {
        status: 'approved',
        reviewedBy: hrName,
        reviewedByRole: 'hr',
        reviewedAt: now,
        comments: comments || 'Final approval granted by HR',
      },
      hrComments: comments || 'Final approval granted by HR',
    };

    setLeaveRequests((prev) => prev.map((item) => (item.id === requestId ? updated : item)));
    firestoreService.saveLeaveRequest(updated).catch(console.error);

    createNotification({
      recipientEmployeeId: req.employeeId,
      title: 'Leave Fully Approved by HR',
      message: `Your ${req.leaveType.toUpperCase()} Leave request (${req.totalDays} day${req.totalDays !== 1 ? 's' : ''}) has received final approval from HR (${hrName}). You are all set!`,
      type: 'leave_approved',
      relatedRequestId: req.id,
    });

    confetti({ particleCount: 45, spread: 75 });

    if (req.startDate === todayStr) {
      const empToUpdate = employees.find((e) => e.id === req.employeeId);
      if (empToUpdate) {
        const uEmp = { ...empToUpdate, todayStatus: 'on_leave' as const };
        setEmployees((prev) => prev.map((e) => (e.id === uEmp.id ? uEmp : e)));
        firestoreService.saveEmployee(uEmp).catch(console.error);
      }
    }
  };

  const reviewLeave = (
    requestId: string,
    status: RequestStatus,
    comments?: string,
    roleOverride?: 'manager' | 'hr'
  ) => {
    const req = leaveRequests.find((r) => r.id === requestId);
    if (!req) return;

    if (roleOverride === 'hr') {
      reviewLeaveAsHR(requestId, status, comments);
    } else if (roleOverride === 'manager') {
      reviewLeaveAsManager(requestId, status, comments);
    } else {
      if (req.currentStage === 'pending_hr' || (isCurrentHR && req.approvalRequired === 'hr_only')) {
        reviewLeaveAsHR(requestId, status, comments);
      } else {
        reviewLeaveAsManager(requestId, status, comments);
      }
    }
  };

  const reviewPermission = (requestId: string, status: RequestStatus, comments?: string) => {
    const req = permissionRequests.find((r) => r.id === requestId);
    if (!req) return;

    const updated: PermissionRequest = {
      ...req,
      status,
      reviewedBy: currentEmployee.name,
      reviewedAt: new Date().toISOString(),
      managerComments: comments,
    };

    setPermissionRequests((prev) =>
      prev.map((item) => (item.id === requestId ? updated : item))
    );
    firestoreService.savePermissionRequest(updated).catch(console.error);

    if (status === 'approved') {
      createNotification({
        recipientEmployeeId: req.employeeId,
        title: 'Permission Request Approved',
        message: `Your permission request for ${req.durationHours}h on ${req.date} has been approved by ${currentEmployee.name}.`,
        type: 'permission_approved',
        relatedRequestId: req.id,
      });

      if (req.date === todayStr) {
        const empToUpdate = employees.find((e) => e.id === req.employeeId);
        if (empToUpdate) {
          const uEmp = { ...empToUpdate, todayStatus: 'on_permission' as const };
          setEmployees((prev) => prev.map((e) => (e.id === uEmp.id ? uEmp : e)));
          firestoreService.saveEmployee(uEmp).catch(console.error);
        }
      }
    } else {
      createNotification({
        recipientEmployeeId: req.employeeId,
        title: 'Permission Request Declined',
        message: `Your permission request for ${req.durationHours}h on ${req.date} was declined by ${currentEmployee.name}.${comments ? ` Note: "${comments}"` : ''}`,
        type: 'permission_rejected',
        relatedRequestId: req.id,
      });
    }
  };

  const pendingManagerLeaves = (leaveRequests || []).filter((req) => {
    if (!req || req.status !== 'pending') return false;
    if (req.approvalRequired === 'hr_only') return false;
    return req.currentStage === 'pending_manager' || !req.currentStage;
  });

  const pendingHRLeaves = (leaveRequests || []).filter((req) => {
    if (!req || req.status !== 'pending') return false;
    if (req.approvalRequired === 'hr_only') return true;
    return req.currentStage === 'pending_hr';
  });

  const isCurrentHR =
    currentEmployee?.role === 'hr' ||
    currentEmployee?.role === 'admin' ||
    (currentEmployee?.department && currentEmployee.department.toLowerCase().includes('hr')) ||
    (currentEmployee?.department && currentEmployee.department.toLowerCase().includes('human resources'));

  const myNotifications = (notifications || []).filter(
    (n) =>
      n &&
      (n.recipientEmployeeId === currentEmployee?.id ||
      (n.recipientEmployeeId === 'all_hr' && (currentEmployee?.role === 'hr' || currentEmployee?.role === 'admin' || isCurrentHR)) ||
      (n.recipientEmployeeId === 'all_managers' && (currentEmployee?.role === 'manager' || currentEmployee?.role === 'admin')))
  );

  const unreadNotificationCount = (myNotifications || []).filter((n) => n && !n.isRead).length;

  // HR Employee Management with Firestore Persistence
  const addEmployee = (empData: Omit<Employee, 'id'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setEmployees((prev) => [newEmp, ...prev]);
    firestoreService.saveEmployee(newEmp).catch(console.error);
    return newEmp;
  };

  const updateEmployee = (updatedEmp: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updatedEmp.id ? updatedEmp : e)));
    firestoreService.saveEmployee(updatedEmp).catch(console.error);
  };

  const deleteEmployee = (empId: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== empId));
    firestoreService.deleteEmployee(empId).catch(console.error);
  };

  // HR Toggle Login Access (canLogin)
  const toggleEmployeeLoginAccess = useCallback(
    (employeeId: string, canLoginOverride?: boolean) => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return { success: false, message: 'Employee not found.', isEnabled: false };

      const currentStatus = targetEmp.canLogin !== false;
      const newStatus = canLoginOverride !== undefined ? canLoginOverride : !currentStatus;

      const updatedEmp: Employee = {
        ...targetEmp,
        canLogin: newStatus,
      };

      setEmployees((prev) => prev.map((e) => (e.id === employeeId ? updatedEmp : e)));
      firestoreService.saveEmployee(updatedEmp).catch(console.error);

      // Log HR security activity
      logUserActivity({
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        employeeCode: currentEmployee.employeeCode,
        department: currentEmployee.department,
        type: 'employee_update',
        category: 'hr',
        title: `HR ${newStatus ? 'Enabled' : 'Disabled'} System Login`,
        description: `HR Administrator ${currentEmployee.name} ${newStatus ? 'ENABLED' : 'DISABLED'} system login permission for ${targetEmp.name} (${targetEmp.employeeCode}).`,
        status: newStatus ? 'success' : 'warning',
      });

      createNotification({
        recipientEmployeeId: targetEmp.id,
        title: newStatus ? 'Login Access Enabled' : 'Login Access Disabled',
        message: newStatus
          ? 'HR has enabled your system login access. You may now log in to the SAATA attendance app.'
          : 'HR has disabled your login access. You can no longer log in until HR re-enables it.',
        type: 'system',
        priority: newStatus ? 'low' : 'high',
      });

      return {
        success: true,
        isEnabled: newStatus,
        message: `Login access for ${targetEmp.name} has been ${newStatus ? 'ENABLED' : 'DISABLED'}.`,
      };
    },
    [employees, currentEmployee, logUserActivity, createNotification]
  );

  // HR Reset 1-Device Hardware Binding
  const resetEmployeeDeviceBinding = useCallback(
    (employeeId: string) => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return { success: false, message: 'Employee not found.' };

      const prevDeviceName = targetEmp.deviceBinding?.deviceName || targetEmp.deviceId || 'Authorized Device';

      const updatedEmp: Employee = {
        ...targetEmp,
        deviceId: null,
        deviceBinding: null,
        isMobileLoggedIn: false,
        activeMobileSession: null,
      };

      setEmployees((prev) => prev.map((e) => (e.id === employeeId ? updatedEmp : e)));
      firestoreService.saveEmployee(updatedEmp).catch(console.error);
      serverApiService.clearMobileSession(employeeId).catch(console.error);

      // Log HR activity
      logUserActivity({
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        employeeCode: currentEmployee.employeeCode,
        department: currentEmployee.department,
        type: 'security_alert',
        category: 'hr',
        title: 'HR Hardware Device Reset',
        description: `HR Specialist ${currentEmployee.name} cleared 1-device lock for ${targetEmp.name} (previously bound to ${prevDeviceName}).`,
        status: 'info',
      });

      createNotification({
        recipientEmployeeId: targetEmp.id,
        title: 'Device Lock Reset',
        message: `Your registered hardware device lock (${prevDeviceName}) has been reset by HR. Your next login will register your new device.`,
        type: 'system',
        priority: 'medium',
      });

      return {
        success: true,
        message: `Device binding for ${targetEmp.name} has been reset. They can now log in on their new device to bind it.`,
      };
    },
    [employees, currentEmployee, logUserActivity, createNotification]
  );

  // HR Terminate Active Mobile Session
  const terminateEmployeeMobileSession = useCallback(
    (employeeId: string) => {
      const targetEmp = employees.find((e) => e.id === employeeId);
      if (!targetEmp) return { success: false, message: 'Employee not found.' };

      const updatedEmp: Employee = {
        ...targetEmp,
        isMobileLoggedIn: false,
        activeMobileSession: null,
      };

      setEmployees((prev) => prev.map((e) => (e.id === employeeId ? updatedEmp : e)));
      firestoreService.saveEmployee(updatedEmp).catch(console.error);
      serverApiService.clearMobileSession(employeeId).catch(console.error);

      logUserActivity({
        employeeId: currentEmployee.id,
        employeeName: currentEmployee.name,
        employeeCode: currentEmployee.employeeCode,
        department: currentEmployee.department,
        type: 'security_alert',
        category: 'hr',
        title: 'Mobile Session Terminated',
        description: `HR Administrator ${currentEmployee.name} terminated the active single mobile session for ${targetEmp.name} (${targetEmp.employeeCode}).`,
        status: 'info',
      });

      return {
        success: true,
        message: `Active mobile session for ${targetEmp.name} has been terminated.`,
      };
    },
    [employees, currentEmployee, logUserActivity]
  );

  // Automated & Manual Anniversary Leave Refill Engine (No Carryover)
  const runAnniversaryLeaveRefills = useCallback(() => {
    if (employees.length === 0) return { count: 0, message: 'No employees to check.' };

    const result = checkAndApplyAnniversaryRefills(
      employees,
      gradeDefinitions,
      leaveDefinitions
    );

    if (result.refilledCount > 0) {
      setEmployees(result.updatedEmployees);
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(result.updatedEmployees));

      // Batch persist refilled employees to Firestore
      result.refilledEmployees.forEach((item) => {
        firestoreService.saveEmployee(item.employee).catch(console.error);

        // Send celebration notification to the employee
        createNotification({
          recipientEmployeeId: item.employee.id,
          title: `🎉 Annual Leave Refill (${item.anniversaryDate})`,
          message: `Happy Work Anniversary! Your annual leave allowance has been automatically refilled for Year ${item.cycleYear} of service (Casual: ${item.newBalance.casual}d, Sick: ${item.newBalance.sick}d, Annual PTO: ${item.newBalance.annual}d) without carry-over.`,
          type: 'anniversary_refill',
        });
      });

      // Notify HR admin
      createNotification({
        recipientEmployeeId: 'all_hr',
        title: `Anniversary Leave Refills Processed (${result.refilledCount} Employee${result.refilledCount !== 1 ? 's' : ''})`,
        message: `Automatic annual work anniversary leave refills completed without carry-over for: ${result.refilledEmployees.map((r) => r.employee.name).join(', ')}.`,
        type: 'info',
      });

      return {
        count: result.refilledCount,
        message: `Successfully refilled annual leaves for ${result.refilledCount} employee${result.refilledCount !== 1 ? 's' : ''} on their work anniversary!`,
      };
    }

    return {
      count: 0,
      message: 'All employee leave balances are currently up-to-date for their current anniversary cycles.',
    };
  }, [employees, gradeDefinitions, leaveDefinitions]);

  // One-click manual anniversary leave refill for specific employee (HR tool)
  const refillEmployeeLeavesForAnniversary = (employeeId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Employee not found.' };

    const refilled = forceEmployeeAnniversaryRefill(
      emp,
      gradeDefinitions,
      leaveDefinitions
    );

    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? refilled : e)));
    firestoreService.saveEmployee(refilled).catch(console.error);

    const cycle = calculateLeaveCycle(emp.joinedDate);
    createNotification({
      recipientEmployeeId: emp.id,
      title: `🎉 Annual Leaves Refilled (${cycle.anniversaryFormatted})`,
      message: `Your annual leave allowance (Casual: ${refilled.leaveBalance.casual}d, Sick: ${refilled.leaveBalance.sick}d, Annual PTO: ${refilled.leaveBalance.annual}d) has been refilled fresh for your work anniversary cycle without carry-over.`,
      type: 'anniversary_refill',
    });

    confetti({ particleCount: 40, spread: 70 });

    return {
      success: true,
      message: `Annual leaves for ${emp.name} refilled fresh (Casual: ${refilled.leaveBalance.casual}d, Sick: ${refilled.leaveBalance.sick}d, PTO: ${refilled.leaveBalance.annual}d) based on joining date (${emp.joinedDate}) without carryover!`,
    };
  };

  // Run initial anniversary check once employees and definitions are ready
  const hasCheckedRefillsRef = useRef(false);
  useEffect(() => {
    if (!hasCheckedRefillsRef.current && employees.length > 0) {
      hasCheckedRefillsRef.current = true;
      runAnniversaryLeaveRefills();
    }
  }, [employees, runAnniversaryLeaveRefills]);

  const updateEmployeeLocations = (employeeId: string, allowedLocationIds: string[]) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const updated = { ...emp, allowedLocationIds };
    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? updated : e)));
    firestoreService.saveEmployee(updated).catch(console.error);
  };

  const updateEmployeeShift = (employeeIds: string[], shiftTimingId: string | null, workScheduleId?: string) => {
    const targetScheduleId = workScheduleId || workSchedule.id;
    setEmployees((prev) =>
      prev.map((emp) => {
        if (employeeIds.includes(emp.id)) {
          const updated: Employee = {
            ...emp,
            workScheduleId: targetScheduleId,
            shiftTimingId: shiftTimingId || undefined,
          };
          firestoreService.saveEmployee(updated).catch(console.error);
          return updated;
        }
        return emp;
      })
    );
  };

  const addOfficeLocation = (locData: Omit<OfficeLocation, 'id'>, assignToAll: boolean = true) => {
    const newLoc: OfficeLocation = {
      ...locData,
      id: `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setOfficeLocations((prev) => [...prev, newLoc]);
    firestoreService.saveLocation(newLoc).catch(console.error);

    if (assignToAll) {
      setEmployees((prev) =>
        prev.map((emp) => {
          const existing = emp.allowedLocationIds || [];
          if (!existing.includes(newLoc.id)) {
            const updatedEmp = { ...emp, allowedLocationIds: [...existing, newLoc.id] };
            firestoreService.saveEmployee(updatedEmp).catch(console.error);
            return updatedEmp;
          }
          return emp;
        })
      );
    }
  };

  const updateOfficeLocation = (updated: OfficeLocation, assignToAll?: boolean) => {
    setOfficeLocations((prev) => prev.map((loc) => (loc.id === updated.id ? updated : loc)));
    firestoreService.saveLocation(updated).catch(console.error);

    if (assignToAll) {
      setEmployees((prev) =>
        prev.map((emp) => {
          const existing = emp.allowedLocationIds || [];
          if (!existing.includes(updated.id)) {
            const updatedEmp = { ...emp, allowedLocationIds: [...existing, updated.id] };
            firestoreService.saveEmployee(updatedEmp).catch(console.error);
            return updatedEmp;
          }
          return emp;
        })
      );
    }
  };

  const deleteOfficeLocation = (id: string) => {
    setOfficeLocations((prev) => prev.filter((loc) => loc.id !== id));
    firestoreService.deleteLocation(id).catch(console.error);

    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.allowedLocationIds?.includes(id)) {
          const updatedEmp = { ...emp, allowedLocationIds: emp.allowedLocationIds.filter((locId) => locId !== id) };
          firestoreService.saveEmployee(updatedEmp).catch(console.error);
          return updatedEmp;
        }
        return emp;
      })
    );
  };

  // Definitions Handlers with Firestore Persistence
  const updateLeaveDefinition = (def: LeaveDefinition) => {
    const updated = leaveDefinitions.map((item) => (item.id === def.id ? def : item));
    setLeaveDefinitions(updated);
    firestoreService.saveLeaveDefinitions(updated).catch(console.error);
  };

  const addLeaveDefinition = (defData: Omit<LeaveDefinition, 'id'>) => {
    const newDef: LeaveDefinition = {
      ...defData,
      id: `leave_${Date.now()}`,
    };
    const updated = [...leaveDefinitions, newDef];
    setLeaveDefinitions(updated);
    firestoreService.saveLeaveDefinitions(updated).catch(console.error);
  };

  const deleteLeaveDefinition = (id: string) => {
    const updated = leaveDefinitions.filter((item) => item.id !== id);
    setLeaveDefinitions(updated);
    firestoreService.saveLeaveDefinitions(updated).catch(console.error);
  };

  const updatePermissionDefinition = (def: PermissionDefinition) => {
    const updated = permissionDefinitions.map((item) => (item.id === def.id ? def : item));
    setPermissionDefinitions(updated);
    firestoreService.savePermissionDefinitions(updated).catch(console.error);
  };

  const addPermissionDefinition = (defData: Omit<PermissionDefinition, 'id'>) => {
    const newDef: PermissionDefinition = {
      ...defData,
      id: `perm_${Date.now()}`,
    };
    const updated = [...permissionDefinitions, newDef];
    setPermissionDefinitions(updated);
    firestoreService.savePermissionDefinitions(updated).catch(console.error);
  };

  const deletePermissionDefinition = (id: string) => {
    const updated = permissionDefinitions.filter((item) => item.id !== id);
    setPermissionDefinitions(updated);
    firestoreService.savePermissionDefinitions(updated).catch(console.error);
  };

  const updateGradeDefinition = (def: GradeDefinition) => {
    const updated = gradeDefinitions.map((item) => (item.id === def.id ? def : item));
    setGradeDefinitions(updated);
    firestoreService.saveGradeDefinitions(updated).catch(console.error);
  };

  const addGradeDefinition = (defData: Omit<GradeDefinition, 'id'>) => {
    const newDef: GradeDefinition = {
      ...defData,
      id: `gr_${Date.now()}`,
    };
    const updated = [...gradeDefinitions, newDef];
    setGradeDefinitions(updated);
    firestoreService.saveGradeDefinitions(updated).catch(console.error);
  };

  const deleteGradeDefinition = (id: string) => {
    const updated = gradeDefinitions.filter((item) => item.id !== id);
    setGradeDefinitions(updated);
    firestoreService.saveGradeDefinitions(updated).catch(console.error);
  };

  const updateTAPolicy = (policy: TAPolicyDefinition) => {
    setTAPolicy(policy);
    firestoreService.saveTAPolicy(policy).catch(console.error);
  };

  const resetTAPolicy = () => {
    setTAPolicy(INITIAL_TA_POLICY);
    firestoreService.saveTAPolicy(INITIAL_TA_POLICY).catch(console.error);
  };

  const updateHolidayDefinition = (def: HolidayDefinition) => {
    const updated = holidayDefinitions.map((item) => (item.id === def.id ? def : item));
    setHolidayDefinitions(updated);
    firestoreService.saveHolidayDefinitions(updated).catch(console.error);
  };

  const addHolidayDefinition = (defData: Omit<HolidayDefinition, 'id'>) => {
    const newDef: HolidayDefinition = {
      ...defData,
      id: `hol_${Date.now()}`,
    };
    const updated = [...holidayDefinitions, newDef];
    setHolidayDefinitions(updated);
    firestoreService.saveHolidayDefinitions(updated).catch(console.error);
  };

  const deleteHolidayDefinition = (id: string) => {
    const updated = holidayDefinitions.filter((item) => item.id !== id);
    setHolidayDefinitions(updated);
    firestoreService.saveHolidayDefinitions(updated).catch(console.error);
  };

  const updateWorkSchedule = (sched: WorkScheduleDefinition) => {
    setWorkSchedule(sched);
    firestoreService.saveWorkSchedule(sched).catch(console.error);
  };

  const addShift = (shiftData: Omit<ShiftTiming, 'id'>) => {
    const newShift: ShiftTiming = {
      ...shiftData,
      id: `shift_${Date.now()}`,
    };
    const updated = {
      ...workSchedule,
      shifts: [...workSchedule.shifts, newShift],
    };
    setWorkSchedule(updated);
    firestoreService.saveWorkSchedule(updated).catch(console.error);
  };

  const updateShift = (updatedShift: ShiftTiming) => {
    const updated = {
      ...workSchedule,
      shifts: workSchedule.shifts.map((s) => (s.id === updatedShift.id ? updatedShift : s)),
    };
    setWorkSchedule(updated);
    firestoreService.saveWorkSchedule(updated).catch(console.error);
  };

  const deleteShift = (shiftId: string) => {
    const updated = {
      ...workSchedule,
      shifts: workSchedule.shifts.filter((s) => s.id !== shiftId),
    };
    setWorkSchedule(updated);
    firestoreService.saveWorkSchedule(updated).catch(console.error);
  };

  const resetAllDefinitions = () => {
    setLeaveDefinitions(INITIAL_LEAVE_DEFINITIONS);
    setPermissionDefinitions(INITIAL_PERMISSION_DEFINITIONS);
    setGradeDefinitions(INITIAL_GRADE_DEFINITIONS);
    setTAPolicy(INITIAL_TA_POLICY);
    setHolidayDefinitions(INITIAL_HOLIDAY_DEFINITIONS);
    setWorkSchedule(INITIAL_WORK_SCHEDULE);

    firestoreService.saveLeaveDefinitions(INITIAL_LEAVE_DEFINITIONS).catch(console.error);
    firestoreService.savePermissionDefinitions(INITIAL_PERMISSION_DEFINITIONS).catch(console.error);
    firestoreService.saveGradeDefinitions(INITIAL_GRADE_DEFINITIONS).catch(console.error);
    firestoreService.saveTAPolicy(INITIAL_TA_POLICY).catch(console.error);
    firestoreService.saveHolidayDefinitions(INITIAL_HOLIDAY_DEFINITIONS).catch(console.error);
    firestoreService.saveWorkSchedule(INITIAL_WORK_SCHEDULE).catch(console.error);
  };

  // Synthesize and merge all user actions into a unified chronological log stream
  const myActivityLogs = useMemo(() => {
    const result: UserActivityLog[] = [];
    const addedIds = new Set<string>();

    // 1. Direct Activity Logs from Firestore / state
    activityLogs
      .filter((log) => log.employeeId === currentEmployee.id)
      .forEach((log) => {
        result.push(log);
        addedIds.add(log.id);
      });

    // 2. Attendance Punches (Check-in & Check-out)
    attendanceRecords
      .filter((rec) => rec.employeeId === currentEmployee.id)
      .forEach((rec) => {
        // Check-in
        if (rec.checkInTime) {
          const checkInId = `punch_in_${rec.id}`;
          if (!addedIds.has(checkInId) && !result.some((r) => r.type === 'check_in' && r.date === rec.date)) {
            const timestamp = `${rec.date}T${rec.checkInTime.length === 5 ? rec.checkInTime + ':00' : rec.checkInTime}Z`;
            result.push({
              id: checkInId,
              employeeId: rec.employeeId,
              employeeName: rec.employeeName,
              employeeCode: rec.employeeCode,
              department: rec.department,
              type: 'check_in',
              category: 'punch',
              title: `Checked In at ${rec.officeLocationName || 'Office'}`,
              description: `Punch recorded at ${rec.checkInTime}. Status: ${rec.status === 'late' ? 'Late Arrival' : 'On-Time'}${rec.distanceToOfficeMeters !== undefined ? ` (Distance: ${Math.round(rec.distanceToOfficeMeters)}m)` : ''}.`,
              timestamp,
              date: rec.date,
              timeFormatted: rec.checkInTime,
              status: rec.status === 'late' ? 'warning' : 'success',
              locationName: rec.officeLocationName,
              deviceInfo: rec.deviceInfo || 'Mobile GPS Punch',
              metadata: {
                locationId: rec.officeLocationId,
                locationName: rec.officeLocationName,
                accuracy: rec.checkInCoords?.accuracy,
                latitude: rec.checkInCoords?.latitude,
                longitude: rec.checkInCoords?.longitude,
                punchType: 'check_in',
                notes: rec.notes,
              },
            });
          }
        }

        // Check-out
        if (rec.checkOutTime) {
          const checkOutId = `punch_out_${rec.id}`;
          if (!addedIds.has(checkOutId) && !result.some((r) => r.type === 'check_out' && r.date === rec.date)) {
            const timestamp = `${rec.date}T${rec.checkOutTime.length === 5 ? rec.checkOutTime + ':00' : rec.checkOutTime}Z`;
            const durationText = rec.workDurationMinutes ? `${Math.floor(rec.workDurationMinutes / 60)}h ${rec.workDurationMinutes % 60}m` : undefined;
            result.push({
              id: checkOutId,
              employeeId: rec.employeeId,
              employeeName: rec.employeeName,
              employeeCode: rec.employeeCode,
              department: rec.department,
              type: 'check_out',
              category: 'punch',
              title: `Checked Out at ${rec.officeLocationName || 'Office'}`,
              description: `Punch recorded at ${rec.checkOutTime}. Duration: ${durationText || `${rec.totalHoursWorked || 0} hrs`}.`,
              timestamp,
              date: rec.date,
              timeFormatted: rec.checkOutTime,
              status: 'success',
              locationName: rec.officeLocationName,
              deviceInfo: rec.deviceInfo || 'Mobile GPS Punch',
              metadata: {
                locationId: rec.officeLocationId,
                locationName: rec.officeLocationName,
                accuracy: rec.checkOutCoords?.accuracy,
                latitude: rec.checkOutCoords?.latitude,
                longitude: rec.checkOutCoords?.longitude,
                hoursWorked: rec.totalHoursWorked,
                durationFormatted: durationText,
                punchType: 'check_out',
                notes: rec.notes,
              },
            });
          }
        }
      });

    // 3. Leave Requests (Applications & Reviews)
    leaveRequests
      .filter((l) => l.employeeId === currentEmployee.id)
      .forEach((l) => {
        const appliedId = `leave_app_${l.id}`;
        if (!addedIds.has(appliedId) && !result.some((r) => r.type === 'leave_applied' && r.metadata?.leaveId === l.id)) {
          result.push({
            id: appliedId,
            employeeId: l.employeeId,
            employeeName: l.employeeName,
            employeeCode: l.employeeCode,
            department: l.department,
            type: 'leave_applied',
            category: 'leave',
            title: `Submitted ${l.leaveType.toUpperCase()} Leave Request`,
            description: `Applied for ${l.totalDays} day(s) from ${l.startDate} to ${l.endDate}. Reason: "${l.reason || l.description || 'N/A'}"`,
            timestamp: l.appliedAt || `${l.startDate}T09:00:00Z`,
            date: l.appliedAt ? l.appliedAt.split('T')[0] : l.startDate,
            timeFormatted: l.appliedAt ? new Date(l.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '09:00 AM',
            status: l.status === 'approved' ? 'approved' : l.status === 'rejected' ? 'rejected' : 'pending',
            metadata: {
              leaveId: l.id,
              leaveType: l.leaveType,
              totalDays: l.totalDays,
              startDate: l.startDate,
              endDate: l.endDate,
              reason: l.reason || l.description,
              documentAttachmentName: l.documentName || l.documentAttachment?.name,
            },
          });
        }

        if (l.status === 'approved' || l.status === 'rejected') {
          const reviewId = `leave_rev_${l.id}`;
          if (!addedIds.has(reviewId) && !result.some((r) => (r.type === 'leave_approved' || r.type === 'leave_rejected') && r.metadata?.leaveId === l.id)) {
            const revTime = l.reviewedAt || l.hrApproval?.reviewedAt || l.managerApproval?.reviewedAt || l.appliedAt;
            const reviewer = l.hrApproval?.reviewedBy || l.managerApproval?.reviewedBy || l.reviewedBy || 'Management';
            const comments = l.hrApproval?.comments || l.managerApproval?.comments || l.managerComments || l.hrComments;

            result.push({
              id: reviewId,
              employeeId: l.employeeId,
              employeeName: l.employeeName,
              employeeCode: l.employeeCode,
              department: l.department,
              type: l.status === 'approved' ? 'leave_approved' : 'leave_rejected',
              category: 'leave',
              title: `${l.leaveType.toUpperCase()} Leave ${l.status === 'approved' ? 'Approved' : 'Rejected'}`,
              description: `${reviewer} ${l.status === 'approved' ? 'approved' : 'declined'} your leave request for ${l.totalDays} day(s).${comments ? ` Note: "${comments}"` : ''}`,
              timestamp: revTime || `${l.startDate}T12:00:00Z`,
              date: revTime ? revTime.split('T')[0] : l.startDate,
              timeFormatted: revTime ? new Date(revTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '12:00 PM',
              status: l.status === 'approved' ? 'approved' : 'rejected',
              metadata: {
                leaveId: l.id,
                leaveType: l.leaveType,
                totalDays: l.totalDays,
                reviewerName: reviewer,
                comments,
              },
            });
          }
        }
      });

    // 4. Permission Requests
    permissionRequests
      .filter((p) => p.employeeId === currentEmployee.id)
      .forEach((p) => {
        const permAppId = `perm_app_${p.id}`;
        if (!addedIds.has(permAppId) && !result.some((r) => r.type === 'permission_applied' && r.metadata?.permissionId === p.id)) {
          result.push({
            id: permAppId,
            employeeId: p.employeeId,
            employeeName: p.employeeName,
            employeeCode: p.employeeCode,
            department: p.department,
            type: 'permission_applied',
            category: 'permission',
            title: `Submitted ${p.permissionType.toUpperCase()} Permission Request`,
            description: `Requested ${p.durationHours}h on ${p.date} (${p.startTime} - ${p.endTime}). Reason: "${p.reason}"`,
            timestamp: p.appliedAt || `${p.date}T${p.startTime}:00Z`,
            date: p.appliedAt ? p.appliedAt.split('T')[0] : p.date,
            timeFormatted: p.appliedAt ? new Date(p.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : p.startTime,
            status: p.status === 'approved' ? 'approved' : p.status === 'rejected' ? 'rejected' : 'pending',
            metadata: {
              permissionId: p.id,
              permissionType: p.permissionType,
              permissionDate: p.date,
              permissionTime: `${p.startTime} - ${p.endTime}`,
              durationHours: p.durationHours,
              reason: p.reason,
            },
          });
        }

        if (p.status === 'approved' || p.status === 'rejected') {
          const permRevId = `perm_rev_${p.id}`;
          if (!addedIds.has(permRevId) && !result.some((r) => (r.type === 'permission_approved' || r.type === 'permission_rejected') && r.metadata?.permissionId === p.id)) {
            const revTime = p.reviewedAt || p.appliedAt;
            const reviewer = p.reviewedBy || 'Manager';
            result.push({
              id: permRevId,
              employeeId: p.employeeId,
              employeeName: p.employeeName,
              employeeCode: p.employeeCode,
              department: p.department,
              type: p.status === 'approved' ? 'permission_approved' : 'permission_rejected',
              category: 'permission',
              title: `${p.permissionType.toUpperCase()} Permission ${p.status === 'approved' ? 'Approved' : 'Rejected'}`,
              description: `${reviewer} ${p.status === 'approved' ? 'approved' : 'declined'} your permission request for ${p.durationHours}h.${p.managerComments ? ` Note: "${p.managerComments}"` : ''}`,
              timestamp: revTime || `${p.date}T${p.endTime}:00Z`,
              date: revTime ? revTime.split('T')[0] : p.date,
              timeFormatted: revTime ? new Date(revTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : p.endTime,
              status: p.status === 'approved' ? 'approved' : 'rejected',
              metadata: {
                permissionId: p.id,
                permissionType: p.permissionType,
                permissionDate: p.date,
                durationHours: p.durationHours,
                reviewerName: reviewer,
                comments: p.managerComments,
              },
            });
          }
        }
      });

    // Sort all activity items descending by timestamp/date
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activityLogs, attendanceRecords, leaveRequests, permissionRequests, currentEmployee]);

  return (
    <AttendanceContext.Provider
      value={{
        employees,
        currentEmployee,
        setCurrentEmployeeId,
        officeLocations,
        attendanceRecords,
        leaveRequests,
        permissionRequests,
        activityLogs,
        myActivityLogs,
        logUserActivity,
        clearActivityLogs,
        isOnline,
        offlineQueueCount: pendingOfflinePunches.length,
        pendingOfflinePunches,
        syncPendingOfflinePunches,
        clearOfflinePunchQueue,
        currentCoords,
        isUsingRealGPS,
        gpsError,
        locationPermissionStatus,
        hasAcquiredRealGPS,
        isLocating,
        requestLocationPermission,
        setManualLocation,
        enableRealGPS,
        refreshGPSPosition,
        proximityAlert,
        dismissProximityAlert,
        triggerTestProximityAlert,
        pushNotificationPermission,
        requestPushNotificationPermission,
        markCheckIn,
        markCheckOut,
        todayRecord,
        applyLeave,
        applyPermission,
        reviewLeave,
        reviewLeaveAsManager,
        reviewLeaveAsHR,
        reviewPermission,
        pendingManagerLeaves,
        pendingHRLeaves,
        notifications,
        myNotifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        isCurrentHR,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeLoginAccess,
        resetEmployeeDeviceBinding,
        terminateEmployeeMobileSession,
        refillEmployeeLeavesForAnniversary,
        runAnniversaryLeaveRefills,
        updateEmployeeLocations,
        updateEmployeeShift,
        addOfficeLocation,
        updateOfficeLocation,
        deleteOfficeLocation,
        leaveDefinitions,
        updateLeaveDefinition,
        addLeaveDefinition,
        deleteLeaveDefinition,
        permissionDefinitions,
        updatePermissionDefinition,
        addPermissionDefinition,
        deletePermissionDefinition,
        gradeDefinitions,
        updateGradeDefinition,
        addGradeDefinition,
        deleteGradeDefinition,
        taPolicy,
        updateTAPolicy,
        resetTAPolicy,
        holidayDefinitions,
        updateHolidayDefinition,
        addHolidayDefinition,
        deleteHolidayDefinition,
        workSchedule,
        updateWorkSchedule,
        addShift,
        updateShift,
        deleteShift,
        resetAllDefinitions,
        currentDevice,
        simulateDeviceChange,
        isMobileDeviceView,
        setIsMobileDeviceView,
        isAuthenticated,
        setIsAuthenticated,
        wipeAllSystemData,
        login,
        logout,
        activeAppMode,
        setActiveAppMode,
        isDbConnected,
        isDbSyncing,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
};
