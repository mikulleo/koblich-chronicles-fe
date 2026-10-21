// src/components/trades/statistics-advanced-distribution.tsx
// Distribution tab: R-multiple distribution, DRMA curves, holding period vs P/L.

"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChartColors, tooltipStyle as makeTooltipStyle } from "@/hooks/use-chart-colors";
import { cn } from "@/lib/utils";
import {
  AdvancedTrade,
  DrmaBin,
  HOLD_BUCKETS,
  HistogramBin,
  MIN_SAMPLE,
  drmaBins,
  fmtPct,
  fmtR,
  fmtShare,
  holdGroups,
  rHistogram,
  toneClass,
} from "@/lib/utils/advanced-stats";
import { ChartBlock, DivergingBar, Explainer, SmallSample } from "./statistics-advanced-ui";

// Same bar look as the Trade Distribution Histogram, so both distributions read alike.
const HIST_GAIN = "#16a34a";
const HIST_LOSS = "#dc2626";
const HIST_STROKE = "#374151";

function RHistogramTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { payload: HistogramBin }[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const bin = payload[0].payload;
  return (
    <div className="bg-background border rounded-lg p-3 shadow-lg">
      <p className="font-semibold">{bin.label}</p>
      <p className="text-primary">Count: {bin.count} trades</p>
      <p className="text-muted-foreground text-sm">
        {total > 0 ? ((bin.count / total) * 100).toFixed(1) : 0}% of trades with an R-multiple
      </p>
    </div>
  );
}

