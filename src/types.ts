export type UserRole = 'employee' | 'manager' | 'admin' | 'hr';

export type AttendanceStatus = 'on_time' | 'late' | 'half_day' | 'completed' | 'active' | 'absent';

export type LeaveType = 
  | 'casual' 
  | 'sick' 
  | 'annual' 
  | 'maternity' 
  | 'paternity' 
  | 'unpaid' 
  | 'emergency' 
  | 'bereavement';

export type PermissionType = 
  | 'official' 
  | 'hospital' 
  | 'personal' 
  | 'weather'
  | 'official_permission'
  | 'hospital_permission'
  | 'personal_permission'
  | 'weather_permission'
  | 'late_entry' 
  | 'early_exit' 
  | 'mid_day_personal' 
  | 'official_duty' 
  | 'doctor_appointment' 
  | 'client_meeting';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface OfficeLocation {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // Geofence radius in meters (e.g. 150m)
  timezone: string;
  color: string;
  description: string;
  isActive: boolean;
}

export interface EmployeeDeviceBinding {
  deviceId: string; // Unique terminal/hardware identifier (e.g. DEV_X9A8_482F)
  deviceName: string; // Human-friendly device title (e.g. "Apple iPhone 15 (Safari)", "Windows 11 PC (Chrome)")
  os: string; // iOS, Android, macOS, Windows, Linux
  browser: string; // Safari, Chrome, Edge, Firefox
  boundAt: string; // ISO timestamp when account was mapped to this hardware
  lastLoginAt?: string; // ISO timestamp of most recent successful session
  ipAddress?: string;
  userAgent?: string;
}

export interface ActiveMobileSession {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  platform: 'mobile' | 'desktop' | 'tablet';
  os?: string;
  browser?: string;
  loggedInAt: string;
  lastActiveAt: string;
  ipAddress?: string;
  isSingleMobileActive: boolean;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  username?: string; // Employee system login username
  password?: string; // Employee system login password / credentials
  isActive?: boolean; // Active vs Inactive staff status
  canLogin?: boolean; // HR Login toggle: whether employee is allowed to log in and use the system (default: true)
  avatar: string;
  employeeCode: string;
  role: UserRole;
  department: string;
  designation: string;
  gradeId?: string; // ID of the GradeDefinition (e.g. 'gr_e1', 'gr_e2', etc.)
  phone: string;
  joinedDate: string; // YYYY-MM-DD (Anniversary Anchor for automatic annual leave refill without carry-over)
  lastLeaveRefillDate?: string; // YYYY-MM-DD of the most recent annual anniversary refill
  
  // Single-Device Hardware Binding & Active Mobile Session
  deviceId?: string | null; // Bound hardware ID (1 account -> 1 device). Only HR can reset.
  deviceBinding?: EmployeeDeviceBinding | null; // Detailed device metadata for HR audit and user feedback
  isMobileLoggedIn?: boolean; // True when 1 active mobile session is logged in
  activeMobileSession?: ActiveMobileSession | null; // Detailed live active mobile session
  
  annualLeaveAllowance?: {
    casual: number;
    sick: number;
    annual: number;
  };
  allowedLocationIds: string[]; // Strict list of office location IDs this employee is authorized to mark attendance at
  managerId?: string; // ID of the reporting manager
  todayStatus: 'present' | 'absent' | 'on_leave' | 'on_permission';
  leaveBalance: {
    casual: number;
    sick: number;
    annual: number;
    permissionsCountThisMonth: number;
  };
}

export type LocationPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'checking';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  timestamp: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // HH:mm:ss
  checkOutTime?: string; // HH:mm:ss
  officeLocationId: string;
  officeLocationName: string;
  checkInCoords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  checkOutCoords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  distanceToOfficeMeters: number;
  isGeofenceValid: boolean;
  status: AttendanceStatus;
  workDurationMinutes?: number;
  totalHoursWorked?: number;
  breakDurationMinutes?: number;
  deviceInfo?: string;
  notes?: string;
}

