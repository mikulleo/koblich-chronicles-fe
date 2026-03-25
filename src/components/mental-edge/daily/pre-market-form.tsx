"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RatingSlider } from "./rating-slider";
import { Sun, Check } from "lucide-react";
import type { ContextFlag, Intention, EmotionalTrap } from "@/lib/types";

const CONTEXT_FLAGS: { value: ContextFlag; label: string }[] = [
  { value: "recent_loss", label: "Recent Loss" },
  { value: "recent_win", label: "Recent Win" },
  { value: "winning_streak", label: "Winning Streak" },
  { value: "losing_streak", label: "Losing Streak" },
  { value: "slept_poorly", label: "Slept Poorly" },
  { value: "personal_stress", label: "Personal Stress" },
  { value: "market_volatile", label: "Market Volatile" },
  { value: "account_at_high", label: "Account at High" },
  { value: "account_at_low", label: "Account at Low" },
  { value: "big_news_day", label: "Big News Day" },
  { value: "end_of_week", label: "End of Week" },
  { value: "end_of_month", label: "End of Month" },
];

const INTENTIONS: { value: Intention; label: string }[] = [
  { value: "avoid_forcing", label: "Avoid Forcing Trades" },
  { value: "stay_patient", label: "Stay Patient" },
  { value: "stick_to_plan", label: "Stick to Plan" },
  { value: "manage_risk", label: "Manage Risk" },
  { value: "avoid_fomo", label: "Avoid FOMO" },
  { value: "stay_calm", label: "Stay Calm" },
  { value: "be_selective", label: "Be Selective" },
  { value: "protect_gains", label: "Protect Gains" },
];

const BIGGEST_RISKS: { value: EmotionalTrap; label: string }[] = [
  { value: "overtrading", label: "Overtrading" },
  { value: "fomo_entries", label: "FOMO Entries" },
  { value: "revenge_trading", label: "Revenge Trading" },
  { value: "moving_stops", label: "Moving Stops" },
  { value: "oversizing", label: "Oversizing" },
  { value: "not_taking_setups", label: "Not Taking Setups" },
  { value: "chasing", label: "Chasing" },
  { value: "impatience", label: "Impatience" },
];

interface PreMarketFormProps {
  initialData?: {
    ratings?: Record<string, number>;
    contextFlags?: ContextFlag[];
    intentions?: Intention[];
    biggestRisk?: EmotionalTrap;
  };
  onSubmit: (data: {
    completedAt: string;
    ratings: Record<string, number>;
    contextFlags: ContextFlag[];
    intentions: Intention[];
    biggestRisk: EmotionalTrap | null;
  }) => void;
  isSubmitting?: boolean;
  isCompleted?: boolean;
}

export function PreMarketForm({ initialData, onSubmit, isSubmitting, isCompleted }: PreMarketFormProps) {
  const [ratings, setRatings] = useState({
    focus: initialData?.ratings?.focus ?? 3,
    patience: initialData?.ratings?.patience ?? 3,
    confidence: initialData?.ratings?.confidence ?? 3,
    calmness: initialData?.ratings?.calmness ?? 3,
    urgencyToMakeMoney: initialData?.ratings?.urgencyToMakeMoney ?? 1,
    fomoLevel: initialData?.ratings?.fomoLevel ?? 1,
  });
  const [contextFlags, setContextFlags] = useState<ContextFlag[]>(initialData?.contextFlags || []);
  const [intentions, setIntentions] = useState<Intention[]>(initialData?.intentions || []);
  const [biggestRisk, setBiggestRisk] = useState<EmotionalTrap | null>(initialData?.biggestRisk || null);

  const toggleFlag = (flag: ContextFlag) => {
    setContextFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  const toggleIntention = (intention: Intention) => {
    setIntentions((prev) =>
      prev.includes(intention) ? prev.filter((i) => i !== intention) : [...prev, intention]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      completedAt: new Date().toISOString(),
      ratings,
      contextFlags,
      intentions,
      biggestRisk,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-yellow-500" />
          Pre-Market Check-In
        </CardTitle>
        <CardDescription>
          Assess your mental state before the market opens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            Pre-market check-in completed
          </div>
        )}

        {/* Positive Ratings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mental State</h3>
          <RatingSlider
            label="Focus"
            description="How focused and sharp do you feel?"
            value={ratings.focus}
            onChange={(v) => setRatings((r) => ({ ...r, focus: v }))}
            labels={["Scattered", "Laser-focused"]}
          />
          <RatingSlider
            label="Patience"
            description="How patient are you feeling?"
            value={ratings.patience}
            onChange={(v) => setRatings((r) => ({ ...r, patience: v }))}
            labels={["Restless", "Very patient"]}
          />
          <RatingSlider
            label="Confidence"
            description="How confident in your process?"
            value={ratings.confidence}
            onChange={(v) => setRatings((r) => ({ ...r, confidence: v }))}
            labels={["Uncertain", "Very confident"]}
          />
          <RatingSlider
            label="Calmness"
            description="How calm and grounded do you feel?"
            value={ratings.calmness}
            onChange={(v) => setRatings((r) => ({ ...r, calmness: v }))}
            labels={["Anxious", "Very calm"]}
          />
        </div>

        <Separator />

        {/* Warning Ratings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Warning Signals</h3>
          <RatingSlider
            label="Urgency to Make Money"
            description="How strong is your need to profit today?"
            value={ratings.urgencyToMakeMoney}
            onChange={(v) => setRatings((r) => ({ ...r, urgencyToMakeMoney: v }))}
            labels={["None", "Intense"]}
            inverted
          />
          <RatingSlider
            label="FOMO Level"
            description="How much fear of missing out are you feeling?"
            value={ratings.fomoLevel}
            onChange={(v) => setRatings((r) => ({ ...r, fomoLevel: v }))}
            labels={["None", "Intense"]}
            inverted
          />
        </div>

        <Separator />

        {/* Context Flags */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Current Context</h3>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_FLAGS.map((flag) => (
              <Badge
                key={flag.value}
                variant={contextFlags.includes(flag.value) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleFlag(flag.value)}
              >
                {flag.label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Intentions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Today&apos;s Intentions</h3>
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map((intention) => (
              <Badge
                key={intention.value}
                variant={intentions.includes(intention.value) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleIntention(intention.value)}
              >
                {intention.label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Biggest Risk */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Biggest Risk Today</h3>
          <div className="flex flex-wrap gap-2">
            {BIGGEST_RISKS.map((risk) => (
              <Badge
                key={risk.value}
                variant={biggestRisk === risk.value ? "destructive" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => setBiggestRisk(biggestRisk === risk.value ? null : risk.value)}
              >
                {risk.label}
              </Badge>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Saving..." : isCompleted ? "Update Pre-Market Check-In" : "Complete Pre-Market Check-In"}
        </Button>
      </CardContent>
    </Card>
  );
}
