'use server';

import { createClient } from '@/utils/supabase/server';

type NotificationType = 'appointment' | 'inventory' | 'message' | 'user' | 'alert' | 'success';

interface NotificationData {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  try {
    const supabase = createClient();

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { data: notification, error: null };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { data: null, error };
  }
}

export async function sendAdminNotification(
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  try {
    const supabase = createClient();

    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (adminError) throw adminError;
    if (!admins || admins.length === 0) return { data: null, error: 'No admin users found' };

    // Send notification to each admin
    const notifications = await Promise.all(
      admins.map(admin =>
        supabase
          .from('notifications')
          .insert([
            {
              user_id: admin.id,
              type,
              title,
              message,
              data,
              read: false,
            },
          ])
          .select()
          .single()
      )
    );

    const errors = notifications.filter(n => n.error);
    if (errors.length > 0) {
      console.error('Errors sending admin notifications:', errors);
      return { data: null, error: 'Failed to send some admin notifications' };
    }

    return { data: notifications.map(n => n.data), error: null };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return { data: null, error };
  }
}
