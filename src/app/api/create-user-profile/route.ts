import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
  throw new Error('Server configuration error: Missing Supabase URL or Service Role Key');
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      email,
      firstName,
      lastName,
      middleName,
      mobileNumber,
      completeAddress,
      birthday
    } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and email are required' },
        { status: 400 }
      );
    }

    try {
      // First, ensure the user exists in auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
      
      if (authError || !authUser) {
        console.error('Error fetching auth user:', authError);
        throw new Error('User not found in authentication system');
      }

      // Prepare the data for the upsert
      const profileData = {
        p_id: userId,
        p_email: email,
        p_first_name: firstName || 'New',
        p_last_name: lastName || 'User',
        p_middle_name: middleName || null,
        p_phone_number: mobileNumber || null,
        p_address: completeAddress || null,
        p_date_of_birth: birthday ? new Date(birthday).toISOString().split('T')[0] : null,
        p_role: 'patient' as const
      };

      console.log('Attempting to upsert user profile with data:', profileData);

      // Use the database function to handle the upsert
      const { data, error: upsertError } = await supabase.rpc('upsert_user_profile', profileData);

      if (upsertError) {
        console.error('Profile upsert error:', upsertError);
        throw new Error(upsertError.message || 'Failed to create/update user profile');
      }

      console.log('Successfully created/updated user profile:', data);
      return NextResponse.json({ success: true, profile: data });
    } catch (error) {
      console.error('Error in profile creation:', error);
      throw error; // Re-throw to be caught by the outer catch
    }
  } catch (error) {
    console.error('Error in create-user-profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
