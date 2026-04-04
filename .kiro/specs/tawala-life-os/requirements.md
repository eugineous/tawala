# Requirements Document

## Introduction

TAWALA (Swahili: "Reign/Rule") is a Progressive Web App and Android application serving as a personal Life Operating System for a young Kenyan professional. The system integrates Gemini 2.5 Pro as an AI advisor brain and NVIDIA NIM for vision tasks (food scanning, M-Pesa screenshot reading), built on Next.js 15 + Supabase + Expo React Native.

The system is organized into 8 MVP modules: Finance OS, Keto OS, Spirit OS, Goals & Risk OS, Family & Relationships OS, Mental Health OS, Widget System, and AI Brain. All modules share a unified data layer, gamification engine, and AI orchestration layer, with offline-first PWA support and AMOLED dark mode.

---

## Glossary

- **TAWALA**: The Life OS application (Swahili: "Reign/Rule")
- **AI_Orchestrator**: The AI Orchestration Service that routes tasks between Gemini 2.5 Pro and NVIDIA NIM
- **Finance_Module**: The Finance OS module managing budget, transactions, and savings
- **Keto_Module**: The Keto OS module managing meal plans, macros, and ketosis tracking
- **Spirit_Module**: The Spirit OS module managing Bible verses, prayer, and scripture memory
- **Goals_Module**: The Goals & Risk OS module managing goals, habits, and decision evaluation
- **Mental_Health_Module**: The Mental Health OS module managing mood, stress, sleep, and burnout
- **Family_Module**: The Family & Relationships OS module managing family contributions and check-ins
- **Gamification_Engine**: The engine managing XP, levels, badges, and streaks across all modules
- **Widget_System**: The system providing data for Android home screen widgets and PWA widget components
- **Auth_Middleware**: The Supabase JWT validation layer protecting all API routes
- **Offline_Queue**: The IndexedDB-backed queue storing writes made while the device is offline
- **SM2_Algorithm**: The SuperMemo 2 spaced repetition algorithm used for scripture memory
- **ImpulsePause**: A 24-hour cooling-off record created when a purchase request exceeds KES 3,000
- **LifeScore**: The weekly composite score (0–100) aggregating all module scores
- **DailyBriefing**: The AI-generated morning summary containing greeting, priorities, alerts, and a Bible verse
- **MacroBreakdown**: The nutritional breakdown of a food entry (fat, protein, carbs, net carbs, calories, ketosis impact)
- **KetosisStatus**: The estimated ketosis level (deep / light / borderline / out) derived from recent net carb intake
- **BurnoutRisk**: The assessed burnout risk score (0–100) and level derived from mood, sleep, habits, and stress data
- **MoodLevel**: An integer in [1, 5] representing user mood (1 = very low, 5 = very high)
- **StressLevel**: An integer in [1, 5] representing user stress (1 = very low, 5 = very high)
- **EAT**: East Africa Time (UTC+3), the user's local timezone
- **KES**: Kenyan Shilling, the currency used throughout the Finance OS

---

## Requirements

### Requirement 1: AI Daily Briefing

**User Story:** As a user, I want to receive a personalized AI-generated morning briefing, so that I can start each day with clear priorities, spiritual grounding, and awareness of any alerts from the previous day.

#### Acceptance Criteria

1. WHEN a user requests a daily briefing, THE AI_Orchestrator SHALL return a DailyBriefing containing a non-empty greeting, a non-empty Bible verse, and between 3 and 5 actionable priority items ordered by urgency.
2. WHEN a user's previous day data contains budget overruns, missed habits, or health flags, THE AI_Orchestrator SHALL include corresponding alerts in the DailyBriefing.
3. WHEN a DailyBriefing has been generated within the last 6 hours for a user, THE AI_Orchestrator SHALL return the cached response without making a new Gemini API call.
4. THE AI_Orchestrator SHALL pre-generate each user's DailyBriefing at 05:00 EAT daily via a scheduled job so that the briefing is available instantly on app open.
5. IF the Gemini API is unavailable, THEN THE AI_Orchestrator SHALL return a cached DailyBriefing if one exists that is less than 6 hours old, or a static fallback briefing containing a pre-stored Bible verse and simplified priorities.

