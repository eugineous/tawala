import type {
  BudgetAllocation,
  Transaction,
  ImpulsePause,
  PurchaseDecision,
  PurchaseDecisionType,
} from "./types";

interface AllocationPreferences {
  rent?: number;
  entertainment?: number;
}

interface FinancialContext {
  userId: string;
  allocations: BudgetAllocation["allocations"];
  actualSpent: Record<string, number>;
  savingsStreak: { current_streak_days: number };
  activePause?: ImpulsePause | null;
}

interface PurchaseRequest {
  userId: string;
  item: string;
  amount_kes: number;
  category?: string;
}

export function allocateBudget(
  income: number,
  prefs: AllocationPreferences = {}
): BudgetAllocation["allocations"] & { total: number } {
  const tithe = Math.round(income * 0.1);
  const savings = Math.round(income * 0.22);
  const rent = prefs.rent ?? 15000;
  const food_keto = 5000;
  const transport = 5000;
  const family_support = 3000;
  const entertainment = prefs.entertainment ?? 2500;
  const buffer =
    income - tithe - savings - rent - food_keto - transport - family_support - entertainment;
  return {
    tithe,
    savings,
    rent,
    food_keto,
    transport,
    family_support,
    entertainment,
    buffer,
    total: income,
  };
}

export function evaluatePurchase(
  req: PurchaseRequest,
  ctx: FinancialContext
): Omit<PurchaseDecision, "pause"> & { createPause: boolean } {
  const { amount_kes, item } = req;

  // 24-hour rule: amounts >= KES 3000
  if (amount_kes >= 3000) {
    if (!ctx.activePause) {
      return {
        approved: false,
        type: "PAUSE" as PurchaseDecisionType,
        reasoning: `Items over KES 3,000 require a 24-hour reflection period. "${item}" will be available for purchase tomorrow.`,
        createPause: true,
      };
    }
    const now = new Date();
    const unlockAt = new Date(ctx.activePause.unlock_at);
    if (now < unlockAt) {
      return {
        approved: false,
        type: "STILL_PAUSED" as PurchaseDecisionType,
        reasoning: `Still in 24-hour pause. Unlocks at ${unlockAt.toLocaleString()}.`,
        createPause: false,
      };
    }
  }

  // Budget check
  const category = req.category ?? "other";
  const allocated = (ctx.allocations as Record<string, number>)[category] ?? 0;
  const spent = ctx.actualSpent[category] ?? 0;
  const remaining = allocated - spent;

  if (amount_kes > remaining) {
    return {
      approved: false,
      type: "OVER_BUDGET" as PurchaseDecisionType,
      reasoning: `You have KES ${remaining} remaining in ${category}. This purchase of KES ${amount_kes} exceeds your budget.`,
      remaining,
      createPause: false,
    };
  }

  // Savings streak caution
  if (
    ctx.savingsStreak.current_streak_days >= 7 &&
    amount_kes > remaining * 0.5
  ) {
    return {
      approved: true,
      type: "CAUTION" as PurchaseDecisionType,
      reasoning: `Approved, but this uses over 50% of your remaining ${category} budget. Your ${ctx.savingsStreak.current_streak_days}-day savings streak is at risk.`,
      warning: "Streak at risk",
      createPause: false,
    };
  }

  return {
    approved: true,
    type: "APPROVED" as PurchaseDecisionType,
    reasoning: `Purchase approved. KES ${remaining - amount_kes} remaining in ${category}.`,
    createPause: false,
  };
}

export function deduplicateTransactions(txs: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  return txs.filter((tx) => {
    if (!tx.mpesa_ref) return true;
    if (seen.has(tx.mpesa_ref)) return false;
    seen.add(tx.mpesa_ref);
    return true;
  });
}
