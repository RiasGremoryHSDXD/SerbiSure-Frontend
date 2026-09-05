import { API_BASE_URL, fetchWithTimeout } from '../config/api';

const NOTIFICATIONS_BASE = `${API_BASE_URL}/api/v1/notifications`;

export interface NotificationItem {
  notification_id: string;
  notification_message: string;
  notification_state: 'Read' | 'Unread';
  createdAt: string;
  sender_id?: string;
  sender_name?: string;
}

export interface NotificationsListResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

/**
 * Fetch notifications for the current authenticated user.
 * GET /api/v1/notifications/
 */
export async function fetchNotifications(token: string): Promise<NotificationsListResponse> {
  try {
    const res = await fetchWithTimeout(`${NOTIFICATIONS_BASE}/`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.detail || `Failed to fetch notifications (${res.status})`);
    }

    const data: NotificationsListResponse = await res.json();
    return data;
  } catch (error: any) {
    console.warn('[notificationsApi] fetchNotifications error:', error?.message || error);
    throw error;
  }
}

/**
 * Mark a single notification as Read.
 * PATCH /api/v1/notifications/<notificationId>/read/
 */
export async function markNotificationRead(token: string, notificationId: string): Promise<void> {
  try {
    const res = await fetchWithTimeout(`${NOTIFICATIONS_BASE}/${notificationId}/read/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.detail || `Failed to mark notification as read (${res.status})`);
    }
  } catch (error: any) {
    console.warn('[notificationsApi] markNotificationRead error:', error?.message || error);
    throw error;
  }
}

/**
 * Mark all unread notifications as Read.
 * PATCH /api/v1/notifications/mark-all-read/
 */
export async function markAllNotificationsRead(token: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(`${NOTIFICATIONS_BASE}/mark-all-read/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.detail || `Failed to mark all notifications as read (${res.status})`);
    }

    const data = await res.json();
    return data.marked_count ?? 0;
  } catch (error: any) {
    console.warn('[notificationsApi] markAllNotificationsRead error:', error?.message || error);
    throw error;
  }
}
