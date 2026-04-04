import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

// GET — generate personal financial narrative letter for a month
export async function GET(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const { searchParams } = new URL(req.url)
  const month =
    searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  // Validate YYYY-MM format
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: 'Invalid month format. Use YYYY-MM.' },
      { status: 400 }
    )
  }

  const result = await aiOrchestrator.generateMoneyLetter(user.id, month)
  return NextResponse.json(result)
}
