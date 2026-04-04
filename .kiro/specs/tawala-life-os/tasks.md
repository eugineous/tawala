# Implementation Plan: TAWALA Life OS

## Overview

Full-stack implementation of TAWALA — a Life OS PWA for a young Kenyan professional — built on Next.js 15, Supabase, Gemini 2.5 Pro, NVIDIA NIM, and Expo React Native. Tasks are ordered to build incrementally: infrastructure first, then module by module, then AI brain, gamification, widgets, PWA, tests, and deployment.

## Tasks

- [x] 1. Project setup and monorepo scaffolding
  - Clone https://github.com/eugineous/tawala and set up Turborepo monorepo with `apps/web` (Next.js 15), `apps/mobile` (Expo), and `packages/core` (@tawala/core)
  - Configure `tsconfig.json` with path aliases for `@tawala/core`
  - Install all dependencies: next 15, @supabase/supabase-js, @google/generative-ai, expo, expo-router, @tanstack/react-query, zustand, tailwindcss, shadcn/ui, recharts, workbox, fast-check, jest, @testing-library/react, playwright
  - Create `.env.local` with all required env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, NVIDIA_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, VERCEL_TOKEN, GITHUB_TOKEN)
  - Configure Tailwind CSS with AMOLED dark mode (`darkMode: 'class'`, black background `#000000`)
  - Initialize shadcn/ui with dark theme
  - Set up Jest config with ts-jest for unit and property tests
  - Push initial scaffold to GitHub
  - _Requirements: 11.1, 12.1_

- [x] 2. Supabase schema, RLS, indexes, and storage
  - Create new Supabase project and capture URL, anon key, and service role key into `.env.local`
  - Write migration SQL for all tables: `profiles`, `transactions`, `budget_allocations`, `impulse_pauses`, `food_logs`, `daily_macros`, `water_logs`, `bible_verses`, `memory_verses`, `gratitude_entries`, `spirit_scores`, `goals`, `habits`, `habit_logs`, `mood_entries`, `sleep_entries`, `cbt_entries`, `win_entries`, `life_scores`, `xp_actions`, `user_levels`, `badges`, `user_badges`, `ai_cache`, `error_logs`, `offline_queue`
  - Add composite indexes on `(user_id, date)` for all time-series tables and `(user_id, month)` for budget tables
  - Enable Row Level Security on every table with policy `user_id = auth.uid()`
  - Create Supabase Storage buckets: `food-photos` (private), `mpesa-screenshots` (private), `avatars` (public)
  - Enable Google OAuth provider in Supabase Auth dashboard
  - _Requirements: 12.1, 12.2, 12.6_

- [x] 3. Authentication — Google OAuth via Supabase
  - [x] 3.1 Implement `apps/web/lib/supabase.ts` — browser and server Supabase clients using `@supabase/ssr`
  - [x] 3.2 Create `apps/web/app/auth/callback/route.ts` — OAuth callback handler that exchanges code for session
  - [x] 3.3 Create `apps/web/middleware.ts` — protect all `/app/*` routes; redirect unauthenticated users to `/login`
  - [x] 3.4 Build `/login` page with Google Sign-In button using Supabase `signInWithOAuth({ provider: 'google' })`
  - [x] 3.5 Implement `Auth_Middleware` helper `validateJWT(req)` used by all API route handlers — returns 401 if no valid JWT
  - [x] 3.6 Implement silent token refresh via `supabase.auth.onAuthStateChange` in root layout; queue and replay failed requests after refresh
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [x] 4. @tawala/core — shared types and utilities
  - [x] 4.1 Create `packages/core/src/types.ts` — export all TypeScript interfaces: `UserProfile`, `Transaction`, `BudgetAllocation`, `ImpulsePause`, `SavingsStreak`, `FoodLogEntry`, `MacroBreakdown`, `DailyMacros`, `KetosisStatus`, `MealPlan`, `ShoppingItem`, `BibleVerse`, `MemoryVerse`, `GratitudeEntry`, `SpiritScore`, `Goal`, `Habit`, `HabitLog`, `MoodEntry`, `CBTEntry`, `SleepEntry`, `BurnoutRisk`, `UserLevel`, `Badge`, `XPAction`, `LifeScore`, `DailyBriefing`, `PurchaseDecision`, `ImpulsePause`
  - [x] 4.2 Create `packages/core/src/finance.ts` — implement pure functions: `allocateBudget(income, prefs)`, `evaluatePurchase(req, ctx)`, `deduplicateTransactions(txs)`
  - [x] 4.3 Create `packages/core/src/keto.ts` — implement pure functions: `calculateKetosisStatus(logs)`, `calculateNetCarbs(macros)`, `scoreKeto(data)`
  - [x] 4.4 Create `packages/core/src/spirit.ts` — implement pure functions: `reviewMemoryVerse(verse, quality)` (SM-2 algorithm), `scoreSpiritData(data)`
  - [x] 4.5 Create `packages/core/src/gamification.ts` — implement pure functions: `computeOverallScore(moduleScores)`, `computeLifeScoreTrend(current, previous)`, `assessBurnoutRisk(inputs)`, `computeBurnoutLevel(score)`
  - [x] 4.6 Create `packages/core/src/utils.ts` — date helpers (EAT timezone), signed URL expiry validator, retry with exponential backoff
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 5.2, 5.3, 6.1–6.5, 7.1–7.4, 8.1–8.4, 9.1–9.2_

