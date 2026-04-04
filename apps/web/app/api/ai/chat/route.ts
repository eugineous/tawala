import { NextRequest, NextResponse } from 'next/server'
import { validateJWT } from '@/lib/auth'
import { aiOrchestrator } from '@/lib/ai/orchestrator'

// POST — streaming chat with AI advisor
export async function POST(req: NextRequest) {
  const { user, response } = await validateJWT(req)
  if (!user) return response!

  const body = await req.json().catch(() => ({}))
  const message: string = body?.message ?? ''
  const history: { role: string; content: string }[] = body?.history ?? []

  if (!message.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const stream = await aiOrchestrator.chatWithAdvisorStream(
      user.id,
      message,
      history
    )

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[chat] Error:', err)
    return NextResponse.json(
      { error: 'AI advisor unavailable. Please try again.' },
      { status: 503 }
    )
  }
}
