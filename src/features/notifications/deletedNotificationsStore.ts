import * as SecureStore from 'expo-secure-store';
import type { NotificationItem } from './api/notificationsApi';

const STORAGE_KEY = 'serbisure.deleted_notifications';
let memoryDeletedIds = new Set<string>();
let isLoaded = false;

/**
 * Loads the persisted set of deleted notification IDs from storage into memory.
 */
export async function loadDeletedNotificationIds(): Promise<Set<string>> {
  if (isLoaded) return memoryDeletedIds;
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryDeletedIds = new Set(parsed.map(String));
      }
    }
  } catch {
    // Non-blocking fallback
  }
  isLoaded = true;
  return memoryDeletedIds;
}

/**
 * Checks synchronously whether a notification ID has been deleted.
 */
export function isNotificationDeleted(id: string): boolean {
  return memoryDeletedIds.has(String(id));
}

/**
 * Marks a notification ID as deleted and persists it so it never returns.
 */
export async function markNotificationDeleted(id: string): Promise<void> {
  const strId = String(id);
  memoryDeletedIds.add(strId);
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify(Array.from(memoryDeletedIds).slice(-300))
    );
  } catch {
    // Non-blocking
  }
}

/**
 * Marks multiple notification IDs as deleted and persists them.
 */
export async function markAllNotificationsDeleted(ids: string[]): Promise<void> {
  for (const id of ids) {
    memoryDeletedIds.add(String(id));
  }
  try {
    await SecureStore.setItemAsync(
      STORAGE_KEY,
      JSON.stringify(Array.from(memoryDeletedIds).slice(-300))
    );
  } catch {
    // Non-blocking
  }
}

/**
 * Filters an array of notifications to exclude all persistently deleted ones.
 */
export function filterActiveNotifications(items: NotificationItem[]): NotificationItem[] {
  return items.filter(item => !memoryDeletedIds.has(String(item.notification_id)));
}
