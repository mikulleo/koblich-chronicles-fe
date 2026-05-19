import type { SplitEvent } from '@/lib/types/candlestick'

/**
 * Back-adjust a historical price to match split-adjusted chart data.
 *
 * Yahoo Finance (and most modern chart sources) return OHLC values that are
 * already split-adjusted, so a price recorded as $200 before a 2:1 split now
 * shows as $100 on the chart. Stored trade prices in our DB are the original
 * (unadjusted) values from the time of trade — we adjust them here so the
 * Trading Gym comments line up with the chart.
 *
 * For each split AFTER the price's date: adjusted = original × denominator / numerator.
 * (2:1 split → numerator=2, denominator=1 → divide by 2.)
 */
export function adjustPriceForSplits(
  price: number,
  priceDate: string,
  splits: SplitEvent[],
): number {
  if (!price || !splits.length) return price
  const dateKey = priceDate.split('T')[0]
  let factor = 1
  for (const s of splits) {
    if (!s.numerator || !s.denominator) continue
    if (s.date.split('T')[0] > dateKey) {
      factor *= s.denominator / s.numerator
    }
  }
  return price * factor
}
