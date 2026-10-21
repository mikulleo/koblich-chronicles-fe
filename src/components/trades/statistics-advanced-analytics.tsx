// src/components/trades/statistics-advanced-analytics.tsx
// Analytics tab: cumulative R, average R per trade, win rate vs break-even win rate.

"use client";

import React, { useMemo } from "react";
import { Equal, InfoIcon, Minus, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartColors, tooltipStyle as makeTooltipStyle } from "@/hooks/use-chart-colors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  AdvancedTrade,
  EdgeStats,
  RollingPoint,
  cumulativeR,
  edgeStats,
  fmtR,
  fmtRatio,
  fmtShare,
  rolling,
  rollingWindow,
  toneClass,
} from "@/lib/utils/advanced-stats";
import { ChartBlock, MetricTile } from "./statistics-advanced-ui";

const fmtDate = (d: string | null) => (d ? format(parseISO(d), "d MMM yyyy") : "");

// ── The edge equation: win% × avg win − loss% × avg loss = average R per trade ──

function Token({ label, value, className, big }: { label: string; value: string; className?: string; big?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-muted/30 px-4 py-3 text-center", big && "min-w-[140px] border-primary/40")}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-bold", big ? "text-2xl" : "text-xl", className)}>{value}</div>
    </div>
  );
}

function Op({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center px-1 text-muted-foreground" aria-hidden>
      {children}
    </div>
  );
}

function EdgeEquation({ e }: { e: EdgeStats }) {
  return (
    <div className="flex flex-wrap items-stretch justify-center gap-2">
      <Token label="Win rate" value={fmtShare(e.winRate)} />
      <Op><X className="h-4 w-4" /></Op>
      <Token label="Avg win" value={fmtR(e.avgWinR)} className="text-green-600 dark:text-green-500" />
      <Op><Minus className="h-4 w-4" /></Op>
      <Token label="Loss rate" value={fmtShare(e.lossRate)} />
      <Op><X className="h-4 w-4" /></Op>
      <Token
        label="Avg loss"
        value={e.avgLossR == null ? "—" : `${Math.abs(e.avgLossR).toFixed(2)}R`}
        className="text-red-500"
      />
      <Op><Equal className="h-4 w-4" /></Op>
      <Token label="Avg R per trade" value={fmtR(e.expectancyR)} className={toneClass(e.expectancyR, 0.005)} big />
    </div>
  );
}

// ── Win rate vs break-even ──────────────────────────────────────────

function BreakEvenMeter({ e }: { e: EdgeStats }) {
  if (e.breakEvenWinRate == null) {
    return (
      <p className="text-sm text-muted-foreground">
        {e.losses === 0
          ? "No losing trades in this period — there is no break-even win rate to compare against."
          : "No winning trades in this period — the break-even win rate can't be calculated."}
      </p>
    );
  }
  const ahead = e.winRate >= e.breakEvenWinRate;
  const gap = Math.abs(e.winRate - e.breakEvenWinRate);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          You win <b>{fmtShare(e.winRate)}</b> of trades. With a payoff of <b>{fmtRatio(e.payoffR)}×</b> you need at
          least <b>{fmtShare(e.breakEvenWinRate)}</b> to break even.
        </span>
        <span className={cn("text-sm font-semibold", ahead ? "text-green-600 dark:text-green-500" : "text-red-500")}>
          {ahead ? "▲" : "▼"} {(gap * 100).toFixed(1)} pts {ahead ? "above" : "below"} break-even
        </span>
      </div>
      <div className={cn("relative h-3 rounded-full", ahead ? "bg-green-500/15" : "bg-red-500/15")}>
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", ahead ? "bg-green-500" : "bg-red-500")}
          style={{ width: `${e.winRate * 100}%` }}
        />
        <div
          className="absolute -top-1.5 -bottom-1.5 w-0.5 rounded bg-foreground"
          style={{ left: `calc(${e.breakEvenWinRate * 100}% - 1px)` }}
          title="Break-even win rate"
        />
      </div>
      <div className="relative h-4 text-[11px] text-muted-foreground">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2 text-foreground" style={{ left: `${e.breakEvenWinRate * 100}%` }}>
          break-even {fmtShare(e.breakEvenWinRate, 0)}
        </span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}

