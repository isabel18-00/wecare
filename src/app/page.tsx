import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // If user is not logged in, redirect to login page
  if (!session) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  // If user is admin, redirect to admin dashboard
  if (profile?.role === 'admin') {
    redirect('/dashboard/admin');
  }

  // For regular users, redirect to regular dashboard
  redirect('/dashboard');
}
