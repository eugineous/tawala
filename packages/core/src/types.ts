// @tawala/core — shared TypeScript types

export type ModuleType =
  | "finance"
  | "keto"
  | "spirit"
  | "goals"
  | "family"
  | "mental_health";

export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type StressLevel = 1 | 2 | 3 | 4 | 5;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  monthly_income_kes: number;
  keto_budget_kes: number;
  language: "en" | "sw";
  legacy_statement: string;
  created_at: string;
  updated_at: string;
}

export type TransactionCategory =
  | "food"
  | "transport"
  | "rent"
  | "utilities"
  | "entertainment"
  | "health"
  | "savings"
  | "investment"
  | "family_support"
  | "tithe"
  | "other";

export interface Transaction {
  id: string;
  user_id: string;
  amount_kes: number;
  type: "income" | "expense" | "transfer" | "savings";
  category: TransactionCategory;
  description: string;
  source: "manual" | "mpesa_scan" | "auto";
  mpesa_ref: string | null;
  date: string;
  created_at: string;
}

export interface MacroBreakdown {
  fat_g: number;
  protein_g: number;
  carbs_g: number;
  calories: number;
  net_carbs_g: number;
  ketosis_impact: "positive" | "neutral" | "negative";
}

export interface KetosisStatus {
  level: "deep" | "light" | "borderline" | "out";
  estimated_score: number;
  days_in_ketosis: number;
  cheat_risk_score: number;
}

export interface BibleVerse {
  id: string;
  reference: string;
  text_en: string;
  text_sw: string;
  theme: string;
  date: string;
}

export interface UserLevel {
  user_id: string;
  xp_total: number;
  level: number;
  level_name: string;
  xp_to_next_level: number;
  badges: Badge[];
}

export interface LifeScore {
  user_id: string;
  week: string;
  finance_score: number;
  keto_score: number;
  spirit_score: number;
  goals_score: number;
  mental_health_score: number;
  family_score: number;
  overall_score: number;
  trend: "up" | "down" | "stable";
}

export interface BudgetAllocation {
  user_id: string;
  month: string;
  total_income_kes: number;
  allocations: {
    rent: number;
    food_keto: number;
    transport: number;
    savings: number;
    family_support: number;
    tithe: number;
    entertainment: number;
    buffer: number;
  };
  actual_spent: Record<TransactionCategory, number>;
}

export interface ImpulsePause {
  id: string;
  user_id: string;
  item_name: string;
  amount_kes: number;
  created_at: string;
  unlock_at: string;
  status: "pending" | "approved" | "cancelled";
  ai_reasoning: string;
}

export interface SavingsStreak {
  user_id: string;
  current_streak_days: number;
  longest_streak_days: number;
  last_savings_date: string;
  total_saved_kes: number;
}

export interface FoodItem {
  name: string;
  quantity_g: number;
  macros: Omit<MacroBreakdown, "ketosis_impact">;
}

export interface FoodLogEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_items: FoodItem[];
  total_macros: MacroBreakdown;
  logged_via: "manual" | "photo" | "meal_plan";
  photo_url: string | null;
  created_at: string;
}

export interface DailyMacros {
  user_id: string;
  date: string;
  target: MacroBreakdown;
  actual: MacroBreakdown;
  water_ml: number;
  water_target_ml: number;
  ketosis_status: KetosisStatus;
}

export interface ShoppingItem {
  name: string;
  quantity: string;
  estimated_cost_kes: number;
  market: "Gikomba" | "Wakulima" | "Supermarket" | "Local";
}

export interface MealPlanDay {
  day: string;
  meals: { type: string; name: string; macros: MacroBreakdown }[];
}

export interface MealPlan {
  user_id: string;
  week: string;
  budget_kes: number;
  days: MealPlanDay[];
  shopping_list: ShoppingItem[];
}

export interface MemoryVerse {
  id: string;
  user_id: string;
  verse_id: string;
  verse: BibleVerse;
  ease_factor: number;
  interval_days: number;
  next_review: string;
  repetitions: number;
  last_reviewed: string | null;
}

export interface GratitudeEntry {
  id: string;
  user_id: string;
  content: string;
  date: string;
  created_at: string;
}

export interface SpiritScore {
  user_id: string;
  week: string;
  verse_streak: number;
  prayer_streak: number;
  memory_reviews: number;
  gratitude_entries: number;
  score: number;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  month: string;
  is_primary: boolean;
  status: "active" | "completed" | "abandoned";
  progress_percent: number;
  weekly_breakdowns: WeeklyGoalBreakdown[];
  created_at: string;
}

export interface WeeklyGoalBreakdown {
  week: string;
  tasks: string[];
  completed: boolean;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string;
  frequency: "daily" | "weekly";
  module: ModuleType;
  target_count: number;
  current_streak: number;
  longest_streak: number;
  is_morning_routine: boolean;
  order: number;
}

export interface HabitLog {
  id: string;
  user_id: string;
  habit_id: string;
  date: string;
  completed: boolean;
  note: string | null;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: MoodLevel;
  stress: StressLevel;
  note: string | null;
  date: string;
  time_of_day: "morning" | "afternoon" | "evening";
  created_at: string;
}

export interface CBTEntry {
  id: string;
  user_id: string;
  situation: string;
  automatic_thought: string;
  emotion: string;
  cognitive_distortion: string | null;
  rational_response: string | null;
  outcome_mood: MoodLevel | null;
  date: string;
}

export interface SleepEntry {
  id: string;
  user_id: string;
  date: string;
  bedtime: string;
  wake_time: string;
  duration_hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
  notes: string | null;
}

export interface BurnoutRisk {
  user_id: string;
  score: number;
  level: "low" | "moderate" | "high" | "critical";
  factors: string[];
  recommendations: string[];
  assessed_at: string;
}

export interface Badge {
  id: string;
  name: string;
  name_sw: string;
  description: string;
  icon: string;
  module: ModuleType | "global";
  earned_at: string | null;
}

export interface XPAction {
  action: string;
  module: ModuleType;
  xp_value: number;
}

export interface DailyBriefing {
  greeting: string;
  priorities: string[];
  alerts: string[];
  verse: BibleVerse;
  generated_at: string;
}

export type PurchaseDecisionType =
  | "APPROVED"
  | "PAUSE"
  | "STILL_PAUSED"
  | "OVER_BUDGET"
  | "CAUTION";

export interface PurchaseDecision {
  approved: boolean;
  type: PurchaseDecisionType;
  reasoning: string;
  pause?: ImpulsePause;
  warning?: string;
  remaining?: number;
}

export interface WinEntry {
  id: string;
  user_id: string;
  description: string;
  date: string;
  created_at: string;
}

export interface DecisionRequest {
  title: string;
  description: string;
  options?: string[];
  context?: string;
}

export interface DecisionResult {
  recommendation: string;
  reasoning: string;
  pros: string[];
  cons: string[];
  risk_level: "low" | "medium" | "high";
  confidence_score: number; // 0-100
}