/** Compact "how to read" for the break-even comparison, opened from the chart it explains. */
function BreakEvenHelp({ e, windowSize }: { e: EdgeStats; windowSize: number | null }) {
  const be = e.breakEvenWinRate;
  const ahead = be != null && e.winRate >= be;
  const gapPts = be != null ? (Math.abs(e.winRate - be) * 100).toFixed(1) : null;
  const chartColors = useChartColors();

  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        <InfoIcon className="h-3.5 w-3.5" />
        How to read
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] space-y-2 text-xs text-muted-foreground">
        {windowSize ? (
          <ul className="space-y-1.5">
            <li className="flex gap-2">
              <span className="mt-1.5 h-0.5 w-4 shrink-0 rounded" style={{ background: chartColors.primary }} />
              <span>
                <b className="text-foreground">Solid line</b> — your actual win rate over the last {windowSize} closed
                trades.
              </span>
            </li>
            <li className="flex gap-2">
              <span
                className="mt-1.5 h-0 w-4 shrink-0 border-t-2 border-dashed"
                style={{ borderColor: chartColors.text }}
              />
              <span>
                <b className="text-foreground">Dashed line</b> — the win rate those same {windowSize} trades needed
                just to break even, given how big their winners were compared with their losers.
              </span>
            </li>
          </ul>
        ) : (
          <p>
            The bar is your win rate; the marker is the <b className="text-foreground">break-even win rate</b> — the win
            rate needed just to break even, given how big your winners are compared with your losers.
          </p>
        )}
        <p>
          <b className="text-foreground">{windowSize ? "Solid above dashed" : "Bar past the marker"}</b> = that
          stretch made money; below it = it lost money. The gap is your margin of safety.
        </p>
        <p>
          Break-even win rate = 1 ÷ (1 + payoff), where payoff = avg win R ÷ |avg loss R|. A 1× payoff needs 50%, 2×
          needs 33%, 3× needs 25%. Cutting winners early lowers the payoff, so the break-even line rises.
        </p>
        {be != null && gapPts != null && (
          <p>
            <b className="text-foreground">In this period:</b> payoff {fmtRatio(e.payoffR)}× → break-even{" "}
            {fmtShare(be)}. Actual win rate {fmtShare(e.winRate)}, {gapPts} pts {ahead ? "above" : "below"}.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Tab ─────────────────────────────────────────────────────────────

export function AdvancedAnalyticsTab({ rows }: { rows: AdvancedTrade[] }) {
  const chartColors = useChartColors();
  const ttStyle = makeTooltipStyle(chartColors);

  const e = useMemo(() => edgeStats(rows), [rows]);
  const cumulative = useMemo(() => cumulativeR(rows), [rows]);
  const windowSize = rollingWindow(e.n);
  const rollingData = useMemo(() => (windowSize ? rolling(rows, windowSize) : []), [rows, windowSize]);
  const missingR = rows.length - e.n;

  if (e.n === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No trades with an R-multiple in this period.</p>;
  }

  const peak = cumulative.reduce((m, p) => Math.max(m, p.cumR), 0);
  const maxDrawdownR = cumulative.reduce(
    (acc, p) => {
      const top = Math.max(acc.top, p.cumR);
      return { top, dd: Math.min(acc.dd, p.cumR - top) };
    },
    { top: 0, dd: 0 },
  ).dd;

  const rollingTip = (fmt: (v: number) => string, name: string) => (
    <RechartsTooltip
      contentStyle={ttStyle}
      labelFormatter={(_, p) => {
        const pt = p?.[0]?.payload as RollingPoint | undefined;
        return pt && windowSize ? `Trades ${pt.trade - windowSize + 1}–${pt.trade}${pt.date ? ` · ${fmtDate(pt.date)}` : ""}` : "";
      }}
      formatter={(v, key) => [fmt(Number(v)), key === "breakEvenWinRate" ? "Break-even" : name]}
    />
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile
          title="Cumulative R"
          value={fmtR(e.totalR)}
          valueClassName={toneClass(e.totalR)}
          sub={`${e.n} trades · peak ${fmtR(peak)}`}
          info="Sum of the R-multiples of all trades in the period. 1R = the amount risked on a trade (entry to initial stop)."
        />
        <MetricTile
          title="Average R per trade"
          value={fmtR(e.expectancyR)}
          valueClassName={toneClass(e.expectancyR, 0.005)}
          sub={`best ${fmtR(e.bestR)} · worst ${fmtR(e.worstR)}`}
          info="Expectancy in R: what an average trade earns relative to its risk. Above 0R = positive edge."
        />
        <MetricTile
          title="Profit factor (R)"
          value={fmtRatio(e.profitFactorR)}
          valueClassName={e.profitFactorR == null ? "" : e.profitFactorR >= 1 ? "text-green-600 dark:text-green-500" : "text-red-500"}
          sub={`payoff ${fmtRatio(e.payoffR)}×`}
          info="Sum of winning R ÷ |sum of losing R|. Above 1 = more R won than lost. Measured in R, so position size doesn't affect it."
        />
        <MetricTile
          title="Max drawdown (R)"
          value={fmtR(maxDrawdownR)}
          valueClassName={maxDrawdownR < 0 ? "text-red-500" : ""}
          sub="deepest drop from a cumulative-R peak"
          info="Largest fall of the cumulative R curve from its previous high within the period."
        />
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">The edge equation</h4>
        <p className="text-xs text-muted-foreground">
          Average R per trade = win rate × average win − loss rate × average loss. Improve any input and the result moves.
        </p>
        <EdgeEquation e={e} />
        {missingR > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {missingR} trade{missingR === 1 ? "" : "s"} without an R-multiple {missingR === 1 ? "is" : "are"} left out of
            the R statistics.
          </p>
        )}
      </div>

      <ChartBlock title="Cumulative R" description="Running total of R in the order trades were closed">
        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulative} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumRGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <ReferenceLine y={0} stroke={chartColors.text} strokeOpacity={0.5} />
              <XAxis dataKey="trade" tick={{ fontSize: 11, fill: chartColors.text }} />
              <YAxis width={48} tick={{ fontSize: 11, fill: chartColors.text }} tickFormatter={(v) => `${v}R`} />
              <RechartsTooltip
                contentStyle={ttStyle}
                labelFormatter={(l, p) => {
                  const d = p?.[0]?.payload?.date as string | null | undefined;
                  return `Trade #${l}${d ? ` · closed ${fmtDate(d)}` : ""}`;
                }}
                formatter={(v, _name, item) => [
                  `${fmtR(Number(v))} (this trade ${fmtR(item?.payload?.r)})`,
                  "Cumulative R",
                ]}
              />
              <Area
                type="monotone"
                dataKey="cumR"
                stroke={chartColors.primary}
                strokeWidth={2}
                fill="url(#cumRGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartBlock>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Win rate vs break-even</h4>
        <div className="rounded-lg border p-4">
          <BreakEvenMeter e={e} />
          {!windowSize && e.breakEvenWinRate != null && (
            <div className="mt-2 flex justify-end">
              <BreakEvenHelp e={e} windowSize={null} />
            </div>
          )}
        </div>
      </div>

      {windowSize ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartBlock
            title={`Rolling ${windowSize}-trade win rate vs break-even`}
            description="Solid line above the dashed line = profitable stretch"
          >
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rollingData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis dataKey="trade" tick={{ fontSize: 10, fill: chartColors.text }} />
                  <YAxis
                    width={40}
                    domain={[0, 1]}
                    tick={{ fontSize: 10, fill: chartColors.text }}
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  />
                  {rollingTip((v) => fmtShare(v), "Win rate")}
                  <Line
                    type="monotone"
                    dataKey="breakEvenWinRate"
                    stroke={chartColors.text}
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="winRate"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded" style={{ background: chartColors.primary }} />
                Win rate
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: chartColors.text }} />
                Break-even win rate
              </span>
              <span className="ml-auto">
                <BreakEvenHelp e={e} windowSize={windowSize} />
              </span>
            </div>
          </ChartBlock>
          <ChartBlock title={`Rolling ${windowSize}-trade average R`} description="Above 0R = positive expectancy">
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rollingData} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <ReferenceLine y={0} stroke={chartColors.text} strokeOpacity={0.5} />
                  <XAxis dataKey="trade" tick={{ fontSize: 10, fill: chartColors.text }} />
                  <YAxis
                    width={44}
                    tick={{ fontSize: 10, fill: chartColors.text }}
                    tickFormatter={(v) => `${Number(v).toFixed(1)}R`}
                  />
                  {rollingTip((v) => fmtR(v), "Avg R")}
                  <Line
                    type="monotone"
                    dataKey="avgR"
                    stroke={chartColors.primary}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBlock>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Rolling charts need at least 15 trades with an R-multiple — select a longer period to see how the edge changes
          over time.
        </p>
      )}
    </div>
  );
}
