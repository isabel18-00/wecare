import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { UserLayout } from '@/components/user/UserLayout';

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (!user || error) {
    return redirect('/auth/login');
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // If user is admin, redirect to admin dashboard
  if (profile?.role === 'admin') {
    return redirect('/dashboard/admin');
  }

  return <UserLayout>{children}</UserLayout>;
}