---

### Requirement 2: Budget Allocation

**User Story:** As a user, I want my monthly income to be automatically allocated across fixed and variable budget categories, so that I always know exactly how much I can spend in each area.

#### Acceptance Criteria

1. THE Finance_Module SHALL allocate monthly income such that the sum of all category allocations equals the total monthly income.
2. THE Finance_Module SHALL allocate tithe as exactly 10% of monthly income.
3. THE Finance_Module SHALL allocate savings as exactly 22% of monthly income.
4. WHEN monthly income is at least KES 45,000, THE Finance_Module SHALL produce a budget allocation where the buffer amount is greater than or equal to zero.
5. WHEN actual spending in a category exceeds the allocated amount, THE Finance_Module SHALL flag that category as OVER_BUDGET and block new purchase approvals in that category.
6. IF a category is flagged as OVER_BUDGET, THEN THE Finance_Module SHALL trigger the AI_Orchestrator to generate a reallocation suggestion for the user.

---

### Requirement 3: Purchase Approval and Impulse Control

**User Story:** As a user, I want the system to evaluate my purchase requests against my budget and savings goals, so that I can make financially disciplined decisions and avoid impulse spending.

#### Acceptance Criteria

1. WHEN a user submits a purchase request with an amount greater than or equal to KES 3,000, THE Finance_Module SHALL create an ImpulsePause record with an unlock time exactly 24 hours after the creation time, and return a PAUSE decision.
2. WHEN a user submits a purchase request with an amount less than KES 3,000 and the amount does not exceed the remaining category budget, THE Finance_Module SHALL return an APPROVED decision.
3. WHEN a user submits a purchase request and the amount exceeds the remaining category budget, THE Finance_Module SHALL return an OVER_BUDGET decision regardless of the purchase amount.
4. WHEN a user resubmits a purchase request for an item with an active ImpulsePause whose unlock time has not yet passed, THE Finance_Module SHALL return a STILL_PAUSED decision referencing the existing ImpulsePause.
5. THE Finance_Module SHALL NOT create an ImpulsePause for any purchase amount less than KES 3,000.
6. WHEN a user's savings streak is at least 7 days and the purchase amount exceeds 50% of the remaining category budget, THE Finance_Module SHALL return an APPROVED decision with a CAUTION warning indicating the streak is at risk.

---

### Requirement 4: M-Pesa Screenshot Scanning

**User Story:** As a user, I want to upload M-Pesa screenshots and have transactions automatically extracted and categorized, so that I can track my spending without manual data entry.

#### Acceptance Criteria

1. WHEN a user uploads a valid M-Pesa screenshot, THE Finance_Module SHALL use NVIDIA NIM to extract transaction text and Gemini 2.5 Pro to parse and categorize the resulting transactions.
2. WHEN transactions are extracted from an M-Pesa screenshot, THE Finance_Module SHALL deduplicate transactions by M-Pesa reference number so that each reference appears at most once in the result.
3. WHEN transactions are successfully extracted, THE Finance_Module SHALL persist each transaction to the transactions table and return the parsed list to the caller.
4. WHEN a valid M-Pesa screenshot is processed, THE Finance_Module SHALL return only transactions where amount_kes is greater than zero, the date is a valid date string, and the mpesa_ref is non-empty.
5. IF the uploaded image cannot be read by NVIDIA NIM (blurry, wrong format, or non-M-Pesa content), THEN THE Finance_Module SHALL return an empty transaction array with an UNREADABLE error code and a user-facing message, without persisting any data.

---

### Requirement 5: Keto Macro Tracking and Food Photo Logging

**User Story:** As a user, I want to log my meals by taking photos and have macros automatically calculated, so that I can maintain ketosis without manually counting nutrients.

#### Acceptance Criteria

