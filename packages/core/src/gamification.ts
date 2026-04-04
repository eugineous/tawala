import type { LifeScore, BurnoutRisk } from "./types";

interface ModuleScores {
  finance: number;
  keto: number;
  spirit: number;
  goals: number;
  mental: number;
  family: number;
}

const WEIGHTS = {
  finance: 0.25,
  goals: 0.25,
  keto: 0.15,
  spirit: 0.15,
  mental: 0.1,
  family: 0.1,
};

export function computeOverallScore(scores: ModuleScores): number {
  const overall =
    scores.finance * WEIGHTS.finance +
    scores.keto * WEIGHTS.keto +
    scores.spirit * WEIGHTS.spirit +
    scores.goals * WEIGHTS.goals +
    scores.mental * WEIGHTS.mental +
    scores.family * WEIGHTS.family;
  return Math.min(100, Math.max(0, Math.round(overall)));
}

export function computeLifeScoreTrend(
  current: number,
  previous: number
): LifeScore["trend"] {
  if (current > previous + 2) return "up";
  if (current < previous - 2) return "down";
  return "stable";
}

interface BurnoutInputs {
  moodEntries: { mood: number; created_at: string }[];
  sleepEntries: { duration_hours: number }[];
  habitCompletionRecent: number; // 0-1
  habitCompletionPrior: number; // 0-1
  avgStress: number; // 1-5
}

export function assessBurnoutRisk(
  inputs: BurnoutInputs
): { score: number; factors: string[] } {
  const {
    moodEntries,
    sleepEntries,
    habitCompletionRecent,
    habitCompletionPrior,
    avgStress,
  } = inputs;

  let score = 0;
  const factors: string[] = [];

  // Factor 1: Mood trend
  if (moodEntries.length >= 2) {
    const avgMood =
      moodEntries.reduce((s, e) => s + e.mood, 0) / moodEntries.length;
    if (avgMood < 3) {
      score += 20;
      factors.push("Low average mood");
    }
    // Simple trend: compare first half vs second half
    const mid = Math.floor(moodEntries.length / 2);
    const firstHalf =
      moodEntries.slice(0, mid).reduce((s, e) => s + e.mood, 0) / mid;
    const secondHalf =
      moodEntries.slice(mid).reduce((s, e) => s + e.mood, 0) /
      (moodEntries.length - mid);
    if (secondHalf < firstHalf - 0.5) {
      score += 30;
      factors.push("Declining mood trend");
    }
  }

  // Factor 2: Sleep deprivation
  if (sleepEntries.length > 0) {
    const avgSleep =
      sleepEntries.reduce((s, e) => s + e.duration_hours, 0) /
      sleepEntries.length;
    if (avgSleep < 6) {
      score += 25;
      factors.push("Severe sleep deprivation (<6h avg)");
    } else if (avgSleep < 7) {
      score += 10;
      factors.push("Mild sleep deprivation (<7h avg)");
    }
  }

  // Factor 3: Habit completion drop
  if (habitCompletionRecent < habitCompletionPrior - 0.3) {
    score += 25;
    factors.push("Significant drop in habit completion");
  }

  // Factor 4: Sustained high stress
  if (avgStress >= 4) {
    score += 20;
    factors.push("Sustained high stress");
  } else if (avgStress >= 3.5) {
    score += 10;
    factors.push("Elevated stress levels");
  }

  return { score: Math.min(100, score), factors };
}

export function computeBurnoutLevel(score: number): BurnoutRisk["level"] {
  if (score >= 70) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "moderate";
  return "low";
}
