import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface CookieOptions {
  name: string;
  value: string;
  domain?: string;
  expires?: Date;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none' | boolean;
  secure?: boolean;
}

export function createServerClient() {
  const cookieStore = cookies()
  
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = await cookieStore
          return cookie.get(name)?.value
        },
        async set(name: string, value: string, options: Omit<CookieOptions, 'name' | 'value'>) {
          try {
            const cookie = await cookieStore
            cookie.set({ name, value, ...options })
          } catch (error) {
            // The set method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to set cookie:', error);
            }
          }
        },
        async remove(name: string, options: Omit<CookieOptions, 'name' | 'value'>) {
          try {
            const cookie = await cookieStore
            cookie.set({ name, value: '', ...options })
          } catch (error) {
            // The remove method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to remove cookie:', error);
            }
          }
        },
      },
    }
  )
}

// For backward compatibility
export const createClient = createServerClient