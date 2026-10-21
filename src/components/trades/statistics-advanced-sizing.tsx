// src/components/trades/statistics-advanced-sizing.tsx
// Sizing tab: results by position size, in R and % only (no $).

"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  AdvancedTrade,
  MIN_SAMPLE,
  SIZE_BUCKETS,
  fmtPct,
  fmtR,
  fmtShare,
  sizeGroups,
  toEquityPct,
  toneClass,
} from "@/lib/utils/advanced-stats";
import { DivergingBar, Explainer, SmallSample } from "./statistics-advanced-ui";

export function AdvancedSizingTab({ rows }: { rows: AdvancedTrade[] }) {
  const groups = useMemo(() => sizeGroups(rows), [rows]);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No trades with a recorded position size in this period.
      </p>
    );
  }

  const meta = (key: string) => SIZE_BUCKETS.find((b) => b.key === key)!;
  const maxAbsR = Math.max(...groups.map((g) => Math.abs(g.avgR ?? 0)), 0.01);
  const best = [...groups].filter((g) => g.avgR != null).sort((a, b) => b.avgR! - a.avgR!)[0];
  const worst = [...groups].filter((g) => g.avgR != null).sort((a, b) => a.avgR! - b.avgR!)[0];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Results by position size</h4>
        <p className="text-sm text-muted-foreground">
          {best && worst && best !== worst ? (
            <>
              <b className="text-foreground">{meta(best.key).label}</b> trades averaged{" "}
              <span className={cn("font-semibold", toneClass(best.avgR))}>{fmtR(best.avgR)}</span> per trade,{" "}
              <b className="text-foreground">{meta(worst.key).label.toLowerCase()}</b> trades{" "}
              <span className={cn("font-semibold", toneClass(worst.avgR))}>{fmtR(worst.avgR)}</span>.
            </>
          ) : (
            "How each position size worked out."
          )}{" "}
          Size is shown as % of account equity — one full position is 25%.
        </p>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win %</TableHead>
                <TableHead>Avg R</TableHead>
                <TableHead className="text-right">Total R</TableHead>
                <TableHead className="text-right">Avg P/L %</TableHead>
                <TableHead className="text-right">Avg Norm. P/L %</TableHead>
                <TableHead className="text-right">Avg size (% equity)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.key}>
                  <TableCell className="whitespace-nowrap">
                    <span className="font-medium">{meta(g.key).label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{meta(g.key).hint}</span>
                    {g.n < MIN_SAMPLE && <SmallSample />}
                  </TableCell>
                  <TableCell className="text-right">{g.n}</TableCell>
                  <TableCell className="text-right">{fmtShare(g.winRate)}</TableCell>
                  <TableCell>
                    <DivergingBar value={g.avgR} max={maxAbsR} label={fmtR(g.avgR)} />
                  </TableCell>
                  <TableCell className={cn("text-right font-mono", toneClass(g.totalR))}>{fmtR(g.totalR)}</TableCell>
                  <TableCell className={cn("text-right font-mono", toneClass(g.avgPct))}>{fmtPct(g.avgPct)}</TableCell>
                  <TableCell className={cn("text-right font-mono", toneClass(g.avgNormPct))}>
                    {fmtPct(g.avgNormPct)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {g.avgSize == null ? "—" : `${toEquityPct(g.avgSize).toFixed(1)}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Explainer title="How to read the sizing statistics">
        <p>
          <b className="text-foreground">Avg R</b> measures the quality of the trades in each size group — each trade
          against its own risk, so position size doesn’t affect it. <b className="text-foreground">Avg P/L %</b> is the
          price move captured, and <b className="text-foreground">Avg Norm. P/L %</b> scales that move by the position
          size (a +10% trade at half size counts as +5% of a full position), i.e. what the trades really contributed.
        </p>
        <p>
          If bigger sizes show better Avg R, conviction is well calibrated — the biggest bets are the best trades. If a
          size group shows a good Avg Norm. P/L % but a poor Avg R, a few large trades may be carrying it. Groups marked
          “small sample” have fewer than {MIN_SAMPLE} trades and can easily be noise.
        </p>
      </Explainer>
    </div>
  );
}
