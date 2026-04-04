import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

// GET — project what the user's life looks like at age 35
export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const projection = await aiOrchestrator.projectFutureYou(user.id)
  return NextResponse.json(projection)
}
