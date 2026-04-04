import type { MemoryVerse } from "./types";

export function reviewMemoryVerse(
  verse: MemoryVerse,
  quality: 0 | 1 | 2 | 3 | 4 | 5
): MemoryVerse {
  const today = new Date().toISOString().split("T")[0];
  let { repetitions, interval_days, ease_factor } = verse;

  if (quality < 3) {
    // Failed recall — reset
    repetitions = 0;
    interval_days = 1;
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions += 1;
  }

  // Update ease factor (SM-2 formula)
  ease_factor =
    ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ease_factor = Math.max(1.3, ease_factor);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval_days);
  const next_review = nextReviewDate.toISOString().split("T")[0];

  return {
    ...verse,
    repetitions,
    interval_days,
    ease_factor,
    next_review,
    last_reviewed: today,
  };
}

export function scoreSpiritData(data: {
  verseStreak: number;
  prayerStreak: number;
  memoryReviews: number;
  gratitudeEntries: number;
}): number {
  const verseScore = Math.min(100, data.verseStreak * 14.3); // 7 days = 100
  const prayerScore = Math.min(100, data.prayerStreak * 14.3);
  const memoryScore = Math.min(100, data.memoryReviews * 33.3); // 3 reviews = 100
  const gratitudeScore = Math.min(100, data.gratitudeEntries * 4.8); // 21 entries/week = 100
  return Math.round(
    (verseScore + prayerScore + memoryScore + gratitudeScore) / 4
  );
}
