// Enterprise Offline Attendance Punch Queue Engine
// Stores & queues offline check-in/out records for background network synchronization
import { AttendanceRecord } from '../types';

export interface QueuedPunch {
  id: string;
  type: 'check_in' | 'check_out';
  employeeId: string;
  employeeName: string;
  record: AttendanceRecord;
  options?: { biometricVerified?: boolean; biometricType?: 'face' | 'fingerprint' };
  queuedAt: string; // ISO string
  timestampMs: number;
  attempts: number;
  status: 'pending' | 'syncing' | 'failed';
  lastError?: string;
}

const QUEUE_STORAGE_KEY = 'saata_offline_punch_queue_v1';
const QUEUE_EVENT_NAME = 'saata_offline_queue_update';

/**
 * Retrieves the list of offline queued punches from local storage.
 */
export function getOfflineQueue(): QueuedPunch[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedPunch[];
  } catch (err) {
    console.error('[OfflineQueue] Failed to parse offline queue:', err);
    return [];
  }
}

/**
 * Saves the current queue to local storage and dispatches a window update event.
 */
export function saveOfflineQueue(queue: QueuedPunch[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(QUEUE_EVENT_NAME, { detail: { count: queue.length, queue } }));
    }
  } catch (err) {
    console.error('[OfflineQueue] Failed to write offline queue to localStorage:', err);
  }
}

/**
 * Enqueues a new punch record when offline or when network request fails.
 */
export function enqueuePunch(
  record: AttendanceRecord,
  type: 'check_in' | 'check_out',
  options?: { biometricVerified?: boolean; biometricType?: 'face' | 'fingerprint' }
): QueuedPunch {
  const queue = getOfflineQueue();
  
  // Check if identical punch ID is already queued
  const existingIndex = queue.findIndex((q) => q.record.id === record.id);
  
  const queuedItem: QueuedPunch = {
    id: `queue_${record.id}_${Date.now()}`,
    type,
    employeeId: record.employeeId,
    employeeName: record.employeeName,
    record,
    options,
    queuedAt: new Date().toISOString(),
    timestampMs: Date.now(),
    attempts: 0,
    status: 'pending',
  };

  if (existingIndex >= 0) {
    queue[existingIndex] = queuedItem;
  } else {
    queue.push(queuedItem);
  }

  saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Enqueued ${type} punch for ${record.employeeName} (${record.date} ${record.checkInTime || record.checkOutTime}). Total queued: ${queue.length}`);
  return queuedItem;
}

/**
 * Dequeues a punch after successful server synchronization.
 */
export function dequeuePunch(queueId: string): void {
  const queue = getOfflineQueue();
  const updated = queue.filter((q) => q.id !== queueId);
  saveOfflineQueue(updated);
}

/**
 * Clears all items from the offline punch queue.
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_STORAGE_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT_NAME, { detail: { count: 0, queue: [] } }));
  }
}

/**
 * Executes batch synchronization of all queued offline punches.
 */
export async function syncOfflineQueue(
  syncItemFn: (item: QueuedPunch) => Promise<boolean>
): Promise<{ successCount: number; failedCount: number; remainingCount: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0, remainingCount: 0 };
  }

  console.log(`[OfflineQueue] Starting batch sync of ${queue.length} offline punches...`);
  
  let successCount = 0;
  let failedCount = 0;

  // Process items in sequence to maintain chronological punch ordering
  for (const item of [...queue]) {
    try {
      item.status = 'syncing';
      item.attempts += 1;
      
      const isSynced = await syncItemFn(item);
      if (isSynced) {
        dequeuePunch(item.id);
        successCount++;
        console.log(`[OfflineQueue] Successfully synced punch ${item.id} (${item.type}) for ${item.employeeName}`);
      } else {
        item.status = 'failed';
        item.lastError = 'Server synchronization failed';
        failedCount++;
      }
    } catch (err: unknown) {
      item.status = 'failed';
      item.lastError = err instanceof Error ? err.message : 'Unknown sync error';
      failedCount++;
      console.error(`[OfflineQueue] Error syncing item ${item.id}:`, err);
    }
  }

  const remaining = getOfflineQueue().length;
  return { successCount, failedCount, remainingCount: remaining };
}
