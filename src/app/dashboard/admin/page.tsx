'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Calendar, Syringe, MessageSquare, Activity, Clock } from 'lucide-react';
import { StatCard } from '@/components/admin/StatCard';
import { Notifications } from '@/components/admin/Notifications';
import { InventorySummary } from '@/components/admin/InventorySummary';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  lowStockItems: number;
  unreadMessages: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    lowStockItems: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  interface ActivityLog {
    id: string;
    type: string;
    description: string;
    created_at: string;
    [key: string]: string | number | boolean | null | undefined; // For additional properties
  }

  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const supabase = createClient();
  const router = useRouter();

<<<<<<< HEAD
=======
  // Define the expected response types for Supabase queries
  interface SupabaseError {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  }

  type SupabaseCountResponse = { count: number | null; error: SupabaseError | null; };
  type SupabaseActivityResponse = { data: ActivityLog[] | null; error: SupabaseError | null; };

  // Check authentication and fetch data
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
  useEffect(() => {
    const isMounted = true;
    
    const checkAuthAndFetchData = async () => {
      try {
        // First, check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          if (isMounted) {
            router.push('/auth/login?redirectedFrom=/dashboard/admin');
          }
          return;
        }
        
        // Then check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (profileError || profile?.role !== 'admin') {
          if (isMounted) {
            router.push('/dashboard');
          }
          return;
        }
        
        // If we get here, user is authenticated and is an admin
        if (isMounted) {
          await fetchDashboardData();
        }
      } catch (err) {
        console.error('Authentication check failed:', err);
        if (isMounted) {
          setError('Failed to verify authentication status');
          setLoading(false);
        }
      }
    };
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all data in parallel
        const [
<<<<<<< HEAD
          patientsResponse,
          appointmentsResponse,
          inventoryResponse,
          messagesResponse,
          activityResponse
        ] = await Promise.all([
=======
          { count: totalPatients },
          { count: todayAppointments },
          { count: lowStockItems },
          { count: unreadMessages },
          { data: activityData },
        ] = await Promise.all<SupabaseCountResponse | SupabaseActivityResponse>([
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
          supabase.from('patients').select('*', { count: 'exact', head: true }),
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('appointment_date', new Date().toISOString().split('T')[0])
            .order('appointment_time', { ascending: true }),
          supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true })
            .lte('quantity', 10), // Items with quantity <= 10
          supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('read', false),
          supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

<<<<<<< HEAD
        const totalPatients = patientsResponse.count || 0;
        const todayAppointments = appointmentsResponse.count || 0;
        const lowStockItems = inventoryResponse.count || 0;
        const unreadMessages = messagesResponse.count || 0;
        const activityData = activityResponse.data || [];

=======
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
        setStats({
          totalPatients: totalPatients || 0,
          todayAppointments: todayAppointments || 0,
          lowStockItems: lowStockItems || 0,
          unreadMessages: unreadMessages || 0,
        });

        setRecentActivity(activityData || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    
    checkAuthAndFetchData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 text-lg font-medium">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">
<<<<<<< HEAD
          Welcome back! Here&apos;s what&apos;s happening with your clinic today.
=======
          Welcome back! Here's what's happening with your clinic today.
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients}
          icon={<Users className="h-5 w-5 text-white" />}
          color="bg-indigo-600"
          href="/dashboard/admin/patients"
        />
        <StatCard
          title={"Today's Appointments"}
          value={stats.todayAppointments}
          icon={<Calendar className="h-5 w-5 text-white" />}
          color="bg-blue-600"
          href="/dashboard/admin/appointments"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockItems}
          icon={<Syringe className="h-5 w-5 text-white" />}
          color={stats.lowStockItems > 0 ? 'bg-amber-500' : 'bg-green-600'}
          href="/dashboard/admin/inventory"
        />
        <StatCard
          title="Unread Messages"
          value={stats.unreadMessages}
          icon={<MessageSquare className="h-5 w-5 text-white" />}
          color="bg-emerald-600"
          href="/dashboard/admin/messages"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Notifications */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Recent Notifications
              </h3>
            </div>
            <div className="p-4">
              <Notifications />
            </div>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow overflow-hidden h-full">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Low Stock Items
              </h3>
            </div>
            <div className="p-4">
              <InventorySummary />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Recent Activity
          </h3>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {recentActivity.map((activity, index) => (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {index !== recentActivity.length - 1 ? (
                        <span 
                          className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" 
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center ring-8 ring-white">
                            <Activity className="h-5 w-5 text-white" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-sm text-gray-800">
                              {activity.description}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-sm text-gray-500">
                            <time dateTime={activity.created_at}>
                              {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activity</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activity will appear here as it happens.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
