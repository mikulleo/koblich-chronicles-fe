"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Calendar } from "lucide-react";
import type { MindsetJournalEntry, JournalEntryType } from "@/lib/types";

const ENTRY_TYPE_LABELS: Record<JournalEntryType, string> = {
  pre_market_note: "Pre-Market Note",
  post_market_reflection: "Post-Market Reflection",
  mistake_review: "Mistake Review",
  trigger_review: "Trigger Review",
  weekly_review: "Weekly Review",
  rule_violation_review: "Rule Violation Review",
};

const ENTRY_TYPE_COLORS: Record<JournalEntryType, string> = {
  pre_market_note: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  post_market_reflection: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  mistake_review: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  trigger_review: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  weekly_review: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rule_violation_review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

interface JournalEntryCardProps {
  entry: MindsetJournalEntry;
  onEdit: (entry: MindsetJournalEntry) => void;
  onDelete: (entry: MindsetJournalEntry) => void;
}

export function JournalEntryCard({ entry, onEdit, onDelete }: JournalEntryCardProps) {
  const answeredPrompts = entry.guidedPrompts?.filter((p) => p.response?.trim()) || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{entry.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={ENTRY_TYPE_COLORS[entry.entryType]}>
                {ENTRY_TYPE_LABELS[entry.entryType]}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(entry.date).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => onEdit(entry)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onDelete(entry)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {answeredPrompts.length > 0 && (
          <div className="space-y-2">
            {answeredPrompts.slice(0, 2).map((prompt, i) => (
              <div key={i} className="text-sm">
                <div className="text-xs font-medium text-muted-foreground">{prompt.prompt}</div>
                <div className="text-sm line-clamp-2">{prompt.response}</div>
              </div>
            ))}
            {answeredPrompts.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{answeredPrompts.length - 2} more responses
              </span>
            )}
          </div>
        )}
        {entry.freeContent && (
          <p className="text-sm text-muted-foreground line-clamp-2">{entry.freeContent}</p>
        )}
        {entry.linkedTraps && entry.linkedTraps.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.linkedTraps.map((trap) => (
              <Badge key={trap} variant="outline" className="text-xs">
                {trap.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
