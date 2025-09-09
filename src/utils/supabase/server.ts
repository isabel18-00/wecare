import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

<<<<<<< HEAD
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

=======
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
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
<<<<<<< HEAD
        async set(name: string, value: string, options: Omit<CookieOptions, 'name' | 'value'>) {
=======
        async set(name: string, value: string, options: any) {
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
          try {
            const cookie = await cookieStore
            cookie.set({ name, value, ...options })
          } catch (error) {
<<<<<<< HEAD
            // The set method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to set cookie:', error);
            }
          }
        },
        async remove(name: string, options: Omit<CookieOptions, 'name' | 'value'>) {
=======
            // The [set](cci:1://file:///c:/Users/jlcha/Documents/wecare-web/src/middleware.ts:18:8-34:9) method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        async remove(name: string, options: any) {
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
          try {
            const cookie = await cookieStore
            cookie.set({ name, value: '', ...options })
          } catch (error) {
<<<<<<< HEAD
            // The remove method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to remove cookie:', error);
            }
=======
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
>>>>>>> 2d258ccb6ca4b16e2a54f8e9ca5eb717fb5e1454
          }
        },
      },
    }
  )
}

// For backward compatibility
export const createClient = createServerClient