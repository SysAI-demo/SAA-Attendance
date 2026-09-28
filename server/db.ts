// High-Performance Server-Side Database Engine
// Designed for 200+ Concurrent Employees with In-Memory Indexing & Atomic Disk Persistence
import fs from 'fs';
import path from 'path';
import {
  Employee,
  OfficeLocation,
  AttendanceRecord,
  LeaveRequest,
  PermissionRequest,
  AppNotification,
  UserActivityLog,
  LeaveDefinition,
  PermissionDefinition,
  GradeDefinition,
  TAPolicyDefinition,
  HolidayDefinition,
  WorkScheduleDefinition,
  EmployeeDeviceBinding,
  ActiveMobileSession,
} from '../src/types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_OFFICE_LOCATIONS,
  INITIAL_ATTENDANCE,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PERMISSION_REQUESTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ACTIVITY_LOGS,
  DEFAULT_HR_ADMIN_USER,
  DEFAULT_HQ_LOCATION,
} from '../src/data/seedData';
import {
  INITIAL_LEAVE_DEFINITIONS,
  INITIAL_PERMISSION_DEFINITIONS,
  INITIAL_GRADE_DEFINITIONS,
  INITIAL_TA_POLICY,
  INITIAL_HOLIDAY_DEFINITIONS,
  INITIAL_WORK_SCHEDULE,
} from '../src/data/definitionsSeed';