- [x] 5. Finance OS — budget, transactions, purchase approval, M-Pesa scan, savings streak
  - [x] 5.1 Create `apps/web/app/api/finance/budget/route.ts` — GET returns `BudgetAllocation` for authenticated user; calls `allocateBudget()` from core; persists to `budget_allocations` table
  - [x] 5.2 Create `apps/web/app/api/finance/transactions/route.ts` — POST records a `Transaction`; GET returns paginated transactions for user; flags category as `OVER_BUDGET` when actual > allocated
  - [x] 5.3 Create `apps/web/app/api/finance/approve-purchase/route.ts` — POST runs `evaluatePurchase()` logic: checks ImpulsePause (≥ KES 3,000 → create 24hr pause), budget remaining, savings streak caution; returns `PurchaseDecision`
  - [x] 5.4 Create `apps/web/app/api/finance/scan-mpesa/route.ts` — POST accepts image upload, calls NVIDIA NIM for OCR, calls Gemini to parse/categorize, deduplicates by `mpesa_ref`, persists transactions, returns parsed list; returns `UNREADABLE` error if NIM fails
  - [x] 5.5 Create `apps/web/app/api/finance/savings-streak/route.ts` — GET returns `SavingsStreak` for user
  - [x] 5.6 Build Finance OS UI pages: `/app/finance` dashboard (budget ring chart, category bars), `/app/finance/transactions` (list + M-Pesa scan button), `/app/finance/approve` (purchase approval form)
  - _Requirements: 2.1–2.6, 3.1–3.6, 4.1–4.5_

- [x] 6. Keto OS — meal plans, macro tracking, food photo logging, ketosis status, water tracking
  - [x] 6.1 Create `apps/web/app/api/keto/log-food-photo/route.ts` — POST accepts food photo, calls NVIDIA NIM to identify food items, calls Gemini to calculate `MacroBreakdown`, persists `FoodLogEntry` with photo URL, updates daily macro totals; returns empty items + confidence 0 if no food detected
  - [x] 6.2 Create `apps/web/app/api/keto/food-log/route.ts` — POST for manual food log entry; GET returns daily food logs for a date
  - [x] 6.3 Create `apps/web/app/api/keto/macros/route.ts` — GET returns `DailyMacros` for a date including `KetosisStatus` computed via `calculateKetosisStatus()`
  - [x] 6.4 Create `apps/web/app/api/keto/water/route.ts` — POST logs water intake in ml; GET returns today's water log; water target is always 3,000 ml
  - [x] 6.5 Create `apps/web/app/api/keto/meal-plan/route.ts` — GET returns weekly `MealPlan`; shopping list items must have `estimated_cost_kes > 0`
  - [x] 6.6 Build Keto OS UI pages: `/app/keto` dashboard (macro rings, ketosis badge, water tracker), `/app/keto/log` (photo capture + manual entry), `/app/keto/meal-plan` (weekly plan + shopping list)
  - _Requirements: 5.1–5.7, 6.1–6.5_