1. WHEN a user uploads a food photo, THE Keto_Module SHALL use NVIDIA NIM to identify food items and Gemini 2.5 Pro to calculate the MacroBreakdown, then persist a FoodLogEntry with the photo URL.
2. THE Keto_Module SHALL produce MacroBreakdown values where net_carbs_g is less than or equal to carbs_g for all food entries.
3. THE Keto_Module SHALL produce MacroBreakdown values where fat_g, protein_g, carbs_g, and calories are all greater than or equal to zero.
4. WHEN a FoodLogEntry is persisted, THE Keto_Module SHALL update the user's daily macro totals for the corresponding date.
5. IF NVIDIA NIM identifies no food items in the uploaded photo, THEN THE Keto_Module SHALL return a response with an empty items array, a confidence score of zero, and a user-facing message, without persisting a FoodLogEntry.
6. THE Keto_Module SHALL set the daily water intake target to exactly 3,000 ml for all users.
7. WHEN a user's shopping list is generated, THE Keto_Module SHALL include only items where estimated_cost_kes is greater than zero.

---

### Requirement 6: Ketosis Status Calculation

**User Story:** As a user, I want to know my current ketosis status based on my recent food logs, so that I can understand whether my diet is keeping me in ketosis.

#### Acceptance Criteria

1. WHEN ketosis status is calculated from recent food logs, THE Keto_Module SHALL classify the status as "deep" when average daily net carbs over the last 3 days is less than or equal to 20g.
2. WHEN ketosis status is calculated from recent food logs, THE Keto_Module SHALL classify the status as "light" when average daily net carbs is greater than 20g and less than or equal to 30g.
3. WHEN ketosis status is calculated from recent food logs, THE Keto_Module SHALL classify the status as "borderline" when average daily net carbs is greater than 30g and less than or equal to 50g.
4. WHEN ketosis status is calculated from recent food logs, THE Keto_Module SHALL classify the status as "out" when average daily net carbs is greater than 50g.
5. THE Keto_Module SHALL produce a KetosisStatus where estimated_score is in the range [0, 100] and cheat_risk_score is in the range [0, 100].

---

### Requirement 7: Scripture Memory with Spaced Repetition

**User Story:** As a user, I want to memorize Bible verses using spaced repetition, so that scripture becomes deeply embedded in my daily life.

#### Acceptance Criteria

1. WHEN a user reviews a memory verse with a quality rating less than 3, THE Spirit_Module SHALL reset the verse's repetition count to 0 and interval to 1 day.
2. WHEN a user reviews a memory verse with a quality rating of 3 or greater, THE Spirit_Module SHALL increment the repetition count and calculate the next interval using the SM2_Algorithm.
3. THE Spirit_Module SHALL ensure the ease_factor of any MemoryVerse is always greater than or equal to 1.3 after any review.
4. THE Spirit_Module SHALL set the next_review date to a date strictly after the last_reviewed date for all MemoryVerse records.
5. WHEN a user successfully reviews a memory verse, THE Gamification_Engine SHALL award XP to the user.
6. THE Spirit_Module SHALL provide daily Bible verses in both English and Swahili.

---

### Requirement 8: Weekly Life Score

**User Story:** As a user, I want a weekly composite Life Score that reflects my performance across all life modules, so that I can see my overall progress and identify areas for improvement.

#### Acceptance Criteria

1. THE Gamification_Engine SHALL calculate the overall LifeScore as the weighted sum of module scores using weights: Finance 0.25, Goals 0.25, Keto 0.15, Spirit 0.15, Mental Health 0.10, Family 0.10.
2. THE Gamification_Engine SHALL ensure the sum of all LifeScore weights equals exactly 1.0.
3. THE Gamification_Engine SHALL produce a LifeScore where all individual module scores and the overall_score are in the range [0, 100].
4. WHEN a LifeScore is calculated, THE Gamification_Engine SHALL set the trend to "up" if the overall score exceeds the previous week's score by more than 2 points, "down" if it is lower by more than 2 points, and "stable" otherwise.
5. WHEN a LifeScore is calculated, THE Gamification_Engine SHALL persist the result to the life_scores table for historical tracking.

