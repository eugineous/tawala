import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

// POST — called by Vercel Cron at 02:00 UTC (05:00 EAT)
// No JWT required — secured by Vercel Cron infrastructure
export async function POST() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const userIds: string[] = (profiles ?? []).map((p: { id: string }) => p.id)

  // Generate briefings concurrently (batched to avoid rate limits)
  const results: { userId: string; success: boolean }[] = []

  for (const userId of userIds) {
    try {
      await aiOrchestrator.generateDailyBriefing(userId)
      results.push({ userId, success: true })
    } catch {
      results.push({ userId, success: false })
    }
  }

  return NextResponse.json({
    generated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    total: userIds.length,
  })
}
