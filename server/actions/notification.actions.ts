'use server';

import { createClient } from '@/lib/supabase/server';
import { NotificationEntry, ActionResult } from '@/types/auth';

/**
 * Fetch unread notification count and latest notifications for authenticated user.
 */
export async function getNotificationsAction(): Promise<
  ActionResult<{ count: number; notifications: NotificationEntry[] }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { count: 0, notifications: [] } };
  }

  const { data, count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications.',
      },
    };
  }

  const notifications: NotificationEntry[] = (data || []).map((n) => ({
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    isRead: n.is_read,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    data: {
      count: count || unreadCount,
      notifications,
    },
  };
}

/**
 * Mark a notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<{ success: boolean }>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }

  return { data: { success: true } };
}

/**
 * Mark all unread notifications as read for current user.
 */
export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ success: boolean }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: { success: true } };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }

  return { data: { success: true } };
}

