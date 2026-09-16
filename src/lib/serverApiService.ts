// Client-side API Service connecting to the Server-Side Database & Real-Time SSE Engine
import {
  Employee,
  OfficeLocation,
  AttendanceRecord,
  LeaveRequest,
  PermissionRequest,
  AppNotification,
  UserActivityLog,
  GeoCoordinates,
  EmployeeDeviceBinding,
  ActiveMobileSession,
  LeaveDefinition,
  PermissionDefinition,
  GradeDefinition,
  TAPolicyDefinition,
  HolidayDefinition,
  WorkScheduleDefinition,
} from '../types';

export interface FullServerSyncData {
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
}

class ServerApiService {
  private eventSource: EventSource | null = null;
  private currentUserId: string = '';
  private currentUserRole: string = 'employee';

  public setUserContext(userId: string, role: string) {
    this.currentUserId = userId;
    this.currentUserRole = role;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-user-id': this.currentUserId,
      'x-user-role': this.currentUserRole,
    };
  }

  private async safeFetch(url: string, init?: RequestInit, retries: number = 1): Promise<Response | null> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, init);
        return res;
      } catch (err) {
        if (attempt === retries) {
          console.warn(`[ServerAPI] Network request to ${url} temporarily unavailable:`, (err as any)?.message || err);
          return null;
        }
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
      }
    }
    return null;
  }

  // ==============================================================
  // 1. FULL SYNC & REAL-TIME SSE (200 CONCURRENT USERS)
  // ==============================================================
  public async fetchFullSync(): Promise<FullServerSyncData | null> {
    try {
      const res = await this.safeFetch('/api/sync', { headers: this.getHeaders() }, 2);
      if (!res || !res.ok) throw new Error(`HTTP ${res?.status || 'Network Error'}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.warn('[ServerAPI] fetchFullSync fallback:', err);
      return null;
    }
  }

  public subscribeEvents(onEvent: (event: { type: string; payload: any }) => void): () => void {
    if (typeof window === 'undefined' || !window.EventSource) {
      return () => {};
    }

    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch {
          // ignore non-json pings
        }
      };

      this.eventSource.onerror = () => {
        // Will auto-reconnect by browser standard
      };
    } catch (err) {
      console.warn('[ServerAPI] EventSource subscription error:', err);
    }

    return () => {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
    };
  }

  // ==============================================================
  // 2. SERVER-VALIDATED GEOFENCE PUNCH
  // ==============================================================
  public async punchAttendance(params: {
    employeeId: string;
    type: 'in' | 'out';
    coords: GeoCoordinates;
    device?: EmployeeDeviceBinding;
    notes?: string;
  }): Promise<{ success: boolean; message: string; record?: AttendanceRecord; error?: string; isOutsideGeofence?: boolean; isDeviceMismatch?: boolean }> {
    try {
      const res = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, message: 'Server communication error', error: err.message };
    }
  }

  // ==============================================================
  // 3. EMPLOYEES CRUD
  // ==============================================================
  public async saveEmployee(employee: Employee): Promise<Employee | null> {
    try {
      const res = await this.safeFetch('/api/employees', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(employee),
      });
      if (!res) return employee;
      const data = await res.json();
      return data.employee || employee;
    } catch (err) {
      console.warn('[ServerAPI] saveEmployee fallback:', err);
      return employee;
    }
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    try {
      const res = await this.safeFetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res ? res.ok : false;
    } catch {
      return false;
    }
  }

  // ==============================================================
  // 3b. MOBILE DEVICE & SESSION TRACKING
  // ==============================================================
  public async recordMobileSession(employeeId: string, session: ActiveMobileSession): Promise<Employee | null> {
    try {
      const res = await this.safeFetch('/api/auth/mobile-session', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ employeeId, session }),
      });
      if (!res) return null;
      const data = await res.json();
      return data.employee || null;
    } catch (err) {
      console.warn('[ServerAPI] recordMobileSession fallback:', err);
      return null;
    }
  }

  public async clearMobileSession(employeeId: string): Promise<void> {
    try {
      await this.safeFetch('/api/auth/mobile-session/logout', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ employeeId }),
      });
    } catch (err) {
      console.warn('[ServerAPI] clearMobileSession fallback:', err);
    }
  }

  // ==============================================================
  // 4. LOCATIONS / GEOFENCES CRUD
  // ==============================================================
  public async saveLocation(location: OfficeLocation): Promise<OfficeLocation | null> {
    try {
      const res = await this.safeFetch('/api/locations', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(location),
      });
      if (!res) return location;
      const data = await res.json();
      return data.location || location;
    } catch (err) {
      console.warn('[ServerAPI] saveLocation fallback:', err);
      return location;
    }
  }

  public async deleteLocation(id: string): Promise<boolean> {
    try {
      const res = await this.safeFetch(`/api/locations/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return res ? res.ok : false;
    } catch {
      return false;
    }
  }

  // ==============================================================
  // 5. REQUESTS (LEAVES & PERMISSIONS)
  // ==============================================================
  public async saveLeave(leave: LeaveRequest): Promise<void> {
    try {
      await this.safeFetch('/api/leaves', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(leave),
      });
    } catch (err) {
      console.warn('[ServerAPI] saveLeave fallback:', err);
    }
  }

  public async savePermission(perm: PermissionRequest): Promise<void> {
    try {
      await this.safeFetch('/api/permissions', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(perm),
      });
    } catch (err) {
      console.warn('[ServerAPI] savePermission fallback:', err);
    }
  }

  public async actionRequest(
    type: 'leave' | 'permission',
    id: string,
    action: 'approved' | 'rejected',
    comments?: string,
    approvedBy?: string
  ): Promise<boolean> {
    try {
      const res = await this.safeFetch(`/api/requests/${type}/${id}/action`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ action, comments, approvedBy }),
      });
      return res ? res.ok : false;
    } catch {
      return false;
    }
  }

  public async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    try {
      await this.safeFetch('/api/attendance', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.warn('[ServerAPI] saveAttendanceRecord fallback:', err);
    }
  }

  public async saveLeaveRequest(leave: LeaveRequest): Promise<void> {
    return this.saveLeave(leave);
  }

  public async savePermissionRequest(perm: PermissionRequest): Promise<void> {
    return this.savePermission(perm);
  }

  public async saveNotification(notification: AppNotification): Promise<void> {
    try {
      await this.safeFetch('/api/notifications', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(notification),
      });
    } catch (err) {
      console.warn('[ServerAPI] saveNotification fallback:', err);
    }
  }

  public async batchMarkNotificationsRead(ids: string[]): Promise<void> {
    try {
      await this.safeFetch('/api/notifications/batch-read', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ ids }),
      });
    } catch (err) {
      console.warn('[ServerAPI] batchMarkNotificationsRead fallback:', err);
    }
  }

  public async saveActivityLog(log: UserActivityLog): Promise<void> {
    return this.logActivity(log);
  }

  public async saveLeaveDefinitions(defs: LeaveDefinition[]): Promise<void> {
    return this.updateDefinition('leaves', defs);
  }

  public async savePermissionDefinitions(defs: PermissionDefinition[]): Promise<void> {
    return this.updateDefinition('permissions', defs);
  }

  public async saveGradeDefinitions(defs: GradeDefinition[]): Promise<void> {
    return this.updateDefinition('grades', defs);
  }

  public async saveTAPolicy(policy: TAPolicyDefinition): Promise<void> {
    return this.updateDefinition('taPolicy', policy);
  }

  public async saveHolidayDefinitions(defs: HolidayDefinition[]): Promise<void> {
    return this.updateDefinition('holidays', defs);
  }

  public async saveWorkSchedule(schedule: WorkScheduleDefinition): Promise<void> {
    return this.updateDefinition('workSchedule', schedule);
  }

  // ==============================================================
  // 6. SYSTEM DEFINITIONS
  // ==============================================================
  public async updateDefinition(section: string, payload: any): Promise<void> {
    try {
      await this.safeFetch(`/api/definitions/${section}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn(`[ServerAPI] updateDefinition ${section} fallback:`, err);
    }
  }

  public async resetAllDefinitions(): Promise<void> {
    try {
      await this.safeFetch('/api/definitions/reset-all', {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (err) {
      console.warn('[ServerAPI] resetAllDefinitions fallback:', err);
    }
  }

  // ==============================================================
  // 7. ACTIVITY LOGS & NOTIFICATIONS
  // ==============================================================
  public async logActivity(log: UserActivityLog): Promise<void> {
    try {
      await this.safeFetch('/api/activity-logs', {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(log),
      });
    } catch (err) {
      console.warn('[ServerAPI] logActivity fallback:', err);
    }
  }

  public async markNotificationRead(id: string): Promise<void> {
    try {
      await this.safeFetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: this.getHeaders(),
      });
    } catch (err) {
      console.warn('[ServerAPI] markNotificationRead fallback:', err);
    }
  }

  // ==============================================================
  // 8. SERVER STATS & HEALTH
  // ==============================================================
  public async getHealth(): Promise<any> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  public async getStats(): Promise<any> {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const serverApiService = new ServerApiService();
