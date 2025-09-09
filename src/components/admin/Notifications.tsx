'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, Calendar, User, MessageSquare, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

type NotificationType = 'appointment' | 'inventory' | 'message' | 'user' | 'alert' | 'success' | 'info';

interface NotificationData {
  [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: NotificationData;
  user_id: string;
}

interface NotificationsProps {
  maxItems?: number;
  className?: string;
}

export function Notifications({ maxItems = 10, className = '' }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Helper function to get the appropriate icon for each notification type
  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { className: 'h-5 w-5' };
    
    switch (type) {
      case 'appointment':
        return <Calendar {...iconProps} className={cn(iconProps.className, 'text-blue-500')} />;
      case 'inventory':
        return <Package {...iconProps} className={cn(iconProps.className, 'text-amber-500')} />;
      case 'message':
        return <MessageSquare {...iconProps} className={cn(iconProps.className, 'text-green-500')} />;
      case 'user':
        return <User {...iconProps} className={cn(iconProps.className, 'text-purple-500')} />;
      case 'alert':
        return <AlertCircle {...iconProps} className={cn(iconProps.className, 'text-red-500')} />;
      case 'success':
        return <CheckCircle {...iconProps} className={cn(iconProps.className, 'text-green-500')} />;
      default:
        return <Bell {...iconProps} className={cn(iconProps.className, 'text-gray-500')} />;
    }
  };

  // Check if a table exists in the database
  const checkTableExists = useCallback(async (tableName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      // If we get an error, the table might not exist or we don't have permissions
      return !error;
    } catch (error) {
      console.error(`Error checking if table ${tableName} exists:`, error);
      return false;
    }
  }, [supabase]);

  // Fetch notifications from the server
  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if notifications table exists
      const notificationsTableExists = await checkTableExists('notifications');
      
      if (!notificationsTableExists) {
        console.warn('Notifications table does not exist');
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(maxItems);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Don't show error toast for missing tables to avoid spamming the user
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('relation "notifications" does not exist')) {
        toast.error('Failed to load notifications');
      }
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [maxItems, supabase, checkTableExists]);

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      setIsMarkingAllRead(true);
      
      // Check if notifications table exists
      const notificationsTableExists = await checkTableExists('notifications');
      if (!notificationsTableExists) {
        toast.info('No notifications to mark as read');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      // Don't show error toast for missing tables to avoid spamming the user
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('relation "notifications" does not exist')) {
        toast.error('Failed to mark notifications as read');
      }
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      setIsClearing(true);
      
      // Check if notifications table exists
      const notificationsTableExists = await checkTableExists('notifications');
      if (!notificationsTableExists) {
        toast.info('No notifications to clear');
        return;
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .not('id', 'is', null);

      if (error) throw error;

      setNotifications([]);
      setUnreadCount(0);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      // Don't show error toast for missing tables to avoid spamming the user
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('relation "notifications" does not exist')) {
        toast.error('Failed to clear notifications');
      }
    } finally {
      setIsClearing(false);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        // Check if notifications table exists
        const notificationsTableExists = await checkTableExists('notifications');
        
        if (notificationsTableExists) {
          await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', notification.id);
        }

        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
        // Silently fail - we still want to handle the click even if marking as read fails
      }
    }

    // Handle navigation based on notification type
    if (notification.type === 'appointment') {
      // Navigate to appointment
    } else if (notification.type === 'message') {
      // Navigate to messages
    }
    
    // Close the dropdown
    setIsOpen(false);
  };

  // Format notification time
  const formatNotificationTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('realtime notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchNotifications, supabase]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right overflow-hidden rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            <div className="flex space-x-2">
              <button
                onClick={markAllAsRead}
                disabled={isMarkingAllRead || unreadCount === 0}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {isMarkingAllRead ? 'Marking...' : 'Mark all as read'}
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearAll}
                disabled={isClearing || notifications.length === 0}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              >
                {isClearing ? 'Clearing...' : 'Clear all'}
              </button>
            </div>
          </div>

          <ScrollArea className="max-h-96">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex cursor-pointer items-start p-4 hover:bg-gray-50',
                      !notification.read && 'bg-blue-50'
                    )}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}