export type LeaveDurationOption = 'full_day' | 'multi_day' | 'half_day_morning' | 'half_day_afternoon';

export interface LeaveDocumentAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  uploadedAt: string;
}

export type ApprovalWorkflowType = 'manager_only' | 'hr_only' | 'both';
export type ApprovalStage = 'pending_manager' | 'pending_hr' | 'approved' | 'rejected';

export interface ApprovalStepInfo {
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedByRole?: 'manager' | 'hr' | 'admin';
  reviewedAt?: string;
  comments?: string;
}

export interface AppNotification {
  id: string;
  recipientEmployeeId: string;
  title: string;
  message: string;
  type:
    | 'leave_approved'
    | 'leave_rejected'
    | 'leave_forwarded_hr'
    | 'leave_applied'
    | 'permission_approved'
    | 'permission_rejected'
    | 'anniversary_refill'
    | 'system'
    | 'security'
    | 'info';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  relatedRequestId?: string;
  timestamp: string;
  isRead: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
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
  status: RequestStatus;
  appliedAt: string;
  emergencyContact?: string;

  // Multi-Stage Approval Workflow
  approvalRequired?: ApprovalWorkflowType; // 'manager_only' | 'hr_only' | 'both'
  currentStage?: ApprovalStage; // 'pending_manager' | 'pending_hr' | 'approved' | 'rejected'
  managerApproval?: ApprovalStepInfo;
  hrApproval?: ApprovalStepInfo;
  rejectionStage?: 'manager' | 'hr';

  // Legacy/Compatibility fields
  reviewedBy?: string;
  reviewedAt?: string;
  managerComments?: string;
  hrComments?: string;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  permissionType: PermissionType;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  reason: string;
  status: RequestStatus;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  managerComments?: string;
}

export interface GeofenceCheckResult {
  isInAllowedGeofence: boolean;
  nearestLocation?: OfficeLocation;
  distanceToNearestMeters: number;
  isAuthorizedLocation: boolean;
  activeAuthorizedLocation?: OfficeLocation;
  statusMessage: string;
  accuracyAlert?: string;
}

// ==========================================
// DEFINITIONS MODULE INTERFACES (HR / ADMIN)
// ==========================================

export interface LeaveDefinition {
  id: string;
  code: string; // e.g. 'CL', 'SL', 'AL', 'ML', 'PL', 'BL', 'CO', 'UL'
  name: string; // e.g. 'Casual Leave', 'Sick / Medical Leave'
  category: 'paid' | 'unpaid' | 'statutory';
  annualQuotaDays: number;
  minDurationDays: number; // e.g. 0.5, 1 day
  maxDurationDays: number; // e.g. 3, 7, 14, 90 days
  maxConsecutiveDays?: number;
  allowAfterDays: number; // Days of tenure before employee is eligible (0 = Day 1)
  approvalBy: 'manager_only' | 'hr_only' | 'both'; // approval workflow
  attachmentMandatory: boolean; // whether file/proof attachment is required
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  encashmentAllowed: boolean;
  minNoticeDays: number;
  halfDayAllowed: boolean;
  docRequiredAfterDays: number; // 0 if not required
  color: string;
  description: string;
  isActive: boolean;
}

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  maxPerMonth: number;
  maxHoursPerInstance: number;
  monthlyHoursCap: number;
  requiresManagerApproval: boolean;
  isPaid: boolean;
  allowedTimeWindow: 'start_of_day' | 'mid_day' | 'end_of_day' | 'any';
  description: string;
  isActive: boolean;
}