function DrmaChart({
  data,
  dataKey,
  countKey,
  name,
  pos,
  neg,
}: {
  data: DrmaBin[];
  dataKey: "pnl" | "norm";
  countKey: "pnlCount" | "normCount";
  name: string;
  pos: string;
  neg: string;
}) {
  const chartColors = useChartColors();
  return (
    <div className="w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 10, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <ReferenceLine y={0} stroke={chartColors.text} strokeOpacity={0.5} />
          <XAxis
            dataKey="label"
            interval={0}
            angle={-45}
            textAnchor="end"
            height={48}
            tick={{ fontSize: 10, fill: chartColors.text }}
          />
          <YAxis width={44} tick={{ fontSize: 10, fill: chartColors.text }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} />
          <RechartsTooltip
            contentStyle={makeTooltipStyle(chartColors)}
            labelFormatter={(l) => `|move| ${l}`}
            formatter={(v: number, _n, item) => [`${fmtPct(v)} · ${item?.payload?.[countKey] ?? 0} trades`, name]}
          />
          <Bar dataKey={dataKey} maxBarSize={24} radius={[3, 3, 3, 3]}>
            {data.map((b, i) => (
              <Cell key={i} fill={b[dataKey] >= 0 ? pos : neg} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdvancedDistributionTab({
  rows,
  viewMode,
}: {
  rows: AdvancedTrade[];
  viewMode: "standard" | "normalized";
}) {
  const chartColors = useChartColors();
  const ttStyle = makeTooltipStyle(chartColors);
  const isNormalized = viewMode === "normalized";

  const rBins = useMemo(() => rHistogram(rows), [rows]);
  const drma = useMemo(() => drmaBins(rows), [rows]);
  const holdGroupsData = useMemo(() => holdGroups(rows), [rows]);
  const scatter = useMemo(
    () =>
      rows
        .map((t) => ({ held: t.daysHeld, pnl: isNormalized ? t.normPct : t.pct, r: t.r, date: t.closeDate }))
        .filter((p): p is { held: number; pnl: number; r: number | null; date: string | null } => p.held != null && p.pnl != null),
    [rows, isNormalized],
  );

  const rCount = rBins.reduce((s, b) => s + b.count, 0);
  const pctLabel = isNormalized ? "Normalized P/L %" : "P/L %";
  const holdMeta = (key: string) => HOLD_BUCKETS.find((b) => b.key === key)!;
  const maxAbsR = Math.max(...holdGroupsData.map((g) => Math.abs(g.avgR ?? 0)), 0.01);

  // The bins that carry the result: largest positive and most negative net contribution
  const topDrma = [...drma].sort((a, b) => b.pnl - a.pnl)[0];
  const bottomDrma = [...drma].sort((a, b) => a.pnl - b.pnl)[0];

  return (
    <div className="space-y-6">
      {/* R-multiple distribution */}
      <ChartBlock
        title="R-multiple distribution"
        description={`How many trades ended in each 0.5R band · ${rCount} trades with an R-multiple. Red bars = losses, green bars = gains.`}
      >
        <div className="w-full h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rBins} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis
                dataKey="label"
                interval={0}
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fontSize: 10, fill: chartColors.text }}
              />
              <YAxis
                allowDecimals={false}
                label={{ value: "Number of Trades", angle: -90, position: "insideLeft", fill: chartColors.text }}
                tick={{ fontSize: 12, fill: chartColors.text }}
              />
              <RechartsTooltip content={<RHistogramTooltip total={rCount} />} />
              <Bar dataKey="count" name="Number of Trades" radius={[2, 2, 0, 0]}>
                {rBins.map((b, i) => (
                  <Cell key={i} fill={b.lo >= 0 ? HIST_GAIN : HIST_LOSS} stroke={HIST_STROKE} strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          A healthy trend-following distribution has most losses clustered just under 0R to −1R (stops respected) and a
          long right tail of a few big winners. Bars beyond −1R mean losses ran past the initial stop.
        </p>
      </ChartBlock>

      {/* DRMA curves */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartBlock title="DRMA — P/L %" description="Net sum of signed returns per |P/L %| band">
            <DrmaChart
              data={drma}
              dataKey="pnl"
              countKey="pnlCount"
              name="Net P/L %"
              pos={chartColors.success}
              neg={chartColors.danger}
            />
          </ChartBlock>
          <ChartBlock title="DRMA — Normalized P/L %" description="Same, with each return scaled by position size">
            <DrmaChart
              data={drma}
              dataKey="norm"
              countKey="normCount"
              name="Net Norm. P/L %"
              pos={chartColors.primary}
              neg={chartColors.warning}
            />
          </ChartBlock>
        </div>
        <Explainer title="How to read the DRMA charts">
          <p>
            DRMA (distribution of returns by magnitude) groups trades by how big their move was — regardless of
            direction — and adds up the signed returns in each band. A +12% winner and a −11% loser both land in the
            10–12% band and largely cancel each other out.
          </p>
          <p>
            It shows <i>where the result comes from</i>. Ideally the small bands (0–6%) are slightly negative — many
            small, controlled losses — and the larger bands are clearly positive, carried by a few big winners. Red bars
            in the large bands mean big losses are eating the edge. The normalized chart scales every return by position
            size, so it shows which moves really mattered at the size they were traded.
          </p>
          {topDrma && bottomDrma && topDrma.pnl > 0 && bottomDrma.pnl < 0 && (
            <p>
              <b className="text-foreground">In this period:</b> the {topDrma.label} band contributed the most, the{" "}
              {bottomDrma.label} band cost the most.
            </p>
          )}
        </Explainer>
      </div>

      {/* Holding period vs P/L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartBlock title={`Holding period vs ${pctLabel}`} description="Each dot is one trade">
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <ReferenceLine y={0} stroke={chartColors.text} strokeOpacity={0.5} />
                <XAxis
                  dataKey="held"
                  type="number"
                  name="Days held"
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  label={{ value: "Days held", position: "insideBottom", offset: -10, fill: chartColors.text, fontSize: 11 }}
                />
                <YAxis
                  dataKey="pnl"
                  type="number"
                  name={pctLabel}
                  width={44}
                  tick={{ fontSize: 11, fill: chartColors.text }}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <ZAxis range={[40, 40]} />
                <RechartsTooltip
                  contentStyle={ttStyle}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, name: string) => [name === "Days held" ? `${v} days` : fmtPct(v), name]}
                />
                <Scatter data={scatter} isAnimationActive={false}>
                  {scatter.map((p, i) => (
                    <Cell
                      key={i}
                      fill={p.pnl >= 0 ? chartColors.success : chartColors.danger}
                      fillOpacity={0.75}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </ChartBlock>

        <ChartBlock title="Results by holding period" description="Do winners get held longer than losers?">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Held</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win %</TableHead>
                  <TableHead>Avg R</TableHead>
                  <TableHead className="text-right">Avg {isNormalized ? "Norm. " : ""}P/L %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdGroupsData.map((g) => (
                  <TableRow key={g.key}>
                    <TableCell className="whitespace-nowrap">
                      <span className="font-medium">{holdMeta(g.key).label}</span>
                      {g.n < MIN_SAMPLE && <SmallSample />}
                    </TableCell>
                    <TableCell className="text-right">{g.n}</TableCell>
                    <TableCell className="text-right">{fmtShare(g.winRate)}</TableCell>
                    <TableCell>
                      <DivergingBar value={g.avgR} max={maxAbsR} label={fmtR(g.avgR)} />
                    </TableCell>
                    <TableCell
                      className={cn("text-right font-mono", toneClass(isNormalized ? g.avgNormPct : g.avgPct))}
                    >
                      {fmtPct(isNormalized ? g.avgNormPct : g.avgPct)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Cutting losers quickly and letting winners run shows up as red dots clustered on the left and green dots
            spreading to the right. Losses held for weeks usually mean a stop that wasn’t honored.
          </p>
        </ChartBlock>
      </div>
    </div>
  );
}
