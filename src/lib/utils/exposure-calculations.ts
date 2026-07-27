// src/lib/utils/exposure-calculations.ts

// Position-sizing convention: a "full" position (normalizationFactor = 1.0)
// equals 25% of total account equity, so 4 full positions = 100% of equity.
export const FULL_POSITION_PCT_OF_EQUITY = 25
export const FULL_POSITIONS_PER_EQUITY = 100 / FULL_POSITION_PCT_OF_EQUITY

// Which unit sizes are displayed in:
// 'equity'   → % of total account equity (full position shows as 25%)
// 'position' → % of a full position (full position shows as 100%)
export type SizeDisplayUnit = 'equity' | 'position'

/** normalizationFactor (1.0 = full position) → % of account equity */
export function normalizationToEquityPct(factor: number): number {
  return factor * FULL_POSITION_PCT_OF_EQUITY
}

/** % of account equity → position units % (100% = full position) */
export function equityPctToPositionPct(equityPct: number): number {
  return equityPct * FULL_POSITIONS_PER_EQUITY
}

/** Format a percentage, dropping trailing zeros: 25 → "25%", 12.5 → "12.5%" */
export function formatPct(value: number, decimals: number = 1): string {
  return `${parseFloat(value.toFixed(decimals))}%`
}

/** Plain-language label for the common position fractions, null for odd sizes */
export function positionFractionLabel(factor: number): string | null {
  switch (Math.round(factor * 100)) {
    case 100: return 'full'
    case 75: return '¾'
    case 50: return 'half'
    case 25: return '¼'
    default: return null
  }
}
