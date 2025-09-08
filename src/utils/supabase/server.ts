import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
        async set(name: string, value: string, options: any) {
          try {
            const cookie = await cookieStore
            cookie.set({ name, value, ...options })
          } catch (error) {
            // The [set](cci:1://file:///c:/Users/jlcha/Documents/wecare-web/src/middleware.ts:18:8-34:9) method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookie = await cookieStore
            cookie.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}

// For backward compatibility
export const createClient = createServerClient