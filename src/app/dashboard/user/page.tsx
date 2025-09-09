'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Syringe, MessageSquare, Bell, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Appointment = {
  id: string;
  scheduled_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
};

type VaccineRecord = {
  id: string;
  name: string;
  date: string;
  next_dose?: string;
  status: 'completed' | 'pending' | 'overdue';
};

export default function UserDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Use getUser() for secure authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.error('Authentication error:', authError);
          router.push('/auth/login');
          return;
        }

        // For patients, their user ID is the same as their patient ID
        // since the patients table extends user_profiles
        const patientId = user.id;
        
        // Verify the user has the patient role
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', patientId)
          .single();

        if (profileError || !userProfile) {
          console.error('Error verifying user role:', profileError);
          return;
        }

        // If the user is not a patient, redirect them
        if (userProfile.role !== 'patient') {
          console.error('User does not have patient role');
          router.push('/dashboard');
          return;
        }

        // Fetch appointments for the patient
        try {
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', patientId)
            .order('appointment_date', { ascending: true })
            .order('start_time', { ascending: true })
            .limit(3);

          if (appointmentsError) {
            console.error('Error fetching appointments:', appointmentsError);
          } else {
            setAppointments(appointmentsData || []);
          }
        } catch (err) {
          console.error('Appointments fetch error:', err);
        }

        // Fetch vaccination records for the patient
        try {
          const { data: vaccineData, error: vaccineError } = await supabase
            .from('vaccination_records')
            .select(`
              *,
              vaccines: vaccine_id (name, description)
            `)
            .eq('patient_id', patientId)
            .order('date_administered', { ascending: false })
            .limit(3);

          if (vaccineError) {
            console.error('Error fetching vaccination records:', vaccineError);
          } else {
            // Transform the data to match our expected format
            const formattedRecords: VaccineRecord[] = (vaccineData || []).map(record => ({
              id: record.id,
              name: record.vaccines?.name || 'Unknown Vaccine',
              date: record.date_administered,
              next_dose: record.next_due_date,
              status: 'completed' as const // Explicitly type as 'completed' to match the union type
            }));
            setVaccineRecords(formattedRecords);
          }
        } catch (err) {
          console.error('Vaccination records fetch error:', err);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-indigo-100">Here&apos;s what&apos;s happening with your health</p>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-24 p-4 text-center hover:bg-indigo-50"
          onClick={() => router.push('/dashboard/user/book')}
        >
          <Calendar className="h-6 w-6 text-indigo-600 mb-2" />
          <span>Book Appointment</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-24 p-4 text-center hover:bg-green-50"
          onClick={() => router.push('/dashboard/user/vaccination')}
        >
          <Syringe className="h-6 w-6 text-green-600 mb-2" />
          <span>Vaccine Records</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-24 p-4 text-center hover:bg-blue-50"
          onClick={() => router.push('/dashboard/user/messages')}
        >
          <MessageSquare className="h-6 w-6 text-blue-600 mb-2" />
          <span>Messages</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-24 p-4 text-center hover:bg-yellow-50"
          onClick={() => router.push('/dashboard/user/notifications')}
        >
          <Bell className="h-6 w-6 text-yellow-600 mb-2" />
          <span>Notifications</span>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 hover:bg-indigo-50"
              onClick={() => router.push('/dashboard/user/history')}
            >
              View All
            </Button>
          </div>
          
          {appointments.length > 0 ? (
            <div className="space-y-4">
              {appointments.map((appt) => (
                <div 
                  key={appt.id} 
                  className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/user/appointments/${appt.id}`)}
                >
                  <div className="flex-shrink-0 p-3 rounded-full bg-indigo-50 text-indigo-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {new Date(appt.scheduled_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(appt.status)}`}>
                        {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="h-4 w-4 mr-1" />
                      {new Date(appt.scheduled_at).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    {appt.notes && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {appt.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No upcoming appointments</p>
              <Button 
                variant="outline" 
                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => router.push('/dashboard/user/book')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Book Now
              </Button>
            </div>
          )}
        </div>
        
        {/* Vaccination Records */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Vaccination Records</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 hover:bg-indigo-50"
              onClick={() => router.push('/dashboard/user/vaccination')}
            >
              View All
            </Button>
          </div>
          
          {vaccineRecords.length > 0 ? (
            <div className="space-y-4">
              {vaccineRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/user/vaccination/${record.id}`)}
                >
                  <div className="flex-shrink-0 p-3 rounded-full bg-green-50 text-green-600">
                    <Syringe className="h-5 w-5" />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{record.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(record.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    {record.next_dose && (
                      <p className="text-xs text-blue-600 mt-1">
                        Next dose: {new Date(record.next_dose).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No vaccination records found</p>
              <Button 
                variant="outline" 
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => router.push('/dashboard/user/vaccination')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Health Tips Section */}
      <div className="bg-indigo-50 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Health Tips</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium text-indigo-700">Stay Hydrated</h3>
            <p className="text-sm text-gray-600 mt-1">Drink at least 8 glasses of water daily to maintain good health.</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium text-indigo-700">Regular Exercise</h3>
            <p className="text-sm text-gray-600 mt-1">Aim for 30 minutes of moderate exercise most days of the week.</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-medium text-indigo-700">Vaccination Schedule</h3>
            <p className="text-sm text-gray-600 mt-1">Keep track of your vaccination schedule and upcoming doses.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
