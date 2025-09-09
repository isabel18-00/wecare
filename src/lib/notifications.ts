import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

type NotificationType = 'appointment' | 'inventory' | 'message' | 'user' | 'alert' | 'success';

interface NotificationData {
  [key: string]: string | number | boolean | null | undefined | Record<string, any>;
}

export async function sendNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: notification, error } = await supabase
    .rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_data: data || null
    });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return notification;
}

export async function sendAdminNotification(
  type: NotificationType,
  title: string,
  message: string,
  data?: NotificationData
) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Get all admin users
  const { data: admins, error: adminError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('role', 'admin');

  if (adminError) {
    console.error('Error fetching admin users:', adminError);
    throw adminError;
  }

  // Send notification to each admin
  const notifications = await Promise.all(
    admins.map(admin => 
      sendNotification(admin.id, type, title, message, data)
    )
  );

  return notifications;
}
