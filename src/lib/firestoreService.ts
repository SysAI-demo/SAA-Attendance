// Enterprise Firestore Service for 500+ Distributed Employees & Synchronized Multi-Device Punching
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
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
} from '../types';

export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  LOCATIONS: 'office_locations',
  ATTENDANCE: 'attendance_records',
  LEAVES: 'leave_requests',
  PERMISSIONS: 'permission_requests',
  NOTIFICATIONS: 'notifications',
  ACTIVITY_LOGS: 'user_activity_logs',
  DEFINITIONS: 'system_definitions',
};

// Document IDs for singleton definition objects
export const DEFINITION_DOCS = {
  LEAVES: 'def_leaves',
  PERMISSIONS: 'def_permissions',
  GRADES: 'def_grades',
  TA_POLICY: 'def_ta_policy',
  HOLIDAYS: 'def_holidays',
  WORK_SCHEDULE: 'def_work_schedule',
};

export interface FirestoreErrorInfo {
  error: string;
  operation: string;
  path?: string;
  authInfo?: {
    userId?: string;
    email?: string;
  };
}

export function handleFirestoreError(error: unknown, operationType: string, path?: string): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operation: operationType,
    path,
  };
  console.error(`[Firestore Error] ${operationType} on ${path || 'unknown'}:`, errInfo);
  return errInfo;
}

