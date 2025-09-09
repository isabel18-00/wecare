import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { sendAdminNotification } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    
    // Basic validation
    if (!requestData.patient_id || !requestData.appointment_date || !requestData.start_time || !requestData.end_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert([
        {
          ...requestData,
          status: 'scheduled',
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      );
    }

    // Get patient details for notification
    const { data: patient } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', requestData.patient_id)
      .single();

    // Format date and time for display
    const appointmentDate = new Date(requestData.appointment_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const startTime = new Date(`1970-01-01T${requestData.start_time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Send notification to admins
    await sendAdminNotification(
      'appointment',
      'New Appointment Booked',
      `Patient ${patient?.first_name} ${patient?.last_name} has booked an appointment for ${appointmentDate} at ${startTime}.`,
      {
        appointment_id: appointment.id,
        patient_id: requestData.patient_id,
        appointment_date: requestData.appointment_date,
        start_time: requestData.start_time,
        end_time: requestData.end_time
      }
    );

    return NextResponse.json({
      success: true,
      data: appointment
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('appointments')
      .select(`
        *,
        patient:patient_id (id, first_name, last_name, email, phone_number),
        vaccine:vaccine_id (id, name, description)
      `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    // If user is a patient, only show their appointments
    if (userProfile?.role === 'patient') {
      query = query.eq('patient_id', user.id);
    }
    // If user is a provider, show their appointments
    else if (userProfile?.role === 'provider') {
      query = query.eq('provider_id', user.id);
    }
    // Admins can see all appointments

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: appointments || []
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