- [x] 7. Spirit OS — daily verse, prayer, scripture memory SM-2, gratitude journal
  - [x] 7.1 Create `apps/web/app/api/spirit/verse/route.ts` — GET returns today's `BibleVerse` in both English and Swahili; seeds `bible_verses` table with initial verse set
  - [x] 7.2 Create `apps/web/app/api/spirit/prayer/route.ts` — GET returns a contextually relevant morning prayer prompt
  - [x] 7.3 Create `apps/web/app/api/spirit/memory-verses/route.ts` — GET returns user's memory verses due for review; POST adds a new verse to memory list
  - [x] 7.4 Create `apps/web/app/api/spirit/memory-verses/[id]/review/route.ts` — POST accepts quality rating (0–5), runs `reviewMemoryVerse()` SM-2 logic, persists updated verse, awards XP via gamification engine
  - [x] 7.5 Create `apps/web/app/api/spirit/gratitude/route.ts` — POST persists `GratitudeEntry` with current date; GET returns entries for a date range
  - [x] 7.6 Create `apps/web/app/api/spirit/score/route.ts` — GET returns weekly `SpiritScore` (verse streak, prayer streak, memory reviews, gratitude count, score 0–100)
  - [x] 7.7 Build Spirit OS UI pages: `/app/spirit` dashboard (daily verse card EN/SW, prayer prompt, streak counters), `/app/spirit/memory` (flashcard review UI), `/app/spirit/gratitude` (journal list + add entry)
  - _Requirements: 7.1–7.6, 16.1–16.4_

- [ ] 8. Goals & Risk OS — monthly goals, habits, streaks, decision engine
  - [ ] 8.1 Create `apps/web/app/api/goals/route.ts` — POST creates a monthly `Goal`; GET returns goals for a month
  - [ ] 8.2 Create `apps/web/app/api/goals/[id]/progress/route.ts` — PATCH updates goal progress percent
  - [ ] 8.3 Create `apps/web/app/api/habits/route.ts` — POST creates a `Habit`; GET returns user's habits
  - [ ] 8.4 Create `apps/web/app/api/habits/[id]/log/route.ts` — POST logs habit completion for a date; updates `current_streak` and `longest_streak` on the habit record
  - [ ] 8.5 Create `apps/web/app/api/goals/decision/route.ts` — POST accepts `DecisionRequest`, calls Gemini to evaluate, returns `DecisionResult` with AI reasoning
  - [ ] 8.6 Build Goals OS UI pages: `/app/goals` dashboard (monthly goal card, habit checklist, streak badges), `/app/goals/decision` (decision evaluation form)
  - _Requirements: 10.2, 10.5_

- [ ] 9. Mental Health OS — mood, stress, sleep, CBT journal, burnout risk, win log
  - [ ] 9.1 Create `apps/web/app/api/mental/mood/route.ts` — POST persists `MoodEntry` with mood (1–5), stress (1–5), optional note, date, time of day
  - [ ] 9.2 Create `apps/web/app/api/mental/sleep/route.ts` — POST persists `SleepEntry` with bedtime, wake time, calculated `duration_hours`, quality (1–5)
  - [ ] 9.3 Create `apps/web/app/api/mental/cbt/route.ts` — POST persists `CBTEntry` with situation, automatic thought, emotion, optional distortion and rational response
  - [ ] 9.4 Create `apps/web/app/api/mental/wins/route.ts` — POST persists `WinEntry` with description and current date
  - [ ] 9.5 Create `apps/web/app/api/mental/burnout/route.ts` — GET runs `assessBurnoutRisk()` over last 14 days of mood, sleep, habit, and stress data; returns `BurnoutRisk` with score, level, factors, and Gemini-generated recommendations
  - [ ] 9.6 Create `apps/web/app/api/mental/summary/route.ts` — GET returns `MentalHealthSummary` aggregating mood trends, sleep averages, and burnout risk for a period
  - [ ] 9.7 Build Mental Health OS UI pages: `/app/mental` dashboard (mood ring, sleep bar, burnout gauge), `/app/mental/cbt` (thought journal form), `/app/mental/wins` (win log list)
  - _Requirements: 9.1–9.5, 17.1–17.5_

