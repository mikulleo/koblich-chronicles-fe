"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { JournalEntryCard } from "./journal-entry-card";
import { JournalEntryForm } from "./journal-entry-form";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import type { MindsetJournalEntry, JournalEntryType } from "@/lib/types";

const ENTRY_TYPES: { value: JournalEntryType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "pre_market_note", label: "Pre-Market Note" },
  { value: "post_market_reflection", label: "Post-Market Reflection" },
  { value: "mistake_review", label: "Mistake Review" },
  { value: "trigger_review", label: "Trigger Review" },
  { value: "weekly_review", label: "Weekly Review" },
  { value: "rule_violation_review", label: "Rule Violation Review" },
];

export function JournalList() {
  const [entries, setEntries] = useState<MindsetJournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<JournalEntryType | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MindsetJournalEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const params: Record<string, unknown> = {
        sort: "-date",
        limit: 50,
      };
      if (filter !== "all") {
        params.where = { entryType: { equals: filter } };
      }
      const response = await apiClient.get("/mindset-journal", { params });
      setEntries(response.data.docs);
    } catch {
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async (entry: MindsetJournalEntry) => {
    try {
      await apiClient.delete(`/mindset-journal/${entry.id}`);
      toast.success("Entry deleted");
      fetchEntries();
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const handleEdit = (entry: MindsetJournalEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingEntry(null);
    fetchEntries();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Mindset Journal</h2>
        <p className="text-muted-foreground text-sm">
          Structured journaling with guided prompts to deepen your self-awareness.
        </p>
      </div>

      {showForm ? (
        <JournalEntryForm
          entry={editingEntry}
          defaultEntryType={filter !== "all" ? filter : undefined}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Select
              value={filter}
              onValueChange={(v) => setFilter(v as JournalEntryType | "all")}
            >
              <SelectTrigger className="w-48">
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
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Entry
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No journal entries yet.</p>
              <p className="text-sm mt-1">Start journaling to build self-awareness.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
