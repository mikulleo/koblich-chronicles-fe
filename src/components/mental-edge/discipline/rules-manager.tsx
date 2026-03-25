"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import type { DisciplineRule, RuleCategory } from "@/lib/types";

const CATEGORIES: { value: RuleCategory; label: string }[] = [
  { value: "risk_management", label: "Risk Management" },
  { value: "entry_rules", label: "Entry Rules" },
  { value: "exit_rules", label: "Exit Rules" },
  { value: "position_sizing", label: "Position Sizing" },
  { value: "emotional", label: "Emotional" },
  { value: "routine", label: "Routine" },
];

const CATEGORY_COLORS: Record<RuleCategory, string> = {
  risk_management: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  entry_rules: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  exit_rules: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  position_sizing: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  emotional: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  routine: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

interface RulesManagerProps {
  rules: DisciplineRule[];
  onRulesChange: () => void;
}

export function RulesManager({ rules, onRulesChange }: RulesManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DisciplineRule | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RuleCategory>("risk_management");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("risk_management");
    setEditingRule(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (rule: DisciplineRule) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setDescription(rule.description || "");
    setCategory(rule.category);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      if (editingRule) {
        await apiClient.patch(`/discipline-rules/${editingRule.id}`, {
          title,
          description,
          category,
        });
        toast.success("Rule updated");
      } else {
        await apiClient.post("/discipline-rules", {
          title,
          description,
          category,
        });
        toast.success("Rule created");
      }
      setDialogOpen(false);
      resetForm();
      onRulesChange();
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (rule: DisciplineRule) => {
    try {
      await apiClient.patch(`/discipline-rules/${rule.id}`, {
        isActive: !rule.isActive,
      });
      onRulesChange();
    } catch {
      toast.error("Failed to update rule");
    }
  };

  const handleDelete = async (rule: DisciplineRule) => {
    try {
      await apiClient.delete(`/discipline-rules/${rule.id}`);
      toast.success("Rule deleted");
      onRulesChange();
    } catch {
      toast.error("Failed to delete rule");
    }
  };

  const groupedRules = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.value] = rules.filter((r) => r.category === cat.value);
      return acc;
    },
    {} as Record<RuleCategory, DisciplineRule[]>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Trading Rules</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Rule" : "New Trading Rule"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Never risk more than 1% per trade"
                />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why this rule matters and how to follow it"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as RuleCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                {submitting ? "Saving..." : editingRule ? "Update Rule" : "Create Rule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No rules yet. Create your first trading rule to start tracking discipline.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.filter((cat) => groupedRules[cat.value].length > 0).map((cat) => (
            <div key={cat.value} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{cat.label}</h4>
              {groupedRules[cat.value].map((rule) => (
                <Card key={rule.id} className={rule.isActive ? "" : "opacity-50"}>
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => handleToggleActive(rule)}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{rule.title}</div>
                        {rule.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {rule.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="secondary" className={CATEGORY_COLORS[rule.category]}>
                        {cat.label}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(rule)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(rule)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
