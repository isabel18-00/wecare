'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Syringe, User } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  role: 'admin' | 'patient';
  created_at: string;
  updated_at: string;
  patient: {
    medical_record_number?: string;
    blood_type?: string;
    allergies?: string[];
    existing_conditions?: string[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  } | null;
}

interface VaccineRecord {
  id: string;
  patient_id: string;
  vaccine_id: string;
  dose_number: number;
  date_administered: string;
  next_dose_date: string | null;
  status: 'completed' | 'scheduled' | 'missed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<Record<string, VaccineRecord[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Fetch patients and their vaccine records
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch patients with their patient details
        const { data: patientsData, error: patientsError } = await supabase
          .from('user_profiles')
          .select(`
            *,
            patient:patients(
              medical_record_number,
              blood_type,
              allergies,
              existing_conditions,
              emergency_contact_name,
              emergency_contact_phone
            )
          `)
          .order('created_at', { ascending: false });

        if (patientsError) throw patientsError;

        // Fetch vaccine records for all patients
        const { data: vaccineData = [], error: vaccineError } = await supabase
          .from('vaccination_records')
          .select('*')
          .eq('vaccine_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'); // Assuming this is the anti-rabies vaccine ID

        if (vaccineError) {
          console.error('Error fetching vaccine records:', vaccineError);
          toast.error('Failed to load vaccine records');
          return;
        }

        // Group vaccine records by patient ID
        const recordsByPatient: Record<string, VaccineRecord[]> = {};
        (vaccineData || []).forEach(record => {
          if (!recordsByPatient[record.patient_id]) {
            recordsByPatient[record.patient_id] = [];
          }
          recordsByPatient[record.patient_id].push(record);
        });

        setPatients(patientsData || []);
        setVaccineRecords(recordsByPatient);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load patient data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  // Filter patients based on search query
  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    
    const query = searchQuery.toLowerCase();
    return patients.filter(patient => 
      patient.first_name.toLowerCase().includes(query) ||
      patient.last_name.toLowerCase().includes(query) ||
      patient.email.toLowerCase().includes(query) ||
      patient.phone_number.includes(query)
    );
  }, [patients, searchQuery]);

  // Get the latest vaccine record for a patient
  const getLatestVaccineRecord = (patientId: string) => {
    const records = vaccineRecords[patientId];
    if (!records || records.length === 0) return null;
    
    // Sort by date_administered in descending order and return the first one
    return [...records].sort((a, b) => 
      new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime()
    )[0];
  };

  // Get the next due date for a patient's vaccine
  const getNextDueDate = (patientId: string) => {
    const latestRecord = getLatestVaccineRecord(patientId);
    if (!latestRecord) return 'Not Started';
    
    if (latestRecord.next_dose_date) {
      const nextDate = new Date(latestRecord.next_dose_date);
      return format(nextDate, 'MMM d, yyyy');
    }
    
    return 'Completed';
  };

  // Get the status of the vaccination series
  const getVaccinationStatus = (patientId: string) => {
    const records = vaccineRecords[patientId] || [];
    const completedDoses = records.filter(r => r.status === 'completed').length;
    
    if (completedDoses === 0) return { text: 'Not Started', color: 'bg-gray-100 text-gray-800' };
    if (completedDoses >= 3) return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    
    return { 
      text: `Dose ${completedDoses} of 3`, 
      color: 'bg-blue-100 text-blue-800' 
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patient Management</h1>
          <p className="text-muted-foreground">
            View and manage patient records and vaccination status
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search patients..."
                  className="w-full pl-8 md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Last Vaccine</TableHead>
                    <TableHead>Next Dose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const status = getVaccinationStatus(patient.id);
                      const latestRecord = getLatestVaccineRecord(patient.id);
                      
                      return (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-5 w-5" />
                              </div>
                              <div>
                                <div>{`${patient.first_name} ${patient.last_name}`}</div>
                                <div className="text-sm text-muted-foreground">
                                  {patient.gender || 'N/A'} • {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MM/dd/yyyy') : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{patient.email}</div>
                              <div className="text-sm text-muted-foreground">
                                {patient.phone_number || 'No phone number'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {latestRecord ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <Syringe className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Dose {latestRecord.dose_number}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(latestRecord.date_administered), 'MMM d, yyyy')}
                                </div>
                              </div>
                            ) : (
                              'No records'
                            )}
                          </TableCell>
                          <TableCell>
                            {getNextDueDate(patient.id)}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              {status.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No patients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