---

### Requirement 9: Burnout Risk Detection

**User Story:** As a user, I want the system to detect early signs of burnout based on my mood, sleep, habits, and stress data, so that I can take preventive action before reaching a critical state.

#### Acceptance Criteria

1. THE Mental_Health_Module SHALL calculate a BurnoutRisk score in the range [0, 100] based on mood trend, sleep duration, habit completion rate, and average stress level over the last 14 days.
2. THE Mental_Health_Module SHALL classify burnout level as "critical" when score is greater than or equal to 70, "high" when score is greater than or equal to 50, "moderate" when score is greater than or equal to 30, and "low" otherwise.
3. WHEN a BurnoutRisk is assessed, THE Mental_Health_Module SHALL include a list of contributing risk factors and AI-generated recommendations.
4. WHEN average mood trend over the lookback period is declining at a rate greater than 0.1 per day, THE Mental_Health_Module SHALL contribute a mood risk factor to the burnout score.
5. WHEN average sleep duration over the lookback period is less than 6 hours, THE Mental_Health_Module SHALL contribute a sleep deprivation risk factor to the burnout score.

---

### Requirement 10: Gamification Engine

**User Story:** As a user, I want to earn XP, level up, and unlock badges as I complete actions across all modules, so that I stay motivated to maintain healthy habits.

#### Acceptance Criteria

1. WHEN a user completes a tracked action (logging mood, completing a habit, logging food, reviewing a verse, etc.), THE Gamification_Engine SHALL award the corresponding XP value and increase the user's total XP by exactly that amount.
2. THE Gamification_Engine SHALL track streaks for habits, verse reviews, prayer, and savings, and update streak counts after each relevant action.
3. WHEN a user's total XP crosses a level threshold, THE Gamification_Engine SHALL update the user's level and level_name.
4. THE Gamification_Engine SHALL evaluate badge eligibility after each XP award and grant any newly earned badges to the user.
5. WHEN a user requests their weekly LifeScore, THE Gamification_Engine SHALL aggregate module data for the specified week and return a LifeScore with all six module scores populated.

---

### Requirement 11: Offline Support and Data Sync

**User Story:** As a user, I want to continue using the app without an internet connection and have my data automatically synced when I reconnect, so that connectivity issues never interrupt my daily tracking.

#### Acceptance Criteria

1. WHILE the device has no network connectivity, THE TAWALA PWA SHALL serve cached data from IndexedDB and allow the user to create new entries that are stored in the Offline_Queue.
2. WHEN network connectivity is restored, THE TAWALA PWA SHALL replay all entries in the Offline_Queue to Supabase in the chronological order they were created.
3. WHEN syncing offline data, THE TAWALA PWA SHALL apply a server-wins conflict resolution strategy for financial transactions and a client-wins strategy for journal and mood entries.
4. THE TAWALA PWA SHALL pre-cache today's meal plan, daily verse, and budget state via the service worker so that they are available immediately in offline mode.

---

### Requirement 12: Authentication and Security

**User Story:** As a user, I want my data to be securely protected so that only I can access my personal financial, health, and spiritual information.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL validate a Supabase JWT on every API request to protected routes before any data is accessed or modified.
2. IF a request to a protected route does not include a valid JWT, THEN THE Auth_Middleware SHALL return an HTTP 401 response without processing the request.
3. THE TAWALA system SHALL support Google OAuth as the sole authentication method and SHALL NOT expose any password-based authentication endpoints.
4. WHEN a signed URL is generated for a file in Supabase Storage, THE TAWALA system SHALL set the expiry to no more than 3,600 seconds (1 hour) from the time of generation.
5. IF a user's JWT expires during an active session, THEN THE Auth_Middleware SHALL silently refresh the token via Supabase onAuthStateChange and replay any queued requests after the refresh succeeds.
6. THE TAWALA system SHALL enforce Row Level Security on all Supabase tables such that each row is accessible only to the user whose user_id matches auth.uid().

---

### Requirement 13: AI Error Handling and Resilience