export interface DatabaseSchema {
  version: number;
  lastUpdated: string;
  isWiped?: boolean;
  employees: Employee[];
  locations: OfficeLocation[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  permissions: PermissionRequest[];
  notifications: AppNotification[];
  activityLogs: UserActivityLog[];
  definitions: {
    leaves: LeaveDefinition[];
    permissions: PermissionDefinition[];
    grades: GradeDefinition[];
    taPolicy: TAPolicyDefinition;
    holidays: HolidayDefinition[];
    workSchedule: WorkScheduleDefinition;
  };
  deviceBindings: Record<string, EmployeeDeviceBinding>;
}

// In-Memory Database Store (High Performance 0ms Lookups)
class ServerDatabase {
  private data: DatabaseSchema;
  private dbFilePath: string;
  private isSaving: boolean = false;
  private savePending: boolean = false;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private sseClients: Set<(event: { type: string; payload: any }) => void> = new Set();

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        console.error('Error creating data directory:', err);
      }
    }

    this.dbFilePath = path.join(dataDir, 'saata-database.json');
    this.data = this.loadOrCreateDatabase();
  }

  private loadOrCreateDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.employees)) {
          console.log(`[ServerDB] Successfully loaded database with ${parsed.employees.length} employees and ${parsed.attendance?.length || 0} records.`);
          parsed.employees = parsed.employees.map((emp: any) => {
            if (emp.id === 'emp_01' || (emp.name && emp.name.toLowerCase().includes('danish khan'))) {
              return {
                ...emp,
                role: 'hr',
                department: 'Human Resources',
                designation: emp.designation === 'Senior Full Stack Engineer' ? 'HR Specialist' : (emp.designation || 'HR Specialist'),
                designationAr: emp.designationAr || 'أخصائي الموارد البشرية',
              };
            }
            return emp;
          });
          // Ensure locations are always populated with valid office geofences
          if (!parsed.locations || !Array.isArray(parsed.locations) || parsed.locations.length === 0) {
            parsed.locations = parsed.isWiped
              ? [DEFAULT_HQ_LOCATION]
              : [DEFAULT_HQ_LOCATION, ...INITIAL_OFFICE_LOCATIONS.filter((l) => l.id !== DEFAULT_HQ_LOCATION.id)];
          }

          // Ensure definitions are always fully populated
          if (!parsed.definitions || !parsed.definitions.leaves || !Array.isArray(parsed.definitions.leaves) || parsed.definitions.leaves.length === 0) {
            parsed.definitions = {
              leaves: INITIAL_LEAVE_DEFINITIONS,
              permissions: INITIAL_PERMISSION_DEFINITIONS,
              grades: INITIAL_GRADE_DEFINITIONS,
              taPolicy: parsed.definitions?.taPolicy && parsed.definitions.taPolicy.shiftStartTime ? parsed.definitions.taPolicy : INITIAL_TA_POLICY,
              holidays: INITIAL_HOLIDAY_DEFINITIONS,
              workSchedule: parsed.definitions?.workSchedule && parsed.definitions.workSchedule.shifts?.length ? parsed.definitions.workSchedule : INITIAL_WORK_SCHEDULE,
            };
          }

          // Ensure operational sample records are populated ONLY IF database has not been explicitly wiped for launch
          if (!parsed.isWiped) {
            if (!parsed.attendance || !Array.isArray(parsed.attendance) || parsed.attendance.length === 0) {
              parsed.attendance = INITIAL_ATTENDANCE;
            }
            if (!parsed.leaves || !Array.isArray(parsed.leaves) || parsed.leaves.length === 0) {
              parsed.leaves = INITIAL_LEAVE_REQUESTS;
            }
            if (!parsed.permissions || !Array.isArray(parsed.permissions) || parsed.permissions.length === 0) {
              parsed.permissions = INITIAL_PERMISSION_REQUESTS;
            }
            if (!parsed.activityLogs || !Array.isArray(parsed.activityLogs) || parsed.activityLogs.length === 0) {
              parsed.activityLogs = INITIAL_ACTIVITY_LOGS;
            }
            if (!parsed.notifications || !Array.isArray(parsed.notifications) || parsed.notifications.length === 0) {
              parsed.notifications = INITIAL_NOTIFICATIONS;
            }
          } else {
            parsed.attendance = parsed.attendance || [];
            parsed.leaves = parsed.leaves || [];
            parsed.permissions = parsed.permissions || [];
            parsed.activityLogs = parsed.activityLogs || [];
            parsed.notifications = parsed.notifications || [];
          }
          if (!parsed.deviceBindings || typeof parsed.deviceBindings !== 'object') {
            parsed.deviceBindings = {};
          }

          this.saveToDiskSync(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[ServerDB] Error reading existing database file:', err);
    }

    // Default clean database with HR Admin and HQ location for manual user provisioning
    console.log('[ServerDB] Initializing baseline clean database with HR Admin account...');
    const initialDb: DatabaseSchema = {
      version: 2,
      lastUpdated: new Date().toISOString(),
      employees: [DEFAULT_HR_ADMIN_USER],
      locations: [DEFAULT_HQ_LOCATION],
      attendance: [],
      leaves: [],
      permissions: [],
      notifications: [],
      activityLogs: [],
      definitions: {
        leaves: INITIAL_LEAVE_DEFINITIONS,
        permissions: INITIAL_PERMISSION_DEFINITIONS,
        grades: INITIAL_GRADE_DEFINITIONS,
        taPolicy: INITIAL_TA_POLICY,
        holidays: INITIAL_HOLIDAY_DEFINITIONS,
        workSchedule: INITIAL_WORK_SCHEDULE,
      },
      deviceBindings: {},
    };

    this.saveToDiskSync(initialDb);
    return initialDb;
  }

  private saveToDiskSync(dataToSave: DatabaseSchema) {
    try {
      const tempPath = `${this.dbFilePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbFilePath);
    } catch (err) {
      console.error('[ServerDB] Error writing database to disk:', err);
    }
  }

  // Non-blocking asynchronous queued disk flush
  public queueSave() {
    this.data.lastUpdated = new Date().toISOString();

    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(async () => {
      if (this.isSaving) {
        this.savePending = true;
        return;
      }

      this.isSaving = true;
      try {
        const tempPath = `${this.dbFilePath}.tmp`;
        const serialized = JSON.stringify(this.data, null, 2);
        await fs.promises.writeFile(tempPath, serialized, 'utf-8');
        await fs.promises.rename(tempPath, this.dbFilePath);
      } catch (err) {
        console.error('[ServerDB] Async disk save failed:', err);
      } finally {
        this.isSaving = false;
        if (this.savePending) {
          this.savePending = false;
          this.queueSave();
        }
      }
    }, 150); // 150ms debounce ensures zero lag during punch-in bursts
  }

  // ==============================================================
  // REAL-TIME BROADCAST ENGINE (SSE for 200+ concurrent clients)
  // ==============================================================
  public registerSSEClient(send: (event: { type: string; payload: any }) => void): () => void {
    this.sseClients.add(send);
    return () => {
      this.sseClients.delete(send);
    };
  }

  public getConnectedClientsCount(): number {
    return this.sseClients.size;
  }

  public broadcast(type: string, payload: any) {
    this.queueSave();
    const event = { type, payload };
    const droppedClients: ((event: { type: string; payload: any }) => void)[] = [];
    for (const send of this.sseClients) {
      try {
        send(event);
      } catch {
        droppedClients.push(send);
      }
    }
    for (const dropped of droppedClients) {
      this.sseClients.delete(dropped);
    }
  }

  // ==============================================================
  // DATA ACCESS METHODS
  // ==============================================================
  public getFullState(): DatabaseSchema {
    return this.data;
  }

  // Employees
  public getEmployees(): Employee[] {
    return this.data.employees;
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.id === id);
  }

  public saveEmployee(employee: Employee): Employee {
    const idx = this.data.employees.findIndex((e) => e.id === employee.id);
    if (idx >= 0) {
      this.data.employees[idx] = { ...this.data.employees[idx], ...employee };
    } else {
      this.data.employees.unshift(employee);
    }

    if (employee.deviceBinding) {
      this.data.deviceBindings[employee.id] = employee.deviceBinding;
    }

    this.broadcast('employee_updated', employee);
    return employee;
  }

  public setEmployeeMobileSession(id: string, session: ActiveMobileSession): Employee | null {
    const emp = this.data.employees.find((e) => e.id === id);
    if (!emp) return null;

    emp.isMobileLoggedIn = true;
    emp.activeMobileSession = session;
    if (session.deviceId) {
      emp.deviceId = session.deviceId;
    }
    if (session.deviceName && emp.deviceBinding) {
      emp.deviceBinding.lastLoginAt = session.loggedInAt;
    }

    this.broadcast('employee_updated', emp);
    return emp;
  }

  public clearEmployeeMobileSession(id: string): Employee | null {
    const emp = this.data.employees.find((e) => e.id === id);
    if (!emp) return null;

    emp.isMobileLoggedIn = false;
    emp.activeMobileSession = null;

    this.broadcast('employee_updated', emp);
    return emp;
  }

  public deleteEmployee(id: string): boolean {
    const initialLen = this.data.employees.length;
    this.data.employees = this.data.employees.filter((e) => e.id !== id);
    if (this.data.employees.length !== initialLen) {
      this.broadcast('employee_deleted', { id });
      return true;
    }
    return false;
  }

  // Locations / Geofences
  public getLocations(): OfficeLocation[] {
    return this.data.locations;
  }

  public saveLocation(loc: OfficeLocation): OfficeLocation {
    const idx = this.data.locations.findIndex((l) => l.id === loc.id);
    if (idx >= 0) {
      this.data.locations[idx] = { ...this.data.locations[idx], ...loc };
    } else {
      this.data.locations.unshift(loc);
    }
    this.broadcast('location_updated', loc);
    return loc;
  }

  public deleteLocation(id: string): boolean {
    const initialLen = this.data.locations.length;
    this.data.locations = this.data.locations.filter((l) => l.id !== id);
    if (this.data.locations.length !== initialLen) {
      this.broadcast('location_deleted', { id });
      return true;
    }
    return false;
  }

  // Attendance Records
  public getAttendance(filter?: { date?: string; employeeId?: string }): AttendanceRecord[] {
    let list = this.data.attendance;
    if (filter?.date) {
      list = list.filter((r) => r.date === filter.date);
    }
    if (filter?.employeeId) {
      list = list.filter((r) => r.employeeId === filter.employeeId);
    }
    return list;
  }

  public saveAttendanceRecord(record: AttendanceRecord): AttendanceRecord {
    const idx = this.data.attendance.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.data.attendance[idx] = { ...this.data.attendance[idx], ...record };
    } else {
      this.data.attendance.unshift(record);
    }
    this.broadcast('attendance_updated', record);
    return record;
  }

  // Leaves
  public getLeaves(employeeId?: string): LeaveRequest[] {
    if (employeeId) {
      return this.data.leaves.filter((l) => l.employeeId === employeeId);
    }
    return this.data.leaves;
  }

  public saveLeave(leave: LeaveRequest): LeaveRequest {
    const idx = this.data.leaves.findIndex((l) => l.id === leave.id);
    if (idx >= 0) {
      this.data.leaves[idx] = { ...this.data.leaves[idx], ...leave };
    } else {
      this.data.leaves.unshift(leave);
    }
    this.broadcast('leave_updated', leave);
    return leave;
  }

  // Permissions
  public getPermissions(employeeId?: string): PermissionRequest[] {
    if (employeeId) {
      return this.data.permissions.filter((p) => p.employeeId === employeeId);
    }
    return this.data.permissions;
  }

  public savePermission(perm: PermissionRequest): PermissionRequest {
    const idx = this.data.permissions.findIndex((p) => p.id === perm.id);
    if (idx >= 0) {
      this.data.permissions[idx] = { ...this.data.permissions[idx], ...perm };
    } else {
      this.data.permissions.unshift(perm);
    }
    this.broadcast('permission_updated', perm);
    return perm;
  }

  // Notifications
  public getNotifications(employeeId?: string): AppNotification[] {
    if (employeeId) {
      return this.data.notifications.filter((n) => n.recipientEmployeeId === employeeId || n.recipientEmployeeId === 'all');
    }
    return this.data.notifications;
  }

  public saveNotification(notification: AppNotification): AppNotification {
    this.data.notifications.unshift(notification);
    // Keep max 300 notifications
    if (this.data.notifications.length > 300) {
      this.data.notifications = this.data.notifications.slice(0, 300);
    }
    this.broadcast('notification_new', notification);
    return notification;
  }

  public markNotificationRead(id: string): void {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.broadcast('notification_read', { id });
    }
  }

  // Activity Logs
  public getActivityLogs(employeeId?: string, limitCount: number = 100): UserActivityLog[] {
    let logs = this.data.activityLogs;
    if (employeeId) {
      logs = logs.filter((l) => l.employeeId === employeeId);
    }
    return logs.slice(0, limitCount);
  }

  public addActivityLog(log: UserActivityLog): UserActivityLog {
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 1000) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 1000);
    }
    this.broadcast('activity_log_new', log);
    return log;
  }

  // Definitions
  public getDefinitions() {
    return this.data.definitions;
  }

  public updateDefinitions(section: keyof DatabaseSchema['definitions'], payload: any) {
    (this.data.definitions as any)[section] = payload;
    this.broadcast('definitions_updated', { section, payload });
  }

  public resetDefinitions() {
    this.data.definitions = {
      leaves: INITIAL_LEAVE_DEFINITIONS,
      permissions: INITIAL_PERMISSION_DEFINITIONS,
      grades: INITIAL_GRADE_DEFINITIONS,
      taPolicy: INITIAL_TA_POLICY,
      holidays: INITIAL_HOLIDAY_DEFINITIONS,
      workSchedule: INITIAL_WORK_SCHEDULE,
    };
    this.broadcast('definitions_reset', this.data.definitions);
  }

  // Device Binding
  public getDeviceBinding(employeeId: string): EmployeeDeviceBinding | undefined {
    return this.data.deviceBindings[employeeId];
  }

  public setDeviceBinding(employeeId: string, device: EmployeeDeviceBinding): void {
    this.data.deviceBindings[employeeId] = device;
    const emp = this.getEmployeeById(employeeId);
    if (emp) {
      emp.deviceBinding = device;
      emp.deviceId = device.deviceId;
    }
    this.broadcast('device_bound', { employeeId, device });
  }

  // Complete clean system wipe (retains primary HR admin for immediate login & user creation)
  public wipeAllData() {
    this.data.isWiped = true;
    this.data.employees = [DEFAULT_HR_ADMIN_USER];
    this.data.locations = [DEFAULT_HQ_LOCATION];
    this.data.attendance = [];
    this.data.leaves = [];
    this.data.permissions = [];
    this.data.notifications = [];
    this.data.activityLogs = [];
    this.data.deviceBindings = {};
    this.saveToDiskSync(this.data);
    this.broadcast('db_wiped', { timestamp: new Date().toISOString() });
    console.log('[ServerDB] Reset operational records. Baselines HR Administrator ready for manual employee provisioning.');
  }
}

export const serverDb = new ServerDatabase();
