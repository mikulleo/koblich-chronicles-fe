"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import type { MindsetJournalEntry, JournalEntryType, EmotionalTrap } from "@/lib/types";

const ENTRY_TYPES: { value: JournalEntryType; label: string }[] = [
  { value: "pre_market_note", label: "Pre-Market Note" },
  { value: "post_market_reflection", label: "Post-Market Reflection" },
  { value: "mistake_review", label: "Mistake Review" },
  { value: "trigger_review", label: "Trigger Review" },
  { value: "weekly_review", label: "Weekly Review" },
  { value: "rule_violation_review", label: "Rule Violation Review" },
];

const TRAPS: { value: EmotionalTrap; label: string }[] = [
  { value: "overtrading", label: "Overtrading" },
  { value: "fomo_entries", label: "FOMO Entries" },
  { value: "revenge_trading", label: "Revenge Trading" },
  { value: "moving_stops", label: "Moving Stops" },
  { value: "oversizing", label: "Oversizing" },
  { value: "not_taking_setups", label: "Not Taking Setups" },
  { value: "chasing", label: "Chasing" },
  { value: "impatience", label: "Impatience" },
];

interface JournalEntryFormProps {
  entry?: MindsetJournalEntry | null;
  defaultEntryType?: JournalEntryType;
  onSave: () => void;
  onCancel: () => void;
}

export function JournalEntryForm({ entry, defaultEntryType, onSave, onCancel }: JournalEntryFormProps) {
  const [entryType, setEntryType] = useState<JournalEntryType>(entry?.entryType || defaultEntryType || "post_market_reflection");
  const [title, setTitle] = useState(entry?.title || "");
  const [guidedPrompts, setGuidedPrompts] = useState<{ prompt: string; response: string }[]>(
    entry?.guidedPrompts || []
  );
  const [freeContent, setFreeContent] = useState(entry?.freeContent || "");
  const [linkedTraps, setLinkedTraps] = useState<EmotionalTrap[]>(entry?.linkedTraps || []);
  const [submitting, setSubmitting] = useState(false);
  const [promptsLoaded, setPromptsLoaded] = useState(!!entry);

  // When creating new and entry type changes, fetch prompts from backend
  useEffect(() => {
    if (entry) return; // Don't override existing prompts
    if (!entryType) return;
    setPromptsLoaded(false);

    // Create a temporary entry to get prompts populated by the backend hook
    // We'll simulate the prompts locally for better UX
    const GUIDED_PROMPTS: Record<string, string[]> = {
      pre_market_note: [
        "How ready am I today? Is my mind set right?",
        "What is my sense of the market environment? What am I watching?",
        "What is my game plan if the market does the opposite of what I expect?",
        "What is my maximum risk for today?",
      ],
      post_market_reflection: [
        "What trades did I take and why?",
        "What decision was I most proud of? What are 1-3 things I did well today?",
        "What would I do differently if I could replay today? What are 1-3 things I didn't do well?",
        "What is the one thing I need to improve most?",
      ],
      mistake_review: [
        "What was the mistake?",
        "What was I feeling when I made it?",
        "What rule did it violate?",
        "What is the specific trigger that led to this mistake?",
        "What will I do differently next time?",
      ],
      trigger_review: [
        "What was the emotional trigger?",
        "What situation caused it?",
        "How did I react?",
        "What was the outcome of my reaction?",
        "What is a healthier response I can practice?",
      ],
      weekly_review: [
        "What were my best decisions this week?",
        "What patterns do I notice in my behavior?",
        "Did I follow my trading rules consistently?",
        "What emotional traps did I fall into most?",
        "What is my #1 focus for next week?",
      ],
      rule_violation_review: [
        "Which rule did I violate?",
        "What was the context (market, personal state)?",
        "What was I thinking/feeling at the moment?",
        "What was the financial impact?",
        "How will I prevent this from happening again?",
      ],
    };

    const prompts = GUIDED_PROMPTS[entryType] || [];
    setGuidedPrompts(prompts.map((p) => ({ prompt: p, response: "" })));
    setPromptsLoaded(true);
  }, [entryType, entry]);

  const toggleTrap = (trap: EmotionalTrap) => {
    setLinkedTraps((prev) =>
      prev.includes(trap) ? prev.filter((t) => t !== trap) : [...prev, trap]
    );
  };

  const updatePromptResponse = (index: number, response: string) => {
    setGuidedPrompts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, response } : p))
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: new Date().toISOString().split("T")[0],
        entryType,
        title,
        guidedPrompts,
        freeContent: freeContent || undefined,
        linkedTraps: linkedTraps.length > 0 ? linkedTraps : undefined,
      };

      if (entry) {
        await apiClient.patch(`/mindset-journal/${entry.id}`, payload);
        toast.success("Journal entry updated");
      } else {
        await apiClient.post("/mindset-journal", payload);
        toast.success("Journal entry created");
      }
      onSave();
    } catch {
      toast.error("Failed to save journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{entry ? "Edit Journal Entry" : "New Journal Entry"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Entry Type</Label>
            <Select
              value={entryType}
              onValueChange={(v) => setEntryType(v as JournalEntryType)}
              disabled={!!entry}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTRY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this entry a meaningful title"
            />
          </div>
        </div>

        {/* Guided Prompts */}
        {promptsLoaded && guidedPrompts.length > 0 && (
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Guided Prompts</Label>
            {guidedPrompts.map((prompt, index) => (
              <div key={index} className="space-y-1">
                <Label className="text-sm text-muted-foreground">{prompt.prompt}</Label>
                <Textarea
                  value={prompt.response}
                  onChange={(e) => updatePromptResponse(index, e.target.value)}
                  placeholder="Your response..."
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}

        {/* Free content */}
        <div className="space-y-1">
          <Label>Free-Form Notes</Label>
          <Textarea
            value={freeContent}
            onChange={(e) => setFreeContent(e.target.value)}
            placeholder="Additional thoughts, observations, or notes..."
            rows={4}
          />
        </div>

        {/* Linked traps — only for entry types where they're relevant */}
        {entryType !== "pre_market_note" && (
          <div className="space-y-2">
            <Label>Related Emotional Traps</Label>
            <div className="flex flex-wrap gap-2">
              {TRAPS.map((trap) => (
                <Badge
                  key={trap.value}
                  variant={linkedTraps.includes(trap.value) ? "destructive" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleTrap(trap.value)}
                >
                  {trap.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            {submitting ? "Saving..." : entry ? "Update Entry" : "Create Entry"}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
