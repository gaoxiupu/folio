// ── Daily global API call budget ──────────────────────────────────────────────
// Single in-memory counter. Resets on server restart or at midnight.

const DAILY_BUDGET = parseInt(process.env.DAILY_API_BUDGET ?? "500", 10);

let budget = { date: "", count: 0 };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkDailyBudget(): {
  allowed: boolean;
  remaining: number;
  resetAt: string;
} {
  const currentDate = today();

  if (budget.date !== currentDate) {
    budget = { date: currentDate, count: 0 };
  }

  budget.count++;

  if (budget.count > DAILY_BUDGET) {
    // Calculate next midnight in ISO format
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return {
      allowed: false,
      remaining: 0,
      resetAt: tomorrow.toISOString(),
    };
  }

  return {
    allowed: true,
    remaining: DAILY_BUDGET - budget.count,
    resetAt: "",
  };
}
