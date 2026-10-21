// Pure calculations behind the "Advanced Statistics" section of the statistics page.
//
// Everything works on the per-trade rows returned by /trades/stats, so all numbers follow the
// selected time period / ticker / status filter automatically.
//
// The statistics page is public: nothing here deals in dollars — only R-multiples, percentages
// and position size relative to one full position.
//
// Outcome rule (same as the Performance Summary): P/L % > 0 is a win, < 0 a loss, 0 a scratch.

import type { StatsTrade } from "@/components/trades/trade-statistics";

export type Outcome = "win" | "loss" | "scratch";

/** Groups with fewer trades than this get a "small sample" marker. */
export const MIN_SAMPLE = 8;

export interface AdvancedTrade {
  id: string | number;
  /** "YYYY-MM-DD" of the last exit — when the result was realized. */
  closeDate: string | null;
  r: number | null;
  /** P/L % (percentage points, 5.3 = +5.3%). */
  pct: number | null;
  /** P/L % scaled by position size (a half-size trade counts half). */
  normPct: number | null;
  daysHeld: number | null;
  /** Position size as % of one full position (100 = full). */
  sizePercent: number | null;
  outcome: Outcome;
}

const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

export function toAdvancedTrade(t: StatsTrade): AdvancedTrade {
  const pct = finite(t.profitLossPercent);
  const factor = finite(t.normalizationFactor);
  return {
    id: t.id,
    closeDate: t.closeDate ? t.closeDate.slice(0, 10) : null,
    r: finite(t.rRatio),
    pct,
    normPct: finite(t.normalizedMetrics?.profitLossPercent) ?? pct,
    daysHeld: finite(t.daysHeld),
    sizePercent: factor != null ? factor * 100 : null,
    outcome: pct == null || pct === 0 ? "scratch" : pct > 0 ? "win" : "loss",
  };
}

/** Realization order: by close day, then by id so trades closed on the same day keep a stable order. */
export function byCloseDate(a: AdvancedTrade, b: AdvancedTrade): number {
  return (a.closeDate ?? "").localeCompare(b.closeDate ?? "") || String(a.id).localeCompare(String(b.id));
}

// ── Small numeric helpers ────────────────────────────────────────────

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
export const mean = (xs: number[]): number | null => (xs.length > 0 ? sum(xs) / xs.length : null);
const present = (xs: (number | null)[]): number[] => xs.filter((x): x is number => x != null);

// ── Edge (R-based) ───────────────────────────────────────────────────

export interface EdgeStats {
  /** Trades that have an R value — every R statistic is based on these. */
  n: number;
  wins: number;
  losses: number;
  winRate: number;
  lossRate: number;
  avgWinR: number | null;
  /** Negative number, e.g. −0.8. */
  avgLossR: number | null;
  /** Avg win R ÷ |avg loss R|. */
  payoffR: number | null;
  /** Average R per trade. */
  expectancyR: number | null;
  totalR: number;
  /** Sum of winning R ÷ |sum of losing R|. Infinity when there are no losses. */
  profitFactorR: number | null;
  /** Win rate needed to break even at the current payoff: 1 ÷ (1 + payoff). */
  breakEvenWinRate: number | null;
  bestR: number | null;
  worstR: number | null;
}

export function edgeStats(rows: AdvancedTrade[]): EdgeStats {
  const withR = rows.filter((t) => t.r != null);
  const rs = withR.map((t) => t.r!);
  const winR = withR.filter((t) => t.outcome === "win").map((t) => t.r!);
  const lossR = withR.filter((t) => t.outcome === "loss").map((t) => t.r!);
  const avgWinR = mean(winR);
  const avgLossR = mean(lossR);
  const payoffR = avgWinR != null && avgLossR != null && avgLossR < 0 ? avgWinR / -avgLossR : null;
  const grossWin = sum(rs.filter((r) => r > 0));
  const grossLoss = sum(rs.filter((r) => r < 0));
  const n = withR.length;
  return {
    n,
    wins: winR.length,
    losses: lossR.length,
    winRate: n ? winR.length / n : 0,
    lossRate: n ? lossR.length / n : 0,
    avgWinR,
    avgLossR,
    payoffR,
    expectancyR: mean(rs),
    totalR: sum(rs),
    profitFactorR: grossLoss < 0 ? grossWin / -grossLoss : grossWin > 0 ? Infinity : null,
    breakEvenWinRate: payoffR != null && payoffR > 0 ? 1 / (1 + payoffR) : null,
    bestR: rs.length ? Math.max(...rs) : null,
    worstR: rs.length ? Math.min(...rs) : null,
  };
}

