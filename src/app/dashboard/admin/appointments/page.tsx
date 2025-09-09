'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, Search, Plus, Filter, CheckCircle, XCircle, MoreHorizontal } from 'lucide-react';
import { format, isToday, isAfter, isBefore, isThisWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';

type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

interface Appointment {
  id: string;
  patient_id: string;
  patient: {
    first_name: string;
    last_name: string;
    email?: string;
    phone_number?: string;
  };
  provider_id?: string;
  provider?: {
    first_name: string;
    last_name: string;
  };
  vaccine_id?: string;
  vaccine?: {
    name: string;
  };
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface QueryParams {
  appointment_date?: string;
  appointment_date_gte?: string;
  appointment_date_lt?: string;
  status?: AppointmentStatus;
  search?: string;
  [key: string]: string | boolean | undefined;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { getAppointments, loading } = useAppointments();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('today');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [, setIsLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      const query: QueryParams = {};
      
      // Apply date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        query.appointment_date = format(today, 'yyyy-MM-dd');
      } else if (dateFilter === 'upcoming') {
        query.appointment_date_gte = format(today, 'yyyy-MM-dd');
      } else if (dateFilter === 'past') {
        query.appointment_date_lt = format(today, 'yyyy-MM-dd');
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        query.status = statusFilter;
      }
      
      // Apply search query
      if (searchQuery) {
        query.search = searchQuery;
      }
      
      const data = await getAppointments(query);
      setAppointments(data || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to fetch appointments');
      setIsLoading(false);
    }
  }, [getAppointments, dateFilter, statusFilter, searchQuery]);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) return;
    
    const channel = supabase
      .channel('appointments-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => fetchAppointments()
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchAppointments, supabase]);

  const handleStatusUpdate = useCallback(async (id: string, status: string) => {
    try {
      if (!supabase) throw new Error('Supabase client not initialized');
      
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      // Show success notification
      toast.success(`Appointment marked as ${status}`);

      // Refresh the appointments list
      fetchAppointments();
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    }
  }, [supabase, fetchAppointments]);

  const getStatusBadge = (status: AppointmentStatus) => {
    const statusConfig = {
      scheduled: { text: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
      completed: { text: 'Completed', color: 'bg-green-100 text-green-800' },
      cancelled: { text: 'Cancelled', color: 'bg-red-100 text-red-800' },
      no_show: { text: 'No Show', color: 'bg-yellow-100 text-yellow-800' },
    };
    
    const config = statusConfig[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const formatAppointmentDate = (dateString: string, timeString: string) => {
    const date = new Date(`${dateString}T${timeString}`);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isThisWeek(date, { weekStartsOn: 1 })) {
      return `${format(date, 'EEEE')} at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  const filteredAppointments = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) return [];
    return appointments.filter((appointment: Appointment) => {
      if (!appointment) return false;
      
      // Convert appointment to searchable string
      const searchable = Object.values(appointment).join(' ').toLowerCase();
      const matchesSearch = !searchQuery || 
        searchable.includes(searchQuery.toLowerCase());
      
      // Filter by date
      const appointmentDate = new Date(appointment.appointment_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = isToday(appointmentDate);
      } else if (dateFilter === 'upcoming') {
        matchesDate = isAfter(appointmentDate, today);
      } else if (dateFilter === 'past') {
        matchesDate = isBefore(appointmentDate, today);
      }

      // Filter by status
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [appointments, searchQuery, dateFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage and track patient appointments
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/admin/appointments/new')} className="mt-4 md:mt-0">
          <Plus className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search appointments..."
                  className="w-full pl-8 md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant={dateFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('today')}
                >
                  Today
                </Button>
                <Button
                  variant={dateFilter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('upcoming')}
                >
                  Upcoming
                </Button>
                <Button
                  variant={dateFilter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('past')}
                >
                  Past
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {statusFilter === 'all' ? 'All Status' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('scheduled')}>
                    Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                    Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                    Cancelled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter('no_show')}>
                    No Show
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No appointments found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? 'No appointments match your search.'
                  : 'Get started by creating a new appointment.'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/admin/appointments/new')}>
                <Plus className="mr-2 h-4 w-4" /> New Appointment
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {`${appointment.patient.first_name} ${appointment.patient.last_name}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {formatAppointmentDate(appointment.appointment_date, appointment.start_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {appointment.vaccine?.name || 'General Checkup'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(appointment.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/admin/appointments/${appointment.id}`)}
                            >
                              View Details
                            </DropdownMenuItem>
                            {appointment.status === 'scheduled' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark as Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                  className="text-red-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Cancel Appointment
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(appointment.id, 'no_show')}
                                  className="text-yellow-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Mark as No Show
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
