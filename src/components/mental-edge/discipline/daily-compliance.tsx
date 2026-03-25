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
import { CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
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

export function DailyCompliance({ rules }: DailyComplianceProps) {
  const [todayLog, setTodayLog] = useState<DisciplineLogEntry | null>(null);
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const activeRules = rules.filter((r) => r.isActive);

  const fetchTodayLog = useCallback(async () => {
    try {
      const response = await apiClient.get("/discipline-log", {
        params: {
          where: { date: { equals: today } },
          limit: 1,
        },
      });
      const docs = response.data.docs;
      if (docs.length > 0) {
        setTodayLog(docs[0]);
        // Restore entries from existing log
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
        setEntries(
          activeRules.map((rule) => ({
            rule: rule.id,
            status: "respected" as const,
            notes: "",
          }))
        );
      }
    } catch {
      toast.error("Failed to load today's compliance log");
    } finally {
      setLoading(false);
    }
  }, [today, activeRules.length]);

  useEffect(() => {
    if (activeRules.length > 0) {
      fetchTodayLog();
    } else {
      setLoading(false);
    }
  }, [activeRules.length]);

  const updateEntry = (index: number, updates: Partial<EntryState>) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry))
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        date: today,
        entries: entries.map((e) => ({
          rule: e.rule,
          status: e.status,
          notes: e.notes || undefined,
          mentalStateAtViolation:
            e.status === "violated" ? e.mentalStateAtViolation : undefined,
        })),
      };

      if (todayLog) {
        await apiClient.patch(`/discipline-log/${todayLog.id}`, payload);
      } else {
        await apiClient.post("/discipline-log", payload);
      }
      toast.success("Compliance log saved");
      await fetchTodayLog();
    } catch {
      toast.error("Failed to save compliance log");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (activeRules.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No active rules. Create and activate trading rules to track daily compliance.
        </CardContent>
      </Card>
    );
  }

  const respected = entries.filter((e) => e.status === "respected").length;
  const complianceRate = Math.round((respected / entries.length) * 100);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Daily Compliance
          </CardTitle>
          <CardDescription>
            Track which rules you respected and violated today
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
        {submitting ? "Saving..." : todayLog ? "Update Compliance Log" : "Save Compliance Log"}
      </Button>
    </div>
  );
}
