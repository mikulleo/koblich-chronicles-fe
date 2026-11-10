"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { History, ArrowRight } from "lucide-react";
import apiClient from "@/lib/api/client";
import { PILLARS } from "@/lib/mental-edge/action-journal";
import type { ActionJournalData, ActionJournalItem, ActionJournalPillar } from "@/lib/types";

interface LastActionStep {
  date: string;
  text: string;
  source: "check-in" | "journal";
}

/** Most recent action step strictly before `beforeDate` (YYYY-MM-DD). */
function useLastActionStep(beforeDate: string) {
  const [step, setStep] = useState<LastActionStep | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    apiClient
      .get("/mental-check-ins/last-action-step", { params: { before: beforeDate } })
      .then((res) => {
        if (!cancelled) setStep(res.data?.lastActionStep ?? null);
      })
      .catch(() => {
        if (!cancelled) setStep(null);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [beforeDate]);

  return { step, loaded };
}

function formatDate(date: string) {
  // Parse as a local calendar date so the label doesn't shift a day by timezone.
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function PillarChips({
  value,
  onChange,
}: {
  value: ActionJournalPillar | null;
  onChange: (pillar: ActionJournalPillar | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="Pillar">
      {PILLARS.map((p) => {
        const active = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            title={p.question}
            aria-pressed={active}
            onClick={() => onChange(active ? null : p.value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] leading-4 transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {p.short}
          </button>
        );
      })}
    </div>
  );
}

function ItemList({
  items,
  onChange,
  placeholder,
}: {
  items: ActionJournalItem[];
  onChange: (items: ActionJournalItem[]) => void;
  placeholder: string;
}) {
  const update = (index: number, patch: Partial<ActionJournalItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <span className="mt-2 w-4 shrink-0 text-right text-sm font-semibold text-muted-foreground">
            {i + 1}
          </span>
          <div className="flex-1 space-y-1.5">
            <Input
              value={item.text}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder={i === 0 ? placeholder : "One or two sentences…"}
            />
            <PillarChips value={item.pillar} onChange={(pillar) => update(i, { pillar })} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface ActionJournalFieldsProps {
  value: ActionJournalData;
  onChange: (value: ActionJournalData) => void;
  /** Date of the entry being written (YYYY-MM-DD); the reminder shows the step before it. */
  date: string;
}

/**
 * 3-3-1 Action Journal: 3 Things I Did Well, 3 Things for Improvement,
 * 1 Action Step Forward — each item optionally tagged with a pillar.
 */
export function ActionJournalFields({ value, onChange, date }: ActionJournalFieldsProps) {
  const { step, loaded } = useLastActionStep(date);

  return (
    <div className="space-y-5">
      {/* Review the last action step before writing a new one */}
      <div className="flex gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 text-sm">
          {!loaded ? (
            <span className="text-muted-foreground">Loading your last action step…</span>
          ) : step ? (
            <>
              <div className="text-xs font-medium text-muted-foreground">
                Your last Action Step ({formatDate(step.date)})
              </div>
              <div className="mt-0.5 break-words font-medium">&ldquo;{step.text}&rdquo;</div>
              <div className="mt-1 text-xs text-muted-foreground">Did you follow through on it?</div>
            </>
          ) : (
            <span className="text-muted-foreground">
              No previous action step yet. The one you write below will be shown here next time.
            </span>
          )}
        </div>
      </div>

      {/* Three pillars */}
      <div className="rounded-md border">
        {PILLARS.map((p, i) => (
          <div
            key={p.value}
            className={cn(
              "grid grid-cols-1 gap-0.5 px-3 py-2 text-xs sm:grid-cols-[11rem_1fr] sm:gap-3",
              i > 0 && "border-t"
            )}
          >
            <span className="font-semibold">{p.label}</span>
            <span className="text-muted-foreground">{p.question}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-sm font-semibold">3 Things I Did Well</Label>
          <p className="text-xs text-muted-foreground">
            Moments where your Self-State was optimal or you executed your Process with high discipline.
          </p>
        </div>
        <ItemList
          items={value.didWell}
          onChange={(didWell) => onChange({ ...value, didWell })}
          placeholder="e.g. Waited for my setup instead of chasing the open"
        />
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-sm font-semibold">3 Things for Improvement</Label>
          <p className="text-xs text-muted-foreground">
            Where your Behaviours slipped, you deviated from the plan, or the market triggered a sub-optimal state.
          </p>
        </div>
        <ItemList
          items={value.improvement}
          onChange={(improvement) => onChange({ ...value, improvement })}
          placeholder="e.g. Moved my stop after the first pullback"
        />
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-sm font-semibold">1 Action Step Forward</Label>
          <p className="text-xs text-muted-foreground">
            One concrete adjustment for your next session that strengthens your Process Adherence.
          </p>
        </div>
        <div className="flex gap-2">
          <ArrowRight className="mt-2.5 h-4 w-4 shrink-0 text-primary" />
          <Textarea
            value={value.actionStep}
            onChange={(e) => onChange({ ...value, actionStep: e.target.value })}
            placeholder="e.g. No entries before the first 30-minute range is set"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">
          Market &amp; week context <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          value={value.context}
          onChange={(e) => onChange({ ...value, context: e.target.value })}
          placeholder="What was the market doing? Anything going on in your week?"
          rows={2}
        />
      </div>
    </div>
  );
}
