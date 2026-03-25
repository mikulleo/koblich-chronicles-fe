"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RatingSlider } from "./rating-slider";
import { Moon, Check } from "lucide-react";
import type { EmotionalTrap } from "@/lib/types";

const EMOTIONAL_TRAPS: { value: EmotionalTrap; label: string }[] = [
  { value: "overtrading", label: "Overtrading" },
  { value: "fomo_entries", label: "FOMO Entries" },
  { value: "revenge_trading", label: "Revenge Trading" },
  { value: "moving_stops", label: "Moving Stops" },
  { value: "oversizing", label: "Oversizing" },
  { value: "not_taking_setups", label: "Not Taking Setups" },
  { value: "chasing", label: "Chasing" },
  { value: "impatience", label: "Impatience" },
];

interface PostMarketFormProps {
  initialData?: {
    ratings?: Record<string, number>;
    behaviors?: Record<string, boolean>;
    reflections?: Record<string, string>;
    actualTraps?: EmotionalTrap[];
  };
  onSubmit: (data: {
    completedAt: string;
    ratings: Record<string, number>;
    behaviors: Record<string, boolean>;
    reflections: Record<string, string>;
    actualTraps: EmotionalTrap[];
  }) => void;
  isSubmitting?: boolean;
  isCompleted?: boolean;
  preMarketCompleted?: boolean;
}

export function PostMarketForm({
  initialData,
  onSubmit,
  isSubmitting,
  isCompleted,
  preMarketCompleted,
}: PostMarketFormProps) {
  const [ratings, setRatings] = useState({
    planAdherence: initialData?.ratings?.planAdherence ?? 3,
    emotionalStability: initialData?.ratings?.emotionalStability ?? 3,
    selectivity: initialData?.ratings?.selectivity ?? 3,
  });
  const [behaviors, setBehaviors] = useState({
    forcedTrades: initialData?.behaviors?.forcedTrades ?? false,
    feltFomo: initialData?.behaviors?.feltFomo ?? false,
    reactiveAfterLoss: initialData?.behaviors?.reactiveAfterLoss ?? false,
    carelessAfterWin: initialData?.behaviors?.carelessAfterWin ?? false,
  });
  const [reflections, setReflections] = useState({
    whatWentWell: initialData?.reflections?.whatWentWell ?? "",
    whatWentPoorly: initialData?.reflections?.whatWentPoorly ?? "",
    lessonsLearned: initialData?.reflections?.lessonsLearned ?? "",
    tomorrowFocus: initialData?.reflections?.tomorrowFocus ?? "",
    emotionalHighlight: initialData?.reflections?.emotionalHighlight ?? "",
  });
  const [actualTraps, setActualTraps] = useState<EmotionalTrap[]>(initialData?.actualTraps || []);

  const toggleTrap = (trap: EmotionalTrap) => {
    setActualTraps((prev) =>
      prev.includes(trap) ? prev.filter((t) => t !== trap) : [...prev, trap]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      completedAt: new Date().toISOString(),
      ratings,
      behaviors,
      reflections,
      actualTraps,
    });
  };

  if (!preMarketCompleted) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-blue-500" />
            Post-Market Review
          </CardTitle>
          <CardDescription>
            Complete your pre-market check-in first
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-blue-500" />
          Post-Market Review
        </CardTitle>
        <CardDescription>
          Review your trading performance and emotional state
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isCompleted && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            <Check className="h-4 w-4" />
            Post-market review completed
          </div>
        )}

        {/* Performance Ratings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Performance Ratings</h3>
          <RatingSlider
            label="Plan Adherence"
            description="How well did you stick to your plan?"
            value={ratings.planAdherence}
            onChange={(v) => setRatings((r) => ({ ...r, planAdherence: v }))}
            labels={["Deviated completely", "Perfect execution"]}
          />
          <RatingSlider
            label="Emotional Stability"
            description="How emotionally stable were you?"
            value={ratings.emotionalStability}
            onChange={(v) => setRatings((r) => ({ ...r, emotionalStability: v }))}
            labels={["Emotional rollercoaster", "Rock solid"]}
          />
          <RatingSlider
            label="Selectivity"
            description="How selective were you with entries?"
            value={ratings.selectivity}
            onChange={(v) => setRatings((r) => ({ ...r, selectivity: v }))}
            labels={["Took everything", "Very selective"]}
          />
        </div>

        <Separator />

        {/* Behavior Checkboxes */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Behaviors</h3>
          <div className="space-y-3">
            {[
              { key: "forcedTrades", label: "I forced trades today" },
              { key: "feltFomo", label: "I experienced FOMO" },
              { key: "reactiveAfterLoss", label: "I reacted emotionally after a loss" },
              { key: "carelessAfterWin", label: "I became careless after a win" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={behaviors[key as keyof typeof behaviors]}
                  onCheckedChange={(checked) =>
                    setBehaviors((b) => ({ ...b, [key]: checked === true }))
                  }
                />
                <Label htmlFor={key} className="text-sm cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Actual Traps */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Emotional Traps Encountered</h3>
          <div className="flex flex-wrap gap-2">
            {EMOTIONAL_TRAPS.map((trap) => (
              <Badge
                key={trap.value}
                variant={actualTraps.includes(trap.value) ? "destructive" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleTrap(trap.value)}
              >
                {trap.label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Reflections */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Reflections</h3>
          {[
            { key: "whatWentWell", label: "What went well today?" },
            { key: "whatWentPoorly", label: "What went poorly?" },
            { key: "lessonsLearned", label: "Key lessons learned" },
            { key: "tomorrowFocus", label: "Focus for tomorrow" },
            { key: "emotionalHighlight", label: "Most significant emotional moment" },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <Label className="text-sm">{label}</Label>
              <Textarea
                value={reflections[key as keyof typeof reflections]}
                onChange={(e) =>
                  setReflections((r) => ({ ...r, [key]: e.target.value }))
                }
                placeholder={label}
                rows={2}
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Saving..." : isCompleted ? "Update Post-Market Review" : "Complete Post-Market Review"}
        </Button>
      </CardContent>
    </Card>
  );
}
