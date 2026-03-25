"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export interface ChartColors {
  /** Text for axis ticks, labels */
  text: string;
  /** Subtle grid lines */
  grid: string;
  /** Tooltip background */
  tooltipBg: string;
  /** Tooltip border */
  tooltipBorder: string;
  /** Tooltip text */
  tooltipText: string;
  /** Primary accent (lines, bars) */
  primary: string;
  /** Secondary accent */
  secondary: string;
  /** Danger / destructive color */
  danger: string;
  /** Success / positive color */
  success: string;
  /** Warning color */
  warning: string;
  /** Chart series palette (5 colors) */
  series: [string, string, string, string, string];
}

const LIGHT: ChartColors = {
  text: "#475569",
  grid: "#e2e8f0",
  tooltipBg: "#ffffff",
  tooltipBorder: "#d1dede",
  tooltipText: "#0f172a",
  primary: "#082d7d",
  secondary: "#3b82f6",
  danger: "#e11d48",
  success: "#10b981",
  warning: "#f59e0b",
  series: ["#082d7d", "#1e40af", "#3b82f6", "#60a5fa", "#93c5fd"],
};

const DARK: ChartColors = {
  text: "#cbd5e1",
  grid: "#1e3a5f",
  tooltipBg: "#11203b",
  tooltipBorder: "#2d4a6f",
  tooltipText: "#ffffff",
  primary: "#60a5fa",
  secondary: "#93c5fd",
  danger: "#ff5a5f",
  success: "#34d399",
  warning: "#fbbf24",
  series: ["#93c5fd", "#60a5fa", "#3b82f6", "#818cf8", "#a78bfa"],
};

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(LIGHT);

  useEffect(() => {
    setColors(resolvedTheme === "dark" ? DARK : LIGHT);
  }, [resolvedTheme]);

  return colors;
}

/** Shared Recharts tooltip contentStyle */
export function tooltipStyle(c: ChartColors): React.CSSProperties {
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: "8px",
    color: c.tooltipText,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };
}