- [ ] 10. Family & Relationships OS — contribution tracker, important dates, check-ins
  - [ ] 10.1 Create `apps/web/app/api/family/contributions/route.ts` — POST records a family financial contribution; GET returns contributions for a month
  - [ ] 10.2 Create `apps/web/app/api/family/dates/route.ts` — POST adds an important date (birthday, anniversary); GET returns upcoming dates within 30 days
  - [ ] 10.3 Create `apps/web/app/api/family/checkins/route.ts` — POST logs a family check-in; GET returns check-in history
  - [ ] 10.4 Build Family OS UI page: `/app/family` dashboard (contribution summary, upcoming dates, check-in log)
  - _Requirements: 8.1 (family_score component)_

- [ ] 11. Checkpoint — core modules complete
  - Ensure all module API routes return correct shapes, all Supabase RLS policies are active, and all pure functions in `@tawala/core` are implemented. Ask the user if questions arise.

- [ ] 12. AI Brain — Gemini + NVIDIA NIM orchestration, daily briefing, money letter, future you
  - [ ] 12.1 Create `apps/web/lib/ai/orchestrator.ts` — implement `AIOrchestrationService`: routes vision tasks (food, M-Pesa) to NVIDIA NIM, reasoning tasks to Gemini 2.5 Pro; injects user context into every prompt; implements exponential backoff retry (1s, 2s, 4s) for 5xx errors; logs errors to `error_logs` table
  - [ ] 12.2 Implement `generateDailyBriefing(userId)` — fetches yesterday's snapshot (mood, finance, goals, keto), calls Gemini, returns `DailyBriefing` with non-empty greeting, 3–5 priority items, alerts, and verse; caches result in `ai_cache` with 6-hour TTL; returns cached or static fallback if Gemini unavailable
  - [ ] 12.3 Create `apps/web/app/api/ai/briefing/route.ts` — GET returns cached or freshly generated `DailyBriefing`; checks cache first (< 6 hours old) before calling Gemini
  - [ ] 12.4 Create Vercel Cron Job config (`vercel.json`) — schedule `POST /api/ai/briefing/pregenerate` at `0 2 * * *` UTC (05:00 EAT) to pre-generate briefings for all users
  - [ ] 12.5 Implement `generateMoneyLetter(userId, month)` — Gemini-generated monthly financial narrative; create `apps/web/app/api/ai/money-letter/route.ts`
  - [ ] 12.6 Implement `projectFutureYou(userId)` — Gemini projection of user at age 35 based on current trajectory; create `apps/web/app/api/ai/future-you/route.ts`
  - [ ] 12.7 Implement `chatWithAdvisor(userId, message)` — streaming Gemini chat with user context; create `apps/web/app/api/ai/chat/route.ts`
  - _Requirements: 1.1–1.5, 13.1–13.4_

- [ ] 13. Gamification Engine — XP, levels, badges, life score
  - [ ] 13.1 Create `apps/web/lib/gamification.ts` — implement `awardXP(userId, action)`: increments `xp_total` by exactly `action.xp_value`, checks level thresholds, updates `user_levels` table; define XP values for all actions (log_mood: 5, complete_habit: 10, log_food: 8, review_verse: 15, log_sleep: 5, log_win: 10, savings_deposit: 20)
  - [ ] 13.2 Implement `checkBadges(userId)` — evaluates badge eligibility after each XP award; grants newly earned badges; persists to `user_badges`
  - [ ] 13.3 Create `apps/web/app/api/gamification/life-score/route.ts` — GET computes weekly `LifeScore` using `computeOverallScore()` with weights Finance 0.25, Goals 0.25, Keto 0.15, Spirit 0.15, Mental Health 0.10, Family 0.10; persists to `life_scores`; sets trend (up/down/stable vs previous week ±2 points)
  - [ ] 13.4 Create `apps/web/app/api/gamification/xp/route.ts` — POST awards XP for a given action
  - [ ] 13.5 Create `apps/web/app/api/gamification/leaderboard/route.ts` — GET returns accountability circle leaderboard with only aggregate `LifeScore` fields (no raw data)
  - _Requirements: 8.1–8.5, 10.1–10.5, 15.1–15.2_

