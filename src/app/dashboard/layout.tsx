// src/app/dashboard/layout.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
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

      // Only redirect if we're at the base dashboard path
      if (pathname === '/dashboard') {
        if (profile?.role === 'admin') {
          router.push('/dashboard/admin');
        } else {
          router.push('/dashboard/user');
        }
      }
    };

    checkAuth();
  }, [pathname, router, supabase]);

  return <>{children}</>;
}