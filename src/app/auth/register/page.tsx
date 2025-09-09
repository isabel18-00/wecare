'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import Image from 'next/image';
import RegisterForm from '@/components/auth/RegisterForm';
import Link from 'next/link';

export default function Register() {
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
            Create an Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join us to get started
          </p>
        </div>

        {/* Register Form */}
        <div className="mt-6">
          <RegisterForm />
        </div>

        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/auth/login" 
              className="font-medium text-red-600 hover:text-red-500 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
