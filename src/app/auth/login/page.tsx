'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import Image from 'next/image';
import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

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
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
      <div className="relative w-full max-w-md px-6 py-12 mx-4 bg-white rounded-xl shadow-2xl sm:mx-0 sm:px-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative w-48 h-32">
            <Image 
              src="/images/logo.jpg" 
              alt="WeCare Animal Bite Clinic" 
              fill
              style={{ objectFit: 'contain' }}
              priority
              className="rounded-lg"
            />
          </div>
        </div>
        
        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your account
          </p>
        </div>

        {/* Login Form */}
        <div className="mt-6">
          <LoginForm />
        </div>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link 
              href="/auth/register" 
              className="font-medium text-red-600 hover:text-red-500 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
