"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function MetricCalculationsInfo() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Metric Calculation Formulas</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible>
          <AccordionItem value="winloss">
            <AccordionTrigger>Win/Loss Ratio</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-sm">
                  The Win/Loss Ratio measures the relationship between your average winning and losing trade percentages.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm">
                    Win/Loss Ratio = Average Win % ÷ |Average Loss %|
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  For example, if your average win is +8% and your average loss is -2%, your Win/Loss Ratio would be 8 ÷ 2 = 4.0.
                </p>
                <p className="text-sm text-muted-foreground">
                  A Win/Loss Ratio greater than 1.0 means your average winning trade is larger than your average losing trade.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="adjusted">
            <AccordionTrigger>Adjusted Win/Loss Ratio</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-sm">
                  The Adjusted Win/Loss Ratio factors in your win rate, providing a more realistic measure of your trading strategy efficiency.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm">
                    Adjusted Win/Loss = (Win Rate × Average Win %) ÷ ((1 - Win Rate) × |Average Loss %|)
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  For example, with a 60% win rate, average win of +10%, and average loss of -5%:
                </p>
                <p className="text-sm text-muted-foreground">
                  Adjusted Win/Loss = (0.6 × 10) ÷ ((1 - 0.6) × 5) = 6 ÷ 2 = 3.0
                </p>
                <p className="text-sm text-muted-foreground">
                  An Adjusted Win/Loss Ratio greater than 1.0 indicates a profitable trading system when considering both win rate and win/loss sizes.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="rratio">
            <AccordionTrigger>R-Ratio</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-sm">
                  The R-Ratio (also known as R-Multiple) measures your actual profit or loss relative to your initial risk.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm">
                    R-Ratio = Profit/Loss Amount ÷ Initial Risk Amount
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  If your initial risk was $100 and you made $150, your R-Ratio would be 1.5R. If you lost $50, your R-Ratio would be -0.5R.
                </p>
                <p className="text-sm text-muted-foreground">
                  The Average R-Ratio is the mean of all your individual trade R-Ratios. Values greater than 1.0 mean that, on average, you're making more than you're risking.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="profitfactor">
            <AccordionTrigger>Profit Factor</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-sm">
                  Profit Factor measures the ratio between all your gross profits and gross losses.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm">
                    Profit Factor = Total Gross Profits ÷ Total Gross Losses
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  For example, if you made $5,000 in winning trades and lost $2,000 in losing trades, your Profit Factor would be 2.5.
                </p>
                <p className="text-sm text-muted-foreground">
                  A Profit Factor greater than 1.0 indicates profitable trading, with higher values suggesting more efficient strategies.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="expectancy">
            <AccordionTrigger>Expectancy</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-sm">
                  Expectancy represents the average percentage gain or loss you can expect per trade over time.
                </p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm">
                    Expectancy = (Win Rate × Average Win %) + ((1 - Win Rate) × Average Loss %)
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  With a 40% win rate, average win of +15%, and average loss of -5%:
                </p>
                <p className="text-sm text-muted-foreground">
                  Expectancy = (0.4 × 15) + ((1 - 0.4) × (-5)) = 6 + (-3) = +3%
                </p>
                <p className="text-sm text-muted-foreground">
                  A positive expectancy indicates a profitable trading strategy over time.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="normalized">
            <AccordionTrigger>Normalized Metrics</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <p className="text-sm">
                  Normalized metrics adjust your trading statistics to what they would be if all trades were taken with a full position size (defined as 25% of equity).
                </p>
                <Separator className="my-2" />
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-mono text-sm">
                    Normalization Factor = Actual Position Size ÷ Target Position Size
                  </p>
                  <p className="font-mono text-sm mt-2">
                    Normalized Profit/Loss % = Actual Profit/Loss % × Normalization Factor
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Examples:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>
                    Half position (50%) with 10% profit becomes 5% normalized (10% × 0.5)
                  </li>
                  <li>
                    Double position (200%) with 3% loss becomes 6% loss normalized (3% × 2.0)
                  </li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Normalized metrics provide a clearer picture of your trading strategy's effectiveness by accounting for position sizing variations.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}