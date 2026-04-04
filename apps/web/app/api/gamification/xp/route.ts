import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { awardXP, XP_VALUES } from '@/lib/gamification'
import type { XPAction, ModuleType } from '@tawala/core'

export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json()
  const { action, module: moduleName, xp_value } = body

  if (!action || typeof action !== 'string') {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }
  if (!moduleName || typeof moduleName !== 'string') {
    return NextResponse.json({ error: 'module is required' }, { status: 400 })
  }

  // Resolve XP value: use provided xp_value, fall back to XP_VALUES map
  const resolvedXP: number = typeof xp_value === 'number' && xp_value > 0
    ? xp_value
    : (XP_VALUES[action] ?? 5)

  const xpAction: XPAction = {
    action,
    module: moduleName as ModuleType,
    xp_value: resolvedXP,
  }

  const supabase = await createServerSupabaseClient()
  const result = await awardXP(user.id, xpAction, supabase)

  return NextResponse.json(result, { status: 200 })
}