- [ ] 14. Widget System — 6 widget data endpoints
  - [ ] 14.1 Create `apps/web/app/api/widgets/verse/route.ts` — GET returns `BibleVerseWidgetData`; requires valid JWT (401 if missing)
  - [ ] 14.2 Create `apps/web/app/api/widgets/keto-meal/route.ts` — GET returns `KetoMealWidgetData`
  - [ ] 14.3 Create `apps/web/app/api/widgets/finance-balance/route.ts` — GET returns `FinanceBalanceWidgetData`
  - [ ] 14.4 Create `apps/web/app/api/widgets/daily-goal/route.ts` — GET returns `DailyGoalWidgetData`
  - [ ] 14.5 Create `apps/web/app/api/widgets/mood-checkin/route.ts` — GET returns `MoodCheckinWidgetData`
  - [ ] 14.6 Create `apps/web/app/api/widgets/water-tracker/route.ts` — GET returns `WaterTrackerWidgetData`
  - [ ] 14.7 Build PWA widget components in `apps/web/components/widgets/` — one component per widget type, rendered on home dashboard
  - _Requirements: 14.1–14.3_

- [ ] 15. Home Dashboard — morning briefing, life score, quick-log overlay
  - [ ] 15.1 Build `apps/web/app/app/page.tsx` — home dashboard: renders `DailyBriefing` card (greeting, priorities, verse, alerts), `LifeScore` ring chart, 6 widget components, and quick-log FAB
  - [ ] 15.2 Build quick-log overlay component — bottom sheet with one-tap actions: log mood, log water, complete habit, log food photo; each action calls the relevant API route and awards XP
  - [ ] 15.3 Build navigation shell — bottom nav bar with icons for Finance, Keto, Spirit, Goals, Mental, Family; AMOLED dark mode (`bg-black`) applied globally
  - _Requirements: 1.1, 8.5, 14.1–14.3_

- [ ] 16. PWA setup — service worker, offline queue, manifest
  - [ ] 16.1 Configure Workbox in `apps/web/next.config.ts` — generate service worker with precache for today's meal plan, daily verse, and budget state routes
  - [ ] 16.2 Create `apps/web/public/manifest.json` — PWA manifest with name "TAWALA", short_name "TAWALA", theme_color "#000000", display "standalone", icons at 192px and 512px
  - [ ] 16.3 Implement `apps/web/lib/offline-queue.ts` — IndexedDB-backed queue using `idb`; `enqueue(entry)` stores writes when offline; `flush()` replays queue to Supabase in chronological order on reconnect; server-wins for financial transactions, client-wins for journal/mood entries
  - [ ] 16.4 Wire offline queue into all POST API calls — detect `navigator.onLine`; if offline, enqueue instead of fetching; register `online` event listener to trigger `flush()`
  - _Requirements: 11.1–11.4_

- [ ] 17. Checkpoint — full app wired together
  - Verify home dashboard loads briefing, all module pages render, widget endpoints return correct shapes, offline queue enqueues and flushes correctly. Ensure all tests pass. Ask the user if questions arise.

