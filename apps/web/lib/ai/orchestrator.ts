import { GoogleGenerativeAI } from '@google/generative-ai'
import { createServerClient } from '@supabase/ssr'
import type {
  DailyBriefing,
  MacroBreakdown,
  Transaction,
  BibleVerse,
} from '@tawala/core'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserContext {
  userId: string
  fullName?: string
  monthlyIncomeKes?: number
  language?: 'en' | 'sw'
  legacyStatement?: string
}

export interface MoneyLetter {
  month: string
  letter: string
  generated_at: string
}

export interface FutureYouProjection {
  age: number
  message: string
  milestones: string[]
  advice: string
}

export interface AdvisorResponse {
  message: string
  role: 'assistant'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATIC_FALLBACK_BRIEFING: DailyBriefing = {
  greeting: 'Habari asubuhi!',
  priorities: ['Review your budget', 'Log your meals', 'Complete your habits'],
  alerts: [],
  verse: {
    id: 'fallback',
    reference: 'Proverbs 3:5-6',
    text_en: 'Trust in the Lord with all your heart...',
    text_sw: 'Mtumainie Bwana kwa moyo wako wote...',
    theme: 'trust',
    date: new Date().toISOString().slice(0, 10),
  },
  generated_at: new Date().toISOString(),
}

/** Sleep for `ms` milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Create a minimal Supabase admin client (service role) for server-side use */
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

// ---------------------------------------------------------------------------
// AIOrchestrationService
// ---------------------------------------------------------------------------

export class AIOrchestrationService {
  private gemini: GoogleGenerativeAI

  constructor() {
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  }

