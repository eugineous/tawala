// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any
import type { XPAction } from '@tawala/core'

// XP values for each action
export const XP_VALUES: Record<string, number> = {
  log_mood: 5,
  complete_habit: 10,
  log_food: 8,
  review_verse: 15,
  log_sleep: 5,
  log_win: 10,
  savings_deposit: 20,
}

// Level thresholds: [minXP, level number, Swahili name]
const LEVEL_THRESHOLDS: [number, number, string][] = [
  [0, 1, 'Mwanzo'],       // Beginner
  [100, 2, 'Mwanafunzi'], // Student
  [300, 3, 'Mwalimu'],    // Teacher
  [600, 4, 'Kiongozi'],   // Leader
  [1000, 5, 'Shujaa'],    // Hero
  [2000, 6, 'Mfalme'],    // King
]

function getLevelForXP(xp: number): { level: number; level_name: string; xp_to_next_level: number } {
  let current = LEVEL_THRESHOLDS[0]
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold[0]) {
      current = threshold
    } else {
      break
    }
  }

  const currentIndex = LEVEL_THRESHOLDS.indexOf(current)
  const nextThreshold = LEVEL_THRESHOLDS[currentIndex + 1]
  const xp_to_next_level = nextThreshold ? nextThreshold[0] - xp : 0

  return {
    level: current[1],
    level_name: current[2],
    xp_to_next_level,
  }
}

export interface XPResult {
  xp_total: number
  level: number
  level_name: string
  xp_to_next_level: number
  leveled_up: boolean
  new_badges: string[]
}

export async function awardXP(
  userId: string,
  action: XPAction,
  supabase: SupabaseClient
): Promise<XPResult> {
  // Fetch or create user_levels row
  const { data: existing } = await supabase
    .from('user_levels')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const prevXP: number = existing?.xp_total ?? 0
  const prevLevel: number = existing?.level ?? 1
  const newXP = prevXP + action.xp_value

  const { level, level_name, xp_to_next_level } = getLevelForXP(newXP)
  const leveled_up = level > prevLevel

  // Upsert user_levels
  await supabase
    .from('user_levels')
    .upsert(
      {
        user_id: userId,
        xp_total: newXP,
        level,
        level_name,
        xp_to_next_level,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  // Check badges after XP award
  const new_badges = await checkBadges(userId, supabase)

  return { xp_total: newXP, level, level_name, xp_to_next_level, leveled_up, new_badges }
}

export async function checkBadges(
  userId: string,
  supabase: SupabaseClient
): Promise<string[]> {
  // Fetch already-earned badges
  const { data: earnedRows } = await supabase
    .from('user_badges')
    .select('badge_name')
    .eq('user_id', userId)

  const alreadyEarned = new Set<string>((earnedRows ?? []).map((r: { badge_name: string }) => r.badge_name))
  const newlyEarned: string[] = []

  // Helper to award a badge if not already earned
  async function awardIfNew(badgeName: string) {
    if (alreadyEarned.has(badgeName)) return
    const { error } = await supabase.from('user_badges').insert({
      user_id: userId,
      badge_name: badgeName,
      earned_at: new Date().toISOString(),
    })
    if (!error) {
      newlyEarned.push(badgeName)
      alreadyEarned.add(badgeName)
    }
  }

  // Badge 1: "First Step" — any XP earned (user_levels row exists)
  const { data: levelRow } = await supabase
    .from('user_levels')
    .select('xp_total')
    .eq('user_id', userId)
    .maybeSingle()

  if (levelRow && levelRow.xp_total > 0) {
    await awardIfNew('First Step')
  }

  // Badge 2: "Habit Hero" — any habit streak >= 7
  const { data: habits } = await supabase
    .from('habits')
    .select('current_streak')
    .eq('user_id', userId)
    .gte('current_streak', 7)
    .limit(1)

  if (habits && habits.length > 0) {
    await awardIfNew('Habit Hero')
  }

  // Badge 3: "Scripture Scholar" — any memory verse with repetitions >= 5
  const { data: verses } = await supabase
    .from('memory_verses')
    .select('repetitions')
    .eq('user_id', userId)
    .gte('repetitions', 5)
    .limit(1)

  if (verses && verses.length > 0) {
    await awardIfNew('Scripture Scholar')
  }

  // Badge 4: "Savings Champion" — savings streak >= 14 days
  const { data: savingsStreak } = await supabase
    .from('savings_streaks')
    .select('current_streak_days')
    .eq('user_id', userId)
    .maybeSingle()

  if (savingsStreak && savingsStreak.current_streak_days >= 14) {
    await awardIfNew('Savings Champion')
  }

  // Badge 5: "Life Master" — life score >= 80
  const { data: lifeScores } = await supabase
    .from('life_scores')
    .select('overall_score')
    .eq('user_id', userId)
    .gte('overall_score', 80)
    .limit(1)

  if (lifeScores && lifeScores.length > 0) {
    await awardIfNew('Life Master')
  }

  return newlyEarned
}
