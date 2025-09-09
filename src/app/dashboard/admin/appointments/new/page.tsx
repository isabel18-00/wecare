'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Clock, X, ChevronDown } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAppointments } from '@/hooks/useAppointments';

interface Patient {
  id: string;
  user_profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Provider {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Vaccine {
  id: string;
  name: string;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  const { bookAppointment, loading } = useAppointments();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    patientId: '',
    providerId: '',
    vaccineId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    duration: 30,
    reason: '',
    notes: ''
  });
  
  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{value: string, label: string}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch patients, vaccines, and providers
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch patients
        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, user_profiles!inner(first_name, last_name)')
          .order('user_profiles.first_name');
          
        if (patientsData) {
          setPatients(patientsData as unknown as Patient[]);
        }
        
        // Fetch vaccines
        const { data: vaccinesData } = await supabase
          .from('vaccines')
          .select('id, name')
          .eq('is_active', true)
          .order('name');
          
        if (vaccinesData) {
          setVaccines(vaccinesData);
        }
        
        // Fetch providers (doctors/nurses)
        const { data: providersData } = await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, role')
          .eq('role', 'provider')
          .order('first_name');
          
        if (providersData) {
          setProviders(providersData as unknown as Provider[]);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load required data. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    fetchData();
  }, [toast, supabase]);
  
  // Generate time slots when date or provider changes
  useEffect(() => {
    if (!formData.providerId || !formData.date) return;
    
    const generateTimeSlots = async () => {
    
    const generateTimeSlots = async () => {
      try {
        // Get provider's working hours (simplified - in a real app, this would come from a provider schedule)
        const workStart = 9; // 9 AM
        const workEnd = 17; // 5 PM
        const slotDuration = 30; // minutes
        
        // Get existing appointments for the selected date and provider
        const { data: existingAppointments } = await supabase
          .from('appointments')
          .select('start_time, end_time')
          .eq('provider_id', formData.providerId)
          .eq('appointment_date', formData.date)
          .neq('status', 'cancelled');
          
        // Generate all possible time slots
        const slots = [];
        const startDate = new Date(`${formData.date}T${workStart.toString().padStart(2, '0')}:00:00`);
        const endDate = new Date(`${formData.date}T${workEnd.toString().padStart(2, '0')}:00:00`);
        
        let currentSlot = new Date(startDate);
        
        while (currentSlot < endDate) {
          const slotEnd = addMinutes(new Date(currentSlot), slotDuration);
          const slotStartStr = format(currentSlot, 'HH:mm');
          const slotEndStr = format(slotEnd, 'HH:mm');
          
          // Check if this slot is available
          const isBooked = existingAppointments?.some(apt => {
            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);
            return (
              (currentSlot >= aptStart && currentSlot < aptEnd) ||
              (slotEnd > aptStart && slotEnd <= aptEnd) ||
              (currentSlot <= aptStart && slotEnd >= aptEnd)
            );
          });
          
          if (!isBooked) {
            slots.push({
              value: slotStartStr,
              label: `${slotStartStr} - ${slotEndStr}`
            });
          }
          
          currentSlot = addMinutes(currentSlot, 15); // Check every 15 minutes for availability
        }
        
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error('Error generating time slots:', error);
      }
    };
    
    generateTimeSlots();
    };
    
    generateTimeSlots();
  }, [formData.providerId, formData.date, supabase]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId) {
      toast({
        title: 'Error',
        description: 'Please select a patient',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const startTime = new Date(`${formData.date}T${formData.startTime}`);
      const endTime = addMinutes(new Date(startTime), formData.duration);
      
      const appointmentData = {
        patient_id: formData.patientId,
        provider_id: formData.providerId,
        vaccine_id: formData.vaccineId || undefined,
        appointment_date: formData.date,
        start_time: format(startTime, 'HH:mm:ss'),
        end_time: format(endTime, 'HH:mm:ss'),
        reason: formData.reason,
        notes: formData.notes,
      };
      
      await bookAppointment(appointmentData);
      
      toast({
        title: 'Success',
        description: 'Appointment scheduled successfully!',
      });
      
      // Redirect to appointments list
      router.push('/dashboard/admin/appointments');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule appointment',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Appointment</h1>
          <p className="text-muted-foreground">
            Schedule a new appointment for a patient
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
            <CardDescription>
              Enter the appointment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient</Label>
                <div className="relative">
                  <select
                    id="patientId"
                    name="patientId"
                    value={formData.patientId}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select a patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {`${patient.user_profiles.first_name} ${patient.user_profiles.last_name}`.trim()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>
              
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="providerId">Provider (Optional)</Label>
                <div className="relative">
                  <select
                    id="providerId"
                    name="providerId"
                    value={formData.providerId}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a provider (optional)</option>
                    {providers.map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {`${provider.first_name} ${provider.last_name}`.trim()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>
              
              {/* Vaccine Selection */}
              <div className="space-y-2">
                <Label htmlFor="vaccineId">Vaccine (Optional)</Label>
                <div className="relative">
                  <select
                    id="vaccineId"
                    name="vaccineId"
                    value={formData.vaccineId}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a vaccine (optional)</option>
                    {vaccines.map(vaccine => (
                      <option key={vaccine.id} value={vaccine.id}>
                        {vaccine.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>
              
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="pl-10"
                    required
                  />
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              {/* Time Slot */}
              <div className="space-y-2">
                <Label htmlFor="startTime">Time Slot</Label>
                <div className="relative">
                  <select
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    disabled={!formData.providerId}
                  >
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {formData.providerId ? 'No available slots' : 'Select a provider first'}
                      </option>
                    )}
                  </select>
                  <Clock className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit</Label>
              <Input
                id="reason"
                name="reason"
                placeholder="e.g., Annual checkup, Vaccination, Follow-up"
                value={formData.reason}
                onChange={handleChange}
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes or instructions"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