  // -------------------------------------------------------------------------
  // Retry with exponential backoff (3 attempts, 1s / 2s / 4s delays)
  // -------------------------------------------------------------------------

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const delays = [1000, 2000, 4000]
    let lastError: unknown

    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        return await fn()
      } catch (err: unknown) {
        lastError = err
        const status = (err as { status?: number })?.status
        const is5xx = status !== undefined && status >= 500 && status < 600

        if (!is5xx || attempt === delays.length) {
          throw err
        }

        await sleep(delays[attempt])
      }
    }

    throw lastError
  }

  // -------------------------------------------------------------------------
  // Error logging to Supabase error_logs table
  // -------------------------------------------------------------------------

  private async logError(context: string, error: unknown, userId?: string) {
    try {
      const supabase = createAdminClient()
      await supabase.from('error_logs').insert({
        context,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
        user_id: userId ?? null,
        created_at: new Date().toISOString(),
      })
    } catch {
      // Never throw from error logger
      console.error('[AIOrchestrator] Failed to log error:', error)
    }
  }

  // -------------------------------------------------------------------------
  // User context injection
  // -------------------------------------------------------------------------

  private async fetchUserContext(userId: string): Promise<UserContext> {
    try {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from('profiles')
        .select('full_name, monthly_income_kes, language, legacy_statement')
        .eq('id', userId)
        .single()

      return {
        userId,
        fullName: data?.full_name ?? undefined,
        monthlyIncomeKes: data?.monthly_income_kes ?? undefined,
        language: data?.language ?? 'en',
        legacyStatement: data?.legacy_statement ?? undefined,
      }
    } catch {
      return { userId }
    }
  }

  private buildSystemPrompt(ctx: UserContext): string {
    const parts = [
      `You are TAWALA, a personal Life OS AI advisor for ${ctx.fullName ?? 'the user'}.`,
      `Monthly income: KES ${ctx.monthlyIncomeKes ?? 45000}.`,
      `Language preference: ${ctx.language === 'sw' ? 'Swahili (respond in Swahili)' : 'English'}.`,
    ]
    if (ctx.legacyStatement) {
      parts.push(`User's legacy statement: "${ctx.legacyStatement}".`)
    }
    parts.push('Be concise, practical, and faith-grounded in your advice.')
    return parts.join(' ')
  }

  // -------------------------------------------------------------------------
  // NVIDIA NIM vision call (food photo / M-Pesa OCR)
  // -------------------------------------------------------------------------

  async callNvidiaVision(
    imageBase64DataUrl: string,
    prompt: string
  ): Promise<string> {
    return this.withRetry(async () => {
      const res = await fetch(
        'https://ai.api.nvidia.com/v1/gr/meta-llama/llama-3.2-11b-vision-instruct/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'meta/llama-3.2-11b-vision-instruct',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', image_url: { url: imageBase64DataUrl } },
                ],
              },
            ],
            max_tokens: 1024,
          }),
        }
      )

      if (!res.ok) {
        const err = new Error(`NVIDIA NIM error: ${res.status}`) as Error & { status: number }
        err.status = res.status
        throw err
      }

      const data = await res.json()
      return data.choices?.[0]?.message?.content ?? ''
    })
  }

  // -------------------------------------------------------------------------
  // Gemini text generation
  // -------------------------------------------------------------------------

  async callGemini(prompt: string, systemInstruction?: string): Promise<string> {
    return this.withRetry(async () => {
      const model = this.gemini.getGenerativeModel({
        model: 'gemini-2.5-pro-preview-06-05',
        ...(systemInstruction ? { systemInstruction } : {}),
      })
      const result = await model.generateContent(prompt)
      return result.response.text()
    })
  }

  // -------------------------------------------------------------------------
  // 12.2 — generateDailyBriefing
  // -------------------------------------------------------------------------

  async generateDailyBriefing(userId: string): Promise<DailyBriefing> {
    const today = new Date().toISOString().slice(0, 10)
    const cacheKey = `briefing:${userId}:${today}`
    const supabase = createAdminClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('ai_cache')
      .select('value, created_at')
      .eq('key', cacheKey)
      .single()

    if (cached) {
      const ageMs = Date.now() - new Date(cached.created_at).getTime()
      if (ageMs < 6 * 60 * 60 * 1000) {
        return cached.value as DailyBriefing
      }
    }

    // Fetch yesterday's snapshot
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const [moodRes, macrosRes, goalsRes, budgetRes] = await Promise.allSettled([
      supabase
        .from('mood_entries')
        .select('mood, stress, note')
        .eq('user_id', userId)
        .eq('date', yesterday),
      supabase
        .from('daily_macros')
        .select('actual, ketosis_status')
        .eq('user_id', userId)
        .eq('date', yesterday)
        .single(),
      supabase
        .from('goals')
        .select('title, progress_percent, status')
        .eq('user_id', userId)
        .eq('status', 'active'),
      supabase
        .from('budget_allocations')
        .select('allocations, actual_spent')
        .eq('user_id', userId)
        .eq('month', yesterday.slice(0, 7))
        .single(),
    ])

    const moodData = moodRes.status === 'fulfilled' ? moodRes.value.data ?? [] : []
    const macrosData = macrosRes.status === 'fulfilled' ? macrosRes.value.data : null
    const goalsData = goalsRes.status === 'fulfilled' ? goalsRes.value.data ?? [] : []
    const budgetData = budgetRes.status === 'fulfilled' ? budgetRes.value.data : null

    const ctx = await this.fetchUserContext(userId)
    const systemPrompt = this.buildSystemPrompt(ctx)

    const snapshotText = JSON.stringify({
      yesterday,
      mood: moodData,
      macros: macrosData,
      goals: goalsData,
      budget: budgetData,
    })

    const prompt = `Based on this user's data from yesterday, generate a morning briefing.
Return ONLY valid JSON matching this exact shape:
{
  "greeting": "string (non-empty, warm morning greeting in Swahili or English)",
  "priorities": ["string", "string", "string"] (3-5 actionable items ordered by urgency),
  "alerts": ["string"] (budget overruns, missed habits, health flags — can be empty array),
  "verse": {
    "id": "daily",
    "reference": "string",
    "text_en": "string",
    "text_sw": "string",
    "theme": "string",
    "date": "${today}"
  }
}

User snapshot: ${snapshotText}`

    try {
      const text = await this.callGemini(prompt, systemPrompt)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in Gemini response')

      const parsed = JSON.parse(jsonMatch[0])

      // Validate required fields
      if (
        !parsed.greeting ||
        !Array.isArray(parsed.priorities) ||
        parsed.priorities.length < 3 ||
        !parsed.verse
      ) {
        throw new Error('Invalid briefing shape from Gemini')
      }

      const briefing: DailyBriefing = {
        greeting: parsed.greeting,
        priorities: parsed.priorities.slice(0, 5),
        alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
        verse: parsed.verse as BibleVerse,
        generated_at: new Date().toISOString(),
      }

      // Cache with upsert
      await supabase.from('ai_cache').upsert(
        { key: cacheKey, value: briefing, created_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

      return briefing
    } catch (err) {
      await this.logError('generateDailyBriefing', err, userId)
      return { ...STATIC_FALLBACK_BRIEFING, generated_at: new Date().toISOString() }
    }
  }

  // -------------------------------------------------------------------------
  // 12.5 — generateMoneyLetter
  // -------------------------------------------------------------------------

  async generateMoneyLetter(userId: string, month: string): Promise<MoneyLetter> {
    const supabase = createAdminClient()
    const ctx = await this.fetchUserContext(userId)
    const systemPrompt = this.buildSystemPrompt(ctx)

    const [txRes, budgetRes, streakRes] = await Promise.allSettled([
      supabase
        .from('transactions')
        .select('amount_kes, type, category, description, date')
        .eq('user_id', userId)
        .gte('date', `${month}-01`)
        .lte('date', `${month}-31`),
      supabase
        .from('budget_allocations')
        .select('allocations, actual_spent, total_income_kes')
        .eq('user_id', userId)
        .eq('month', month)
        .single(),
      supabase
        .from('savings_streaks')
        .select('current_streak_days, total_saved_kes')
        .eq('user_id', userId)
        .single(),
    ])

    const transactions = txRes.status === 'fulfilled' ? txRes.value.data ?? [] : []
    const budget = budgetRes.status === 'fulfilled' ? budgetRes.value.data : null
    const streak = streakRes.status === 'fulfilled' ? streakRes.value.data : null

    const prompt = `Write a warm, personal financial narrative letter for ${ctx.fullName ?? 'the user'} summarizing their month of ${month}.
Include: spending patterns, savings progress, budget adherence, encouragement, and one practical tip.
Write in first person as if the money is speaking to the user.
Keep it under 400 words.

Data:
- Transactions: ${JSON.stringify(transactions.slice(0, 50))}
- Budget: ${JSON.stringify(budget)}
- Savings streak: ${JSON.stringify(streak)}

Return ONLY the letter text (no JSON wrapper).`

    try {
      const letter = await this.callGemini(prompt, systemPrompt)
      return { month, letter: letter.trim(), generated_at: new Date().toISOString() }
    } catch (err) {
      await this.logError('generateMoneyLetter', err, userId)
      return {
        month,
        letter: `Dear ${ctx.fullName ?? 'Friend'}, your financial journey in ${month} continues. Keep saving and staying disciplined.`,
        generated_at: new Date().toISOString(),
      }
    }
  }

  // -------------------------------------------------------------------------
  // 12.6 — projectFutureYou
  // -------------------------------------------------------------------------

  async projectFutureYou(userId: string): Promise<FutureYouProjection> {
    const supabase = createAdminClient()
    const ctx = await this.fetchUserContext(userId)
    const systemPrompt = this.buildSystemPrompt(ctx)

    const [profileRes, goalsRes, streakRes, lifeScoreRes, habitsRes] = await Promise.allSettled([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('goals')
        .select('title, status, progress_percent')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('savings_streaks')
        .select('current_streak_days, total_saved_kes, longest_streak_days')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('life_scores')
        .select('overall_score, trend, week')
        .eq('user_id', userId)
        .order('week', { ascending: false })
        .limit(4),
      supabase
        .from('habits')
        .select('name, current_streak, longest_streak')
        .eq('user_id', userId),
    ])

    const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null
    const goals = goalsRes.status === 'fulfilled' ? goalsRes.value.data ?? [] : []
    const streak = streakRes.status === 'fulfilled' ? streakRes.value.data : null
    const lifeScores = lifeScoreRes.status === 'fulfilled' ? lifeScoreRes.value.data ?? [] : []
    const habits = habitsRes.status === 'fulfilled' ? habitsRes.value.data ?? [] : []

    const prompt = `Based on this user's current life trajectory, project what their life looks like at age 35.
Be specific, faith-grounded, and motivating. Base projections on actual data trends.

User data:
- Profile: ${JSON.stringify(profile)}
- Recent goals: ${JSON.stringify(goals)}
- Savings: ${JSON.stringify(streak)}
- Life scores (last 4 weeks): ${JSON.stringify(lifeScores)}
- Habits: ${JSON.stringify(habits)}

Return ONLY valid JSON:
{
  "age": 35,
  "message": "string (2-3 sentence vision of their life at 35)",
  "milestones": ["string", "string", "string"] (3-5 specific milestones they'll hit),
  "advice": "string (one key action to take now)"
}`

    try {
      const text = await this.callGemini(prompt, systemPrompt)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON in response')
      const parsed = JSON.parse(jsonMatch[0])
      return {
        age: 35,
        message: parsed.message ?? '',
        milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
        advice: parsed.advice ?? '',
      }
    } catch (err) {
      await this.logError('projectFutureYou', err, userId)
      return {
        age: 35,
        message: 'At 35, you will have built a strong financial foundation and a life of purpose.',
        milestones: ['Financial freedom', 'Strong family bonds', 'Spiritual maturity'],
        advice: 'Stay consistent with your daily habits.',
      }
    }
  }

  // -------------------------------------------------------------------------
  // 12.7 — chatWithAdvisor (streaming)
  // -------------------------------------------------------------------------

  async chatWithAdvisorStream(
    userId: string,
    message: string,
    history: { role: string; content: string }[] = []
  ): Promise<ReadableStream<Uint8Array>> {
    const ctx = await this.fetchUserContext(userId)
    const systemPrompt = this.buildSystemPrompt(ctx)

    // Fetch recent context
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    const [goalsRes, moodRes, lifeScoreRes] = await Promise.allSettled([
      supabase
        .from('goals')
        .select('title, progress_percent')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(3),
      supabase
        .from('mood_entries')
        .select('mood, stress')
        .eq('user_id', userId)
        .eq('date', today)
        .limit(1),
      supabase
        .from('life_scores')
        .select('overall_score, trend')
        .eq('user_id', userId)
        .order('week', { ascending: false })
        .limit(1),
    ])

    const goals = goalsRes.status === 'fulfilled' ? goalsRes.value.data ?? [] : []
    const mood = moodRes.status === 'fulfilled' ? moodRes.value.data ?? [] : []
    const lifeScore = lifeScoreRes.status === 'fulfilled' ? lifeScoreRes.value.data ?? [] : []

    const contextBlock = `User context: goals=${JSON.stringify(goals)}, today's mood=${JSON.stringify(mood)}, life score=${JSON.stringify(lifeScore)}`

    const fullPrompt = `${systemPrompt}\n\n${contextBlock}\n\nUser: ${message}`

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.5-pro-preview-06-05',
    })

    const chatHistory = history.map((h) => ({
      role: h.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: h.content }],
    }))

    const chat = model.startChat({
      history: chatHistory,
      systemInstruction: systemPrompt,
    })

    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const result = await chat.sendMessageStream(fullPrompt)
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return stream
  }

  // -------------------------------------------------------------------------
  // Vision helpers (used by existing routes)
  // -------------------------------------------------------------------------

  async logFoodPhoto(
    imageBase64DataUrl: string,
    userId: string
  ): Promise<MacroBreakdown> {
    const foodItemsText = await this.callNvidiaVision(
      imageBase64DataUrl,
      'Identify all food items in this image. For each item, estimate the portion size in grams. Return JSON array: [{ name, quantity_g }]'
    )

    const jsonMatch = foodItemsText.match(/\[[\s\S]*\]/)
    const foodItems = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    if (!foodItems.length) {
      return {
        fat_g: 0, protein_g: 0, carbs_g: 0, calories: 0,
        net_carbs_g: 0, ketosis_impact: 'neutral',
      }
    }

    const ctx = await this.fetchUserContext(userId)
    const macroText = await this.callGemini(
      `Calculate macros for: ${JSON.stringify(foodItems)}. Return JSON: { fat_g, protein_g, carbs_g, calories, net_carbs_g }`,
      this.buildSystemPrompt(ctx)
    )

    const macroMatch = macroText.match(/\{[\s\S]*\}/)
    if (!macroMatch) {
      return { fat_g: 0, protein_g: 0, carbs_g: 0, calories: 0, net_carbs_g: 0, ketosis_impact: 'neutral' }
    }

    const m = JSON.parse(macroMatch[0])
    const net_carbs_g = Math.min(Number(m.net_carbs_g) || 0, Number(m.carbs_g) || 0)
    return {
      fat_g: Number(m.fat_g) || 0,
      protein_g: Number(m.protein_g) || 0,
      carbs_g: Number(m.carbs_g) || 0,
      calories: Number(m.calories) || 0,
      net_carbs_g,
      ketosis_impact: net_carbs_g < 10 ? 'positive' : net_carbs_g > 25 ? 'negative' : 'neutral',
    }
  }

  async scanMpesaScreenshot(
    imageBase64DataUrl: string,
    userId: string
  ): Promise<Transaction[]> {
    const rawText = await this.callNvidiaVision(
      imageBase64DataUrl,
      'Extract all M-Pesa transaction details from this screenshot. Return JSON array with fields: amount, recipient, date, mpesa_ref, type (sent/received/payment).'
    )

    const jsonMatch = rawText.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const rawTxs = JSON.parse(jsonMatch[0])
    const ctx = await this.fetchUserContext(userId)
    const catText = await this.callGemini(
      `Categorize these M-Pesa transactions into: food, transport, rent, utilities, entertainment, health, savings, investment, family_support, tithe, other. Return JSON array: [{ mpesa_ref, category }]\n\n${JSON.stringify(rawTxs)}`,
      this.buildSystemPrompt(ctx)
    )

    const catMatch = catText.match(/\[[\s\S]*\]/)
    const categories: { mpesa_ref: string; category: string }[] = catMatch
      ? JSON.parse(catMatch[0])
      : []

    const catMap: Record<string, string> = {}
    for (const c of categories) catMap[c.mpesa_ref] = c.category

    const today = new Date().toISOString().slice(0, 10)
    return rawTxs.map((rt: { amount: number; recipient: string; date: string; mpesa_ref: string; type: string }) => ({
      id: '',
      user_id: userId,
      amount_kes: rt.amount,
      type: rt.type === 'received' ? 'income' : 'expense',
      category: (catMap[rt.mpesa_ref] ?? 'other') as Transaction['category'],
      description: `M-Pesa: ${rt.recipient}`,
      source: 'mpesa_scan' as const,
      mpesa_ref: rt.mpesa_ref || null,
      date: rt.date || today,
      created_at: new Date().toISOString(),
    }))
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const aiOrchestrator = new AIOrchestrationService()