// ── Cumulative R ─────────────────────────────────────────────────────

export interface CumulativePoint {
  trade: number;
  date: string | null;
  r: number;
  cumR: number;
}

/** Rows must already be in close-date order. */
export function cumulativeR(rows: AdvancedTrade[]): CumulativePoint[] {
  let cum = 0;
  return rows
    .filter((t) => t.r != null)
    .map((t, i) => {
      cum += t.r!;
      return { trade: i + 1, date: t.closeDate, r: t.r!, cumR: Number(cum.toFixed(3)) };
    });
}

// ── Rolling window: win rate vs break-even over time ─────────────────

export interface RollingPoint {
  /** 1-based trade number (in close-date order) the window ends at. */
  trade: number;
  date: string | null;
  winRate: number;
  breakEvenWinRate: number | null;
  avgR: number;
}

/** The window shrinks to 10 trades for short periods, so a month still gets a trend line. */
export function rollingWindow(n: number): number | null {
  return n >= 40 ? 20 : n >= 15 ? 10 : null;
}

/** Rows must already be in close-date order. */
export function rolling(rows: AdvancedTrade[], window: number): RollingPoint[] {
  const withR = rows.filter((t) => t.r != null);
  const out: RollingPoint[] = [];
  for (let i = window - 1; i < withR.length; i++) {
    const e = edgeStats(withR.slice(i - window + 1, i + 1));
    out.push({
      trade: i + 1,
      date: withR[i].closeDate,
      winRate: e.winRate,
      breakEvenWinRate: e.breakEvenWinRate,
      avgR: e.expectancyR ?? 0,
    });
  }
  return out;
}

// ── Group summaries (position size, holding period) ──────────────────

export interface GroupStats {
  key: string;
  n: number;
  winRate: number;
  avgR: number | null;
  totalR: number;
  avgPct: number | null;
  avgNormPct: number | null;
  avgDays: number | null;
  avgSize: number | null;
}

export function summarize(key: string, rows: AdvancedTrade[]): GroupStats {
  const rs = present(rows.map((t) => t.r));
  return {
    key,
    n: rows.length,
    winRate: rows.length ? rows.filter((t) => t.outcome === "win").length / rows.length : 0,
    avgR: mean(rs),
    totalR: sum(rs),
    avgPct: mean(present(rows.map((t) => t.pct))),
    avgNormPct: mean(present(rows.map((t) => t.normPct))),
    avgDays: mean(present(rows.map((t) => t.daysHeld))),
    avgSize: mean(present(rows.map((t) => t.sizePercent))),
  };
}

interface Bucket {
  key: string;
  label: string;
  hint: string;
  max: number;
}

function bucketize(rows: AdvancedTrade[], buckets: readonly Bucket[], value: (t: AdvancedTrade) => number | null) {
  return buckets
    .map((b, i) => {
      const lo = i === 0 ? -Infinity : buckets[i - 1].max;
      const ts = rows.filter((t) => {
        const v = value(t);
        return v != null && v > lo && v <= b.max;
      });
      return { ...b, ...summarize(b.key, ts) };
    })
    .filter((g) => g.n > 0);
}

/** One full position (sizePercent 100) is 25% of account equity. */
export const FULL_POSITION_EQUITY_SHARE = 0.25;

/** sizePercent (100 = one full position) → % of account equity. */
export const toEquityPct = (sizePercent: number) => sizePercent * FULL_POSITION_EQUITY_SHARE;

// Buckets are cut on sizePercent (100 = one full position); hints are in % of equity.
export const SIZE_BUCKETS = [
  { key: "quarter", label: "¼ size", hint: "≤ 8.25%", max: 33 },
  { key: "half", label: "½ size", hint: "8.5–16.5%", max: 66 },
  { key: "full", label: "Full", hint: "16.75–30%", max: 120 },
  { key: "over", label: "Oversized", hint: "> 30%", max: Infinity },
] as const;

export const sizeGroups = (rows: AdvancedTrade[]) => bucketize(rows, SIZE_BUCKETS, (t) => t.sizePercent);

