'use client';

import { useEffect, useState } from 'react';
import { Bell, Calendar, User, MessageSquare, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type NotificationType = 'appointment' | 'message' | 'user' | 'alert' | 'success';

<<<<<<< HEAD
interface NotificationData {
  [key: string]: string | number | boolean | null | undefined;
}

interface DBNotification {
  id: string;
  type: NotificationType;
  title: string | null;
  message: string;
  created_at: string;
  read: boolean;
  data?: NotificationData | null;
  user_id: string;
}

=======
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
<<<<<<< HEAD
  data: NotificationData;
=======
  data?: Record<string, any>;
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;

        setNotifications(
<<<<<<< HEAD
          (data as DBNotification[]).map((n) => ({
=======
          data.map((n: any) => ({
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
            id: n.id,
            type: n.type,
            title: n.title || getDefaultTitle(n.type),
            message: n.message,
            createdAt: n.created_at,
            read: n.read,
            data: n.data || {},
          }))
        );
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: 'user_id=eq.' + supabase.auth.getUser()?.then(u => u.data.user?.id) 
        },
        (payload) => {
<<<<<<< HEAD
          const newNotification: Notification = {
=======
          const newNotification = {
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
            id: payload.new.id,
            type: payload.new.type as NotificationType,
            title: payload.new.title || getDefaultTitle(payload.new.type),
            message: payload.new.message,
            createdAt: payload.new.created_at,
            read: false,
<<<<<<< HEAD
            data: (payload.new.data as NotificationData) || {},
=======
            data: payload.new.data || {},
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
          };
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
          
          // Show browser notification if the tab is not focused
          if (document.visibilityState !== 'visible') {
            new Notification(newNotification.title, {
              body: newNotification.message,
              icon: '/logo.png',
            });
          }
        }
      )
      .subscribe();

    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getNotificationIcon = (type: NotificationType) => {
    const iconClass = 'h-5 w-5 flex-shrink-0';
    
    switch (type) {
      case 'appointment':
        return <Calendar className={`${iconClass} text-blue-500`} />;
      case 'message':
        return <MessageSquare className={`${iconClass} text-emerald-500`} />;
      case 'user':
        return <User className={`${iconClass} text-purple-500`} />;
      case 'alert':
        return <AlertCircle className={`${iconClass} text-amber-500`} />;
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      default:
        return <Bell className={`${iconClass} text-gray-500`} />;
    }
  };

  const getDefaultTitle = (type: string): string => {
    switch (type) {
      case 'appointment': return 'New Appointment';
      case 'message': return 'New Message';
      case 'user': return 'User Update';
      case 'alert': return 'Alert';
      case 'success': return 'Success';
      default: return 'Notification';
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-12 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
<<<<<<< HEAD
          You&apos;ll see notifications here when you have them.
=======
          You'll see notifications here when you have them.
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
        </p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <li 
            key={notification.id} 
            className={cn(
              'relative py-4 px-4 hover:bg-gray-50 cursor-pointer',
              !notification.read && 'bg-blue-50'
            )}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-500">
                  {notification.message}
                </p>
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <Clock className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-gray-400" />
                  <span>
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              {!notification.read && (
                <div className="ml-4 flex-shrink-0">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="bg-gray-50 px-4 py-3 text-center border-t border-gray-200">
        <a
          href="/dashboard/admin/notifications"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          View all notifications
        </a>
      </div>
    </div>
  );
}