- [ ] 18. Property-based tests with fast-check (all 19 correctness properties)
  - [ ] 18.1 Write property test for Property 1: budget allocations sum to monthly income
    - **Property 1: Budget allocations sum to monthly income**
    - **Validates: Requirements 2.1**
    - Use `fc.integer({ min: 30000, max: 100000 })` as income; assert `Math.abs(sum(allocations) - income) < 1`

  - [ ]\* 18.2 Write property test for Property 2: fixed allocation percentages are correct
    - **Property 2: Fixed allocation percentages are correct**
    - **Validates: Requirements 2.2, 2.3**
    - Assert `tithe === income * 0.10` and `savings === income * 0.22`

  - [ ]\* 18.3 Write property test for Property 3: budget buffer is non-negative for standard income
    - **Property 3: Budget buffer is non-negative for standard income**
    - **Validates: Requirements 2.4**
    - Use `fc.integer({ min: 45000, max: 200000 })`; assert `buffer >= 0`

  - [ ]\* 18.4 Write property test for Property 4: impulse pause threshold and timing
    - **Property 4: Impulse pause threshold and timing**
    - **Validates: Requirements 3.1, 3.4, 3.5**
    - Use `fc.integer({ min: 3000, max: 100000 })`; assert `unlock_at - created_at === 86400000` ms and `amount_kes >= 3000`

  - [ ]\* 18.5 Write property test for Property 5: net carbs never exceed total carbs
    - **Property 5: Net carbs never exceed total carbs**
    - **Validates: Requirements 5.2, 5.3**
    - Use `fc.record({ fat_g: fc.float({ min: 0 }), protein_g: fc.float({ min: 0 }), carbs_g: fc.float({ min: 0 }) })`; assert `net_carbs_g <= carbs_g` and all fields `>= 0`

  - [ ]\* 18.6 Write property test for Property 6: ketosis level boundaries are correct
    - **Property 6: Ketosis level boundaries are correct**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Use `fc.float({ min: 0, max: 100 })` as avgNetCarbs; assert correct level and scores in [0, 100]

  - [ ]\* 18.7 Write property test for Property 7: SM-2 ease factor lower bound
    - **Property 7: SM-2 ease factor lower bound**
    - **Validates: Requirements 7.3**
    - Use `fc.integer({ min: 0, max: 5 })` and `fc.float({ min: 1.3, max: 3.0 })`; assert `ease_factor >= 1.3`

  - [ ]\* 18.8 Write property test for Property 8: SM-2 failed recall resets state
    - **Property 8: SM-2 failed recall resets state**
    - **Validates: Requirements 7.1**
    - Use `fc.integer({ min: 0, max: 2 })` as quality; assert `repetitions === 0` and `interval_days === 1`

  - [ ]\* 18.9 Write property test for Property 9: SM-2 successful recall advances state monotonically
    - **Property 9: SM-2 successful recall advances state monotonically**
    - **Validates: Requirements 7.2**
    - Use `fc.integer({ min: 3, max: 5 })` as quality; assert `repetitions > prev` and `interval_days >= prev`

  - [ ]\* 18.10 Write property test for Property 10: memory verse next_review is after last_reviewed
    - **Property 10: Memory verse next_review is after last_reviewed**
    - **Validates: Requirements 7.4**
    - Assert `new Date(next_review) > new Date(last_reviewed)` for any quality rating

  - [ ]\* 18.11 Write property test for Property 11: life score weights sum to 1.0
    - **Property 11: Life score weights sum to 1.0**
    - **Validates: Requirements 8.1, 8.2**
    - Assert `finance(0.25) + goals(0.25) + keto(0.15) + spirit(0.15) + mental(0.10) + family(0.10) === 1.0`

  - [ ]\* 18.12 Write property test for Property 12: all life scores are bounded [0, 100]
    - **Property 12: All life scores are bounded [0, 100]**
    - **Validates: Requirements 8.3**
    - Use `fc.tuple(...Array(6).fill(fc.integer({ min: 0, max: 100 })))`; assert `overall_score >= 0 && overall_score <= 100`

  - [ ]\* 18.13 Write property test for Property 13: life score overall equals weighted sum
    - **Property 13: Life score overall equals weighted sum**
    - **Validates: Requirements 8.1**
    - Assert `Math.abs(overall - weightedSum) < 0.001` for any six module scores

  - [ ]\* 18.14 Write property test for Property 14: burnout risk score is bounded and level is correctly mapped
    - **Property 14: Burnout risk score is bounded and level is correctly mapped**
    - **Validates: Requirements 9.1, 9.2**
    - Use arbitrary mood/sleep/habit/stress inputs; assert `score in [0, 100]` and correct level mapping

  - [ ]\* 18.15 Write property test for Property 15: XP award increases total XP by exact action value
    - **Property 15: XP award increases total XP by exact action value**
    - **Validates: Requirements 10.1**
    - Use `fc.integer({ min: 1, max: 100 })` as xp_value; assert `new_total === old_total + xp_value`

  - [ ]\* 18.16 Write property test for Property 16: daily briefing always contains required fields
    - **Property 16: Daily briefing always contains required fields**
    - **Validates: Requirements 1.1**
    - Assert `greeting.length > 0`, `verse` is non-empty, `priorities.length >= 3 && priorities.length <= 5`

  - [ ]\* 18.17 Write property test for Property 17: M-Pesa scan deduplication
    - **Property 17: M-Pesa scan deduplication**
    - **Validates: Requirements 4.2**
    - Use `fc.array(fc.record({ mpesa_ref: fc.string() }))` with duplicates; assert each ref appears at most once in result

  - [ ]\* 18.18 Write property test for Property 18: accountability circle shares only aggregate scores
    - **Property 18: Accountability circle shares only aggregate scores**
    - **Validates: Requirements 15.1, 15.2**
    - Assert response keys contain only LifeScore fields; assert no keys from Transaction, MoodEntry, FoodLogEntry

  - [ ]\* 18.19 Write property test for Property 19: signed URL expiry is at most 1 hour
    - **Property 19: Signed URL expiry is at most 1 hour**
    - **Validates: Requirements 12.4**
    - Use `fc.integer({ min: 1, max: 10000 })` as requested expiry; assert `Math.min(expiry, 3600) <= 3600`