export const HOLD_BUCKETS = [
  { key: "h0", label: "0–2 days", hint: "quick", max: 2 },
  { key: "h1", label: "3–7 days", hint: "about a week", max: 7 },
  { key: "h2", label: "8–20 days", hint: "a few weeks", max: 20 },
  { key: "h3", label: "21+ days", hint: "let it run", max: Infinity },
] as const;

export const holdGroups = (rows: AdvancedTrade[]) => bucketize(rows, HOLD_BUCKETS, (t) => t.daysHeld);

// ── Distributions ────────────────────────────────────────────────────

export interface HistogramBin {
  label: string;
  lo: number;
  count: number;
}

const R_BIN = 0.5;
const R_MIN = -4;
const R_MAX = 6;

/** 0.5R-wide bins across [−4, 6); the outer bins collect everything beyond them. */
export function rHistogram(rows: AdvancedTrade[]): HistogramBin[] {
  const bins: HistogramBin[] = [];
  for (let lo = R_MIN; lo < R_MAX; lo += R_BIN) {
    const hi = lo + R_BIN;
    const label = lo === R_MIN ? `< ${hi}R` : hi === R_MAX ? `≥ ${lo}R` : `${lo} to ${hi}R`;
    bins.push({ label, lo, count: 0 });
  }
  for (const t of rows) {
    if (t.r == null) continue;
    const clamped = Math.max(R_MIN, Math.min(R_MAX - 1e-9, t.r));
    bins[Math.floor((clamped - R_MIN) / R_BIN)].count++;
  }
  return bins;
}

export interface DrmaBin {
  label: string;
  lo: number;
  /** Sum of signed P/L % of trades whose |P/L %| falls in this bin. */
  pnl: number;
  /** Same for normalized P/L %. */
  norm: number;
  pnlCount: number;
  normCount: number;
}

const DRMA_EDGES = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 60, Infinity];

/**
 * DRMA — distribution of returns by magnitude: trades are grouped by the absolute size of
 * their move (0–2%, 2–4%, …) and each bin shows the net sum of the signed returns inside it,
 * so you can see which size of outcome actually produces (or drains) the result.
 */
export function drmaBins(rows: AdvancedTrade[]): DrmaBin[] {
  const bins: DrmaBin[] = DRMA_EDGES.slice(0, -1).map((lo, i) => {
    const hi = DRMA_EDGES[i + 1];
    return { label: hi === Infinity ? `${lo}%+` : `${lo}–${hi}%`, lo, pnl: 0, norm: 0, pnlCount: 0, normCount: 0 };
  });
  const binOf = (v: number) => {
    const a = Math.abs(v);
    return bins.findIndex((_, i) => a > DRMA_EDGES[i] && a <= DRMA_EDGES[i + 1]);
  };
  for (const t of rows) {
    if (t.pct != null && t.pct !== 0) {
      const b = bins[binOf(t.pct)];
      b.pnl += t.pct;
      b.pnlCount++;
    }
    if (t.normPct != null && t.normPct !== 0) {
      const b = bins[binOf(t.normPct)];
      b.norm += t.normPct;
      b.normCount++;
    }
  }
  return bins
    .map((b) => ({ ...b, pnl: Number(b.pnl.toFixed(2)), norm: Number(b.norm.toFixed(2)) }))
    // Keep the 0–20% core even when empty so the axis doesn't collapse; drop empty tails.
    .filter((b) => b.pnlCount > 0 || b.normCount > 0 || b.lo < 20);
}

// ── Formatting ───────────────────────────────────────────────────────

export function fmtR(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(decimals)}R`;
}

/** Percentage points: 5.3 → "+5.30%". */
export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

/** Fraction: 0.314 → "31.4%". */
export function fmtShare(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${(v * 100).toFixed(decimals)}%`;
}

export function fmtRatio(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  if (v === Infinity) return "∞";
  return Number.isFinite(v) ? v.toFixed(decimals) : "—";
}

/** Tailwind text color for a signed value, matching the rest of the statistics page. */
export function toneClass(v: number | null | undefined, eps = 0): string {
  if (v == null || !Number.isFinite(v) || Math.abs(v) <= eps) return "";
  return v > 0 ? "text-green-600 dark:text-green-500" : "text-red-500";
}