export interface GradeDefinition {
  id: string;
  gradeCode: string;
  gradeName: string;
  gradeNameAr?: string; // Arabic Grade Name (e.g. أخصائي أول / مهندس)
  color?: string;
  description: string;
  isActive: boolean;
  allowedLeaveCodes?: string[]; // Allowed leave codes e.g. ['CL', 'SL', 'AL', 'ML', 'PL', 'BL', 'CO', 'UL']
  level?: number;
  designations?: string[];
  monthlyHoursTarget?: number;
  overtimeEligible?: boolean;
  travelPerDiemTier?: string;
  travelPerDiemAmount?: number;
  hotelCapPerNight?: number;
  noticePeriodDays?: number;
  probationMonths?: number;
  annualLeaveMultiplier?: number;
}

export interface TAPolicyDefinition {
  // Time & Attendance Parameters
  gracePeriodMinutes: number;
  lateMarkPenaltyCount: number;
  halfDayMinimumHours: number;
  fullDayMinimumHours: number;
  strictGeofenceEnforcement: boolean;
  gpsAccuracyToleranceMeters: number;
  autoCheckoutAtMidnight: boolean;
  allowBiometricBypass: boolean;
  overtimeMinMinutes: number;
  weekendWorkAutoCompOff: boolean;

  // Travel & Allowance (TA) Parameters
  mileageRatePerKm: number;
  dailyAllowanceMetro: number;
  dailyAllowanceNonMetro: number;
  foodAllowancePerDay: number;
  outstationAdvanceAllowed: boolean;
  requireExpenseReceiptsAbove: number;
  claimSubmissionWindowDays: number;
}

export interface HolidayDefinition {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  type: 'public' | 'optional' | 'restricted' | 'company';
  applicableLocationIds: string[]; // 'all' or specific loc ids
  description: string;
  isRecurringYearly: boolean;
  isActive: boolean;
}

export interface ShiftTiming {
  id: string;
  name: string;
  code: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakDurationMinutes: number;
  netWorkHours: number;
  isFlexible: boolean;
  coreHoursStart?: string;
  coreHoursEnd?: string;
  color: string;
  applicableDepartments: string[];
  isActive: boolean;
}

export interface WorkScheduleDefinition {
  id: string;
  name: string;
  workingDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  saturdayRule: 'all_off' | 'alternate_off' | 'first_third_working' | 'all_working';
  shifts: ShiftTiming[];
  defaultShiftId: string;
  weeklyWorkHours: number;
}

// ==========================================
// USER ACTIVITY & AUDIT LOGS
// ==========================================

export type ActivityLogCategory = 'punch' | 'auth' | 'leave' | 'permission' | 'system';

export type ActivityLogType =
  | 'check_in'
  | 'check_out'
  | 'login'
  | 'logout'
  | 'leave_applied'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_forwarded'
  | 'permission_applied'
  | 'permission_approved'
  | 'permission_rejected'
  | 'anniversary_refill'
  | 'profile_update'
  | 'gps_verification';

export interface UserActivityLog {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department?: string;
  type: ActivityLogType;
  category: ActivityLogCategory;
  title: string;
  description: string;
  timestamp: string; // ISO String: 2026-08-31T09:14:00.000Z
  date: string; // YYYY-MM-DD
  timeFormatted: string; // e.g. "09:14 AM"
  status: 'success' | 'warning' | 'info' | 'error' | 'pending' | 'approved' | 'rejected';
  locationName?: string;
  deviceInfo?: string;
  ipAddress?: string;
  metadata?: {
    locationId?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    hoursWorked?: number;
    durationFormatted?: string;
    punchType?: 'check_in' | 'check_out';
    leaveType?: string;
    totalDays?: number;
    startDate?: string;
    endDate?: string;
    permissionType?: string;
    permissionDate?: string;
    permissionTime?: string;
    durationHours?: number;
    reason?: string;
    reviewerName?: string;
    reviewerRole?: string;
    comments?: string;
    documentAttachmentName?: string;
    documentAttachmentUrl?: string;
    authMethod?: string;
    clientUserAgent?: string;
    [key: string]: any;
  };
}

