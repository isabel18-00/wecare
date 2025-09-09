// src/app/dashboard/layout.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserLayout } from '@/components/user/UserLayout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { user }, error } = await supabase.auth.getUser();

        if (!user || error) {
          return router.push('/auth/login');
        }

        // Get user's role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const userIsAdmin = profile?.role === 'admin';

        // Redirect based on role
        if (pathname === '/dashboard' || pathname === '/dashboard/') {
          return router.push(userIsAdmin ? '/dashboard/admin' : '/dashboard/user');
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router, supabase]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // If we're still at the root dashboard path after auth check, show nothing
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return null;
  }

  // If the path is under /dashboard/user, use the UserLayout
  if (pathname.startsWith('/dashboard/user')) {
    return <UserLayout>{children}</UserLayout>;
  }

  // For admin routes, just render the children directly
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}