/**
 * Sanitizes an object before saving to Firestore to remove undefined values
 * which would trigger Firestore errors.
 */
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export const firestoreService = {
  // ==========================================
  // EMPLOYEES CRUD & REAL-TIME LISTENER
  // ==========================================
  subscribeEmployees(callback: (employees: Employee[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.EMPLOYEES);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Employee[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as Employee);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribeEmployees snapshot:', error);
      }
    );
  },

  async saveEmployee(employee: Employee): Promise<void> {
    const docRef = doc(db, COLLECTIONS.EMPLOYEES, employee.id);
    await setDoc(docRef, sanitizeForFirestore(employee), { merge: true });
  },

  async deleteEmployee(employeeId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.EMPLOYEES, employeeId);
    await deleteDoc(docRef);
  },

  // ==========================================
  // OFFICE LOCATIONS & GEOFENCES
  // ==========================================
  subscribeLocations(callback: (locations: OfficeLocation[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.LOCATIONS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: OfficeLocation[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as OfficeLocation);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribeLocations snapshot:', error);
      }
    );
  },

  async saveLocation(location: OfficeLocation): Promise<void> {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, location.id);
    await setDoc(docRef, sanitizeForFirestore(location), { merge: true });
  },

  async deleteLocation(locationId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, locationId);
    await deleteDoc(docRef);
  },

  // ==========================================
  // ATTENDANCE RECORDS (OPTIMIZED REAL-TIME STREAM)
  // ==========================================
  subscribeAttendance(callback: (records: AttendanceRecord[]) => void): Unsubscribe {
    // Order by date & checkInTime descending, optimized for up to 1000 latest punches across the enterprise
    const colRef = collection(db, COLLECTIONS.ATTENDANCE);
    const q = query(colRef, orderBy('date', 'desc'), limit(1000));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as AttendanceRecord);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribeAttendance snapshot:', error);
      }
    );
  },

  async saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ATTENDANCE, record.id);
    await setDoc(docRef, sanitizeForFirestore(record), { merge: true });
  },

  // ==========================================
  // LEAVE REQUESTS (MULTI-STAGE WORKFLOW)
  // ==========================================
  subscribeLeaves(callback: (leaves: LeaveRequest[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.LEAVES);
    const q = query(colRef, orderBy('appliedAt', 'desc'), limit(500));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: LeaveRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as LeaveRequest);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribeLeaves snapshot:', error);
      }
    );
  },

  async saveLeaveRequest(leave: LeaveRequest): Promise<void> {
    const docRef = doc(db, COLLECTIONS.LEAVES, leave.id);
    await setDoc(docRef, sanitizeForFirestore(leave), { merge: true });
  },

  // ==========================================
  // PERMISSION REQUESTS
  // ==========================================
  subscribePermissions(callback: (permissions: PermissionRequest[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.PERMISSIONS);
    const q = query(colRef, orderBy('appliedAt', 'desc'), limit(500));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: PermissionRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as PermissionRequest);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribePermissions snapshot:', error);
      }
    );
  },

  async savePermissionRequest(permission: PermissionRequest): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PERMISSIONS, permission.id);
    await setDoc(docRef, sanitizeForFirestore(permission), { merge: true });
  },

  // ==========================================
  // REAL-TIME NOTIFICATIONS
  // ==========================================
  subscribeNotifications(callback: (notifications: AppNotification[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.NOTIFICATIONS);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(200));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as AppNotification);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribeNotifications snapshot:', error);
      }
    );
  },

  async saveNotification(notification: AppNotification): Promise<void> {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notification.id);
    await setDoc(docRef, sanitizeForFirestore(notification), { merge: true });
  },

  async markNotificationRead(notifId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notifId);
    await updateDoc(docRef, { isRead: true });
  },

  async batchMarkNotificationsRead(notifIds: string[]): Promise<void> {
    if (notifIds.length === 0) return;
    const batch = writeBatch(db);
    for (const id of notifIds) {
      const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, id);
      batch.update(docRef, { isRead: true });
    }
    await batch.commit();
  },

  // ==========================================
  // REAL-TIME USER ACTIVITY & AUDIT LOGS
  // ==========================================
  subscribeActivityLogs(callback: (logs: UserActivityLog[]) => void): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.ACTIVITY_LOGS);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(1000));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: UserActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), id: docSnap.id } as UserActivityLog);
        });
        callback(list);
      },
      (error) => {
        console.error('Error in subscribeActivityLogs snapshot:', error);
      }
    );
  },

  async saveActivityLog(log: UserActivityLog): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ACTIVITY_LOGS, log.id);
    await setDoc(docRef, sanitizeForFirestore(log), { merge: true });
  },

  async batchSaveActivityLogs(logs: UserActivityLog[]): Promise<void> {
    if (logs.length === 0) return;
    const batch = writeBatch(db);
    for (const logItem of logs) {
      const docRef = doc(db, COLLECTIONS.ACTIVITY_LOGS, logItem.id);
      batch.set(docRef, sanitizeForFirestore(logItem), { merge: true });
    }
    await batch.commit();
  },

  // ==========================================
  // SYSTEM CONFIGURATIONS & DEFINITIONS
  // ==========================================
  subscribeDefinitions(
    callback: (defs: {
      leaves?: LeaveDefinition[];
      permissions?: PermissionDefinition[];
      grades?: GradeDefinition[];
      taPolicy?: TAPolicyDefinition;
      holidays?: HolidayDefinition[];
      workSchedule?: WorkScheduleDefinition;
    }) => void
  ): Unsubscribe {
    const colRef = collection(db, COLLECTIONS.DEFINITIONS);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const result: Record<string, unknown> = {};
        snapshot.forEach((docSnap) => {
          result[docSnap.id] = docSnap.data();
        });

        callback({
          leaves: (result[DEFINITION_DOCS.LEAVES] as { items: LeaveDefinition[] })?.items,
          permissions: (result[DEFINITION_DOCS.PERMISSIONS] as { items: PermissionDefinition[] })?.items,
          grades: (result[DEFINITION_DOCS.GRADES] as { items: GradeDefinition[] })?.items,
          taPolicy: (result[DEFINITION_DOCS.TA_POLICY] as { data: TAPolicyDefinition })?.data,
          holidays: (result[DEFINITION_DOCS.HOLIDAYS] as { items: HolidayDefinition[] })?.items,
          workSchedule: (result[DEFINITION_DOCS.WORK_SCHEDULE] as { data: WorkScheduleDefinition })?.data,
        });
      },
      (error) => {
        console.error('Error in subscribeDefinitions snapshot:', error);
      }
    );
  },

  async saveLeaveDefinitions(items: LeaveDefinition[]): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.LEAVES);
    await setDoc(docRef, { items: sanitizeForFirestore(items), updatedAt: new Date().toISOString() });
  },

  async savePermissionDefinitions(items: PermissionDefinition[]): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.PERMISSIONS);
    await setDoc(docRef, { items: sanitizeForFirestore(items), updatedAt: new Date().toISOString() });
  },

  async saveGradeDefinitions(items: GradeDefinition[]): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.GRADES);
    await setDoc(docRef, { items: sanitizeForFirestore(items), updatedAt: new Date().toISOString() });
  },

  async saveTAPolicy(data: TAPolicyDefinition): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.TA_POLICY);
    await setDoc(docRef, { data: sanitizeForFirestore(data), updatedAt: new Date().toISOString() });
  },

  async saveHolidayDefinitions(items: HolidayDefinition[]): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.HOLIDAYS);
    await setDoc(docRef, { items: sanitizeForFirestore(items), updatedAt: new Date().toISOString() });
  },

  async saveWorkSchedule(data: WorkScheduleDefinition): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.WORK_SCHEDULE);
    await setDoc(docRef, { data: sanitizeForFirestore(data), updatedAt: new Date().toISOString() });
  },

  // ==========================================
  // BULLETPROOF DATABASE INITIAL SEEDING
  // ==========================================
  async checkAndSeedInitialDatabase(seeds: {
    employees: Employee[];
    locations: OfficeLocation[];
    attendance: AttendanceRecord[];
    leaves: LeaveRequest[];
    permissions: PermissionRequest[];
    notifications: AppNotification[];
    activityLogs?: UserActivityLog[];
    leaveDefinitions: LeaveDefinition[];
    permissionDefinitions: PermissionDefinition[];
    gradeDefinitions: GradeDefinition[];
    taPolicy: TAPolicyDefinition;
    holidayDefinitions: HolidayDefinition[];
    workSchedule: WorkScheduleDefinition;
  }): Promise<boolean> {
    try {
      const empSnap = await getDocs(collection(db, COLLECTIONS.EMPLOYEES));
      if (!empSnap.empty) {
        // Database is already populated
        return false;
      }

      console.log('Database empty: Seeding enterprise dataset into Cloud Firestore...');

      // Batch 1: Employees & Locations
      const batch1 = writeBatch(db);
      for (const emp of seeds.employees) {
        const ref = doc(db, COLLECTIONS.EMPLOYEES, emp.id);
        batch1.set(ref, sanitizeForFirestore(emp));
      }
      for (const loc of seeds.locations) {
        const ref = doc(db, COLLECTIONS.LOCATIONS, loc.id);
        batch1.set(ref, sanitizeForFirestore(loc));
      }
      await batch1.commit();

      // Batch 2: Attendance records & Activity Logs
      const batch2 = writeBatch(db);
      for (const rec of seeds.attendance) {
        const ref = doc(db, COLLECTIONS.ATTENDANCE, rec.id);
        batch2.set(ref, sanitizeForFirestore(rec));
      }
      if (seeds.activityLogs && seeds.activityLogs.length > 0) {
        for (const logItem of seeds.activityLogs.slice(0, 300)) {
          const ref = doc(db, COLLECTIONS.ACTIVITY_LOGS, logItem.id);
          batch2.set(ref, sanitizeForFirestore(logItem));
        }
      }
      await batch2.commit();

      // Batch 3: Leaves, Permissions & Notifications
      const batch3 = writeBatch(db);
      for (const lvr of seeds.leaves) {
        const ref = doc(db, COLLECTIONS.LEAVES, lvr.id);
        batch3.set(ref, sanitizeForFirestore(lvr));
      }
      for (const pmr of seeds.permissions) {
        const ref = doc(db, COLLECTIONS.PERMISSIONS, pmr.id);
        batch3.set(ref, sanitizeForFirestore(pmr));
      }
      for (const ntf of seeds.notifications) {
        const ref = doc(db, COLLECTIONS.NOTIFICATIONS, ntf.id);
        batch3.set(ref, sanitizeForFirestore(ntf));
      }
      await batch3.commit();

      // Batch 4: System Definitions
      const batch4 = writeBatch(db);
      batch4.set(doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.LEAVES), {
        items: sanitizeForFirestore(seeds.leaveDefinitions),
        updatedAt: new Date().toISOString(),
      });
      batch4.set(doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.PERMISSIONS), {
        items: sanitizeForFirestore(seeds.permissionDefinitions),
        updatedAt: new Date().toISOString(),
      });
      batch4.set(doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.GRADES), {
        items: sanitizeForFirestore(seeds.gradeDefinitions),
        updatedAt: new Date().toISOString(),
      });
      batch4.set(doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.TA_POLICY), {
        data: sanitizeForFirestore(seeds.taPolicy),
        updatedAt: new Date().toISOString(),
      });
      batch4.set(doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.HOLIDAYS), {
        items: sanitizeForFirestore(seeds.holidayDefinitions),
        updatedAt: new Date().toISOString(),
      });
      batch4.set(doc(db, COLLECTIONS.DEFINITIONS, DEFINITION_DOCS.WORK_SCHEDULE), {
        data: sanitizeForFirestore(seeds.workSchedule),
        updatedAt: new Date().toISOString(),
      });
      await batch4.commit();

      console.log('Enterprise Cloud Firestore Database successfully seeded!');
      return true;
    } catch (err) {
      console.error('Database seeding error:', err);
      return false;
    }
  },

  async wipeAllFirestoreCollections(): Promise<boolean> {
    try {
      const collectionsToWipe = [
        COLLECTIONS.EMPLOYEES,
        COLLECTIONS.LOCATIONS,
        COLLECTIONS.ATTENDANCE,
        COLLECTIONS.LEAVES,
        COLLECTIONS.PERMISSIONS,
        COLLECTIONS.NOTIFICATIONS,
        COLLECTIONS.ACTIVITY_LOGS,
      ];

      for (const colName of collectionsToWipe) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        if (snapshot.size > 0) {
          const batch = writeBatch(db);
          for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
          }
          await batch.commit();
        }
      }
      console.log('Successfully wiped all Firestore operational data.');
      return true;
    } catch (err) {
      console.error('Error wiping Firestore data:', err);
      return false;
    }
  },
};