**User Story:** As a user, I want the app to remain functional and informative even when AI services are temporarily unavailable, so that a third-party outage never blocks my daily tracking.

#### Acceptance Criteria

1. IF the Gemini 2.5 Pro API returns a 5xx error or times out, THEN THE AI_Orchestrator SHALL retry the request using exponential backoff with delays of 1 second, 2 seconds, and 4 seconds before returning a fallback response.
2. IF the NVIDIA NIM API returns a 5xx error or times out, THEN THE AI_Orchestrator SHALL retry the request using exponential backoff with delays of 1 second, 2 seconds, and 4 seconds before returning a fallback response.
3. WHEN an AI API error occurs after all retries are exhausted, THE AI_Orchestrator SHALL log the error to the Supabase error_logs table and surface a non-blocking notification to the user.
4. THE AI_Orchestrator SHALL cache all Gemini 2.5 Pro responses in the ai_cache table with a time-to-live of 6 hours to reduce redundant API calls and provide fallback data during outages.

---

### Requirement 14: Widget System

**User Story:** As a user, I want home screen widgets showing my key daily metrics, so that I can stay informed at a glance without opening the full app.

#### Acceptance Criteria

1. THE Widget_System SHALL provide data endpoints for six widget types: Bible Verse, Keto Meal, Finance Balance, Daily Goal, Mood Check-in, and Water Tracker.
2. WHEN an authenticated user requests widget data, THE Widget_System SHALL return a correctly shaped data object for the requested widget type.
3. THE Widget_System SHALL require a valid Supabase JWT for all widget data requests and return HTTP 401 for unauthenticated requests.

---

### Requirement 15: Privacy in Accountability Circles

**User Story:** As a user, I want to share my progress with an accountability circle without exposing my raw financial or health data, so that I can stay accountable while maintaining privacy.

#### Acceptance Criteria

1. WHEN a user's data is shared with an accountability circle, THE TAWALA system SHALL share only the aggregate LifeScore and module-level scores, and SHALL NOT include raw transaction amounts, mood entries, food logs, or any other personally identifiable data.
2. THE TAWALA system SHALL ensure that accountability circle API responses contain only LifeScore fields and no raw financial, health, or spiritual data.

---

### Requirement 16: Spirit OS Daily Features

**User Story:** As a user, I want daily Bible verses, prayer prompts, and gratitude journaling, so that I can maintain consistent spiritual disciplines.

#### Acceptance Criteria

1. THE Spirit_Module SHALL deliver a daily Bible verse to the user each day, with the verse available in both English and Swahili.
2. WHEN a user requests a morning prayer prompt, THE Spirit_Module SHALL return a contextually relevant prayer prompt.
3. WHEN a user adds a gratitude entry, THE Spirit_Module SHALL persist the entry with the current date and return the saved GratitudeEntry.
4. THE Spirit_Module SHALL calculate a weekly SpiritScore based on verse streak, prayer streak, memory review count, and gratitude entry count, with the score in the range [0, 100].

---

### Requirement 17: Mental Health Tracking

**User Story:** As a user, I want to log my mood, stress, sleep, and thoughts daily, so that I can monitor my mental wellbeing and identify patterns over time.

#### Acceptance Criteria

1. WHEN a user logs a mood entry, THE Mental_Health_Module SHALL persist a MoodEntry with the mood level (1–5), stress level (1–5), optional note, date, and time of day.
2. WHEN a user logs a sleep entry, THE Mental_Health_Module SHALL persist a SleepEntry with bedtime, wake time, calculated duration in hours, and quality rating (1–5).
3. WHEN a user adds a CBT thought entry, THE Mental_Health_Module SHALL persist a CBTEntry with situation, automatic thought, emotion, and optional cognitive distortion and rational response fields.
4. WHEN a user logs a win, THE Mental_Health_Module SHALL persist a WinEntry with the win description and current date.
5. THE Mental_Health_Module SHALL provide a mental health summary for a specified period aggregating mood trends, sleep averages, and burnout risk.
