"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, ClipboardCheck, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import type { DisciplineRule, DisciplineLogEntry, ViolationMentalState } from "@/lib/types";

const MENTAL_STATES: { value: ViolationMentalState; label: string }[] = [
  { value: "frustrated", label: "Frustrated" },
  { value: "overconfident", label: "Overconfident" },
  { value: "fearful", label: "Fearful" },
  { value: "impatient", label: "Impatient" },
  { value: "revenge_trading", label: "Revenge Trading" },
  { value: "fomo", label: "FOMO" },
  { value: "bored", label: "Bored" },
  { value: "tired", label: "Tired" },
];

interface DailyComplianceProps {
  rules: DisciplineRule[];
}

interface EntryState {
  rule: string;
  status: "respected" | "violated";
  notes: string;
  mentalStateAtViolation?: ViolationMentalState;
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function addTradingDays(dateStr: string, direction: number): string {
  const date = new Date(dateStr + "T12:00:00");
  do {
    date.setDate(date.getDate() + direction);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return getDateString(date);
}

function snapToWeekday(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() - 2);
  if (day === 6) date.setDate(date.getDate() - 1);
  return getDateString(date);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DailyCompliance({ rules }: DailyComplianceProps) {
  const today = snapToWeekday(getDateString(new Date()));
  const [selectedDate, setSelectedDate] = useState(today);
  const isToday = selectedDate === today;

  const [dayLog, setDayLog] = useState<DisciplineLogEntry | null>(null);
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const activeRules = rules.filter((r) => r.isActive);

  const fetchDayLog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/discipline-log", {
        params: {
          where: { date: { equals: selectedDate } },
          limit: 1,
        },
      });
      const docs = response.data.docs;
      if (docs.length > 0) {
        setDayLog(docs[0]);
        const existingEntries = docs[0].entries || [];
        setEntries(
          activeRules.map((rule) => {
            const existing = existingEntries.find(
              (e: { rule: string | { id: string } }) => {
                const ruleId = typeof e.rule === "object" ? e.rule.id : e.rule;
                return ruleId === rule.id;
              }
            );
            return {
              rule: rule.id,
              status: existing?.status || "respected",
              notes: existing?.notes || "",
              mentalStateAtViolation: existing?.mentalStateAtViolation,
            };
          })
        );
      } else {
        setDayLog(null);
        setEntries(
          activeRules.map((rule) => ({
            rule: rule.id,
            status: "respected" as const,
            notes: "",
          }))
        );
      }
    } catch {
      toast.error("Failed to load compliance log");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeRules.length]);

  useEffect(() => {
    if (activeRules.length > 0) {
      fetchDayLog();
    } else {
      setLoading(false);
    }
  }, [selectedDate, activeRules.length]);

  const updateEntry = (index: number, updates: Partial<EntryState>) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry))
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        date: selectedDate,
        entries: entries.map((e) => ({
          rule: e.rule,
          status: e.status,
          notes: e.notes || undefined,
          mentalStateAtViolation:
            e.status === "violated" ? e.mentalStateAtViolation : undefined,
        })),
      };

      if (dayLog) {
        await apiClient.patch(`/discipline-log/${dayLog.id}`, payload);
      } else {
        await apiClient.post("/discipline-log", payload);
      }
      toast.success("Compliance log saved");
      await fetchDayLog();
    } catch {
      toast.error("Failed to save compliance log");
    } finally {
      setSubmitting(false);
    }
  };

  if (activeRules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active rules. Create and activate trading rules to track daily compliance.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Date nav shown even while loading */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addTradingDays(selectedDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{formatDate(selectedDate)}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addTradingDays(selectedDate, 1))}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(today)}>
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const respected = entries.filter((e) => e.status === "respected").length;
  const complianceRate = Math.round((respected / entries.length) * 100);

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addTradingDays(selectedDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{formatDate(selectedDate)}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedDate(addTradingDays(selectedDate, 1))}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(today)}>
              Today
            </Button>
          )}
        </div>
        <Badge variant={dayLog ? "default" : "outline"}>
          {dayLog ? "Logged" : "Not Logged"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Daily Compliance
          </CardTitle>
          <CardDescription>
            Track which rules you respected and violated{isToday ? " today" : ` on ${formatDate(selectedDate)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>
              {respected}/{entries.length} rules respected
            </span>
            <span className="font-bold">{complianceRate}%</span>
          </div>
          <Progress value={complianceRate} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {entries.map((entry, index) => {
          const rule = activeRules.find((r) => r.id === entry.rule);
          if (!rule) return null;

          return (
            <Card key={rule.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">{rule.title}</div>
                    {rule.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {rule.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={entry.status === "respected" ? "default" : "outline"}
                      onClick={() => updateEntry(index, { status: "respected" })}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Respected
                    </Button>
                    <Button
                      size="sm"
                      variant={entry.status === "violated" ? "destructive" : "outline"}
                      onClick={() => updateEntry(index, { status: "violated" })}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Violated
                    </Button>
                  </div>
                </div>

                {entry.status === "violated" && (
                  <div className="space-y-2 pl-2 border-l-2 border-destructive">
                    <div className="space-y-1">
                      <Label className="text-xs">Mental State</Label>
                      <Select
                        value={entry.mentalStateAtViolation || ""}
                        onValueChange={(v) =>
                          updateEntry(index, {
                            mentalStateAtViolation: v as ViolationMentalState,
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="What were you feeling?" />
                        </SelectTrigger>
                        <SelectContent>
                          {MENTAL_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={entry.notes}
                        onChange={(e) => updateEntry(index, { notes: e.target.value })}
                        placeholder="What happened?"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting
          ? "Saving..."
          : dayLog
            ? `Update Log for ${formatDate(selectedDate)}`
            : `Save Log for ${formatDate(selectedDate)}`}
      </Button>
    </div>
  );
}
