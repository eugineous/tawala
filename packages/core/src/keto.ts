import type { MacroBreakdown, KetosisStatus, FoodLogEntry } from "./types";

export function calculateNetCarbs(
  macros: Pick<MacroBreakdown, "carbs_g">
): number {
  // Net carbs = total carbs (fiber not tracked separately in this model)
  // Ensure net_carbs_g <= carbs_g
  return Math.max(0, macros.carbs_g);
}

export function calculateKetosisStatus(
  recentLogs: FoodLogEntry[]
): KetosisStatus {
  if (recentLogs.length === 0) {
    return {
      level: "out",
      estimated_score: 0,
      days_in_ketosis: 0,
      cheat_risk_score: 50,
    };
  }

  const avgNetCarbs =
    recentLogs.reduce((sum, log) => sum + log.total_macros.net_carbs_g, 0) /
    recentLogs.length;

  let level: KetosisStatus["level"];
  let score: number;

  if (avgNetCarbs <= 20) {
    level = "deep";
    score = Math.min(100, 90 + (20 - avgNetCarbs) * 0.5);
  } else if (avgNetCarbs <= 30) {
    level = "light";
    score = 70 + (30 - avgNetCarbs) * 2;
  } else if (avgNetCarbs <= 50) {
    level = "borderline";
    score = 40 + (50 - avgNetCarbs);
  } else {
    level = "out";
    score = Math.max(0, 40 - (avgNetCarbs - 50));
  }

  // Cheat risk: based on carb trend
  const trend =
    recentLogs.length >= 2
      ? recentLogs[recentLogs.length - 1].total_macros.net_carbs_g -
        recentLogs[0].total_macros.net_carbs_g
      : 0;
  const cheatRisk = trend > 5 ? Math.min(100, score + 30) : score * 0.3;

  const daysInKetosis = recentLogs.filter(
    (l) => l.total_macros.net_carbs_g <= 30
  ).length;

  return {
    level,
    estimated_score: Math.min(100, Math.max(0, score)),
    days_in_ketosis: daysInKetosis,
    cheat_risk_score: Math.min(100, Math.max(0, cheatRisk)),
  };
}

export function scoreKeto(data: {
  macroAdherence: number;
  waterAdherence: number;
  ketosisScore: number;
}): number {
  return Math.min(
    100,
    Math.max(
      0,
      data.macroAdherence * 0.5 +
        data.waterAdherence * 0.2 +
        data.ketosisScore * 0.3
    )
  );
}
