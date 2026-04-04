import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'

interface ValidateResult {
  user: User | null
  error: string | null
  response?: NextResponse
}

/**
 * Validates the JWT from either:
 *  1. Authorization: Bearer <token> header
 *  2. Supabase session cookie
 *
 * Returns { user, error } — if no valid JWT, also returns a 401 NextResponse.
 */
export async function validateJWT(req: NextRequest): Promise<ValidateResult> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll() {
          // Read-only in API route context — no-op
        },
      },
    }
  )

  // Prefer Bearer token from Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data.user) {
      return {
        user: null,
        error: 'Invalid or expired token',
        response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      }
    }
    return { user: data.user, error: null }
  }

  // Fall back to session cookie
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    return {
      user: null,
      error: 'No valid session',
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { user: data.user, error: null }
}
