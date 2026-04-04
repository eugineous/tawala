// @tawala/core — shared types, hooks, and utilities

// Types
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