- [ ] 19. Integration tests — API routes with Supabase test DB
  - [ ]\* 19.1 Write integration tests for Finance API routes
    - Test `POST /api/finance/approve-purchase` with amounts above/below KES 3,000 threshold
    - Test `POST /api/finance/scan-mpesa` with mock NVIDIA NIM and Gemini fixtures
    - Test `GET /api/finance/budget` returns correct allocation summing to income
    - _Requirements: 2.1–2.6, 3.1–3.6, 4.1–4.5_

  - [ ]\* 19.2 Write integration tests for Keto API routes
    - Test `POST /api/keto/log-food-photo` with mock NIM returning food items and empty response
    - Test `GET /api/keto/macros` returns correct `KetosisStatus` for known net carb values
    - _Requirements: 5.1–5.7, 6.1–6.5_

  - [ ]\* 19.3 Write integration tests for Spirit API routes
    - Test `POST /api/spirit/memory-verses/[id]/review` with quality 0–5; verify SM-2 state transitions
    - Test `GET /api/spirit/verse` returns verse with both `text_en` and `text_sw` populated
    - _Requirements: 7.1–7.6, 16.1–16.4_

  - [ ]\* 19.4 Write integration tests for Gamification and Life Score
    - Test `GET /api/gamification/life-score` returns `overall_score` matching weighted sum
    - Test `POST /api/gamification/xp` increments `xp_total` by exact action value
    - Test `GET /api/gamification/leaderboard` response contains no raw financial or health data
    - _Requirements: 8.1–8.5, 10.1–10.5, 15.1–15.2_

  - [ ]\* 19.5 Write integration tests for Auth Middleware
    - Test all protected routes return 401 without JWT
    - Test signed URL generation uses expiry ≤ 3,600 seconds
    - _Requirements: 12.1–12.4_

  - [ ]\* 19.6 Write integration tests for AI Orchestrator
    - Test exponential backoff retry on 5xx responses (mock 3 failures then success)
    - Test cache hit returns cached response without calling Gemini
    - Test static fallback returned when cache is empty and Gemini is unavailable
    - _Requirements: 1.3–1.5, 13.1–13.4_

- [ ] 20. Cloudflare deployment — Pages + Workers, env vars, cron triggers
  - [ ] 20.1 Install `@cloudflare/next-on-pages` and configure `next.config.ts` for Cloudflare edge runtime; add `wrangler.toml` with project name "tawala"
  - [ ] 20.2 Create `wrangler.toml` — configure Cloudflare Pages project, set compatibility_date, add cron trigger `0 2 * * *` for daily briefing pre-generation at 05:00 EAT
  - [ ] 20.3 Add all env vars to Cloudflare Pages project via Wrangler CLI using `CLOUDFLARE_API_TOKEN=cfut_SpmrTgH4mqqH3QvxDbNeH7eXsJjyhQ85xGQ2wq7C15ffa7cb` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, NVIDIA_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
  - [ ] 20.4 Deploy to Cloudflare Pages using `npx wrangler pages deploy` with `CLOUDFLARE_API_TOKEN`; verify deployment URL is live
  - _Requirements: 1.4, 11.4_

- [ ] 21. GitHub push and final verification
  - Push all code to https://github.com/eugineous/tawala on `main` branch using `GITHUB_TOKEN`
  - Verify Cloudflare Pages deployment is live and home dashboard loads with daily briefing
  - Verify Google OAuth login flow works end-to-end
  - Verify at least one widget endpoint returns correct data shape
  - Run `jest --testPathPattern=properties` to confirm all property-based tests pass
  - _Requirements: all_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests in task 18 validate all 19 correctness properties from the design document
- Each module API route must call `validateJWT(req)` before any data access
- All Supabase Storage signed URLs must use expiry ≤ 3,600 seconds (enforced in `packages/core/src/utils.ts`)
- The `@tawala/core` pure functions are the source of truth for all business logic — API routes call these functions, never re-implement the logic
- Checkpoints at tasks 11 and 17 are good moments to demo to the user before proceeding
