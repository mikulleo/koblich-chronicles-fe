"use client";

import React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RatingSliderProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  labels?: string[];
  /** If true, higher values are "bad" (uses warning colors) */
  inverted?: boolean;
}

export function RatingSlider({
  label,
  description,
  value,
  onChange,
  min = 1,
  max = 5,
  labels,
  inverted = false,
}: RatingSliderProps) {
  const getColor = (val: number) => {
    if (inverted) {
      if (val <= 2) return "text-green-500";
      if (val <= 3) return "text-yellow-500";
      return "text-red-500";
    }
    if (val >= 4) return "text-green-500";
    if (val >= 3) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className={cn("text-lg font-bold", getColor(value))}>
          {value}
        </span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={1}
        className="w-full"
      />
      {labels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      )}
    </div>
  );
}
