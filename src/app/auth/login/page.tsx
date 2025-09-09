'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import LoginForm from '@/components/auth/LoginForm';

export default function Login() {
  const router = useRouter();
  const supabase = createBrowserClient();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    
    checkSession();
<<<<<<< HEAD
  }, [router, supabase]);
=======
  }, [router]);
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <a 
            href="/auth/register" 
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            create a new account
          </a>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
