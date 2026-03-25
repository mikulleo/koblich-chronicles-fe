"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ClipboardCheck, BarChart3 } from "lucide-react";
import { RulesManager } from "./rules-manager";
import { DailyCompliance } from "./daily-compliance";
import { DisciplineAnalyticsView } from "./discipline-analytics";
import apiClient from "@/lib/api/client";
import type { DisciplineRule } from "@/lib/types";

export function DisciplineTracker() {
  const [rules, setRules] = useState<DisciplineRule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRules = useCallback(async () => {
    try {
      const response = await apiClient.get("/discipline-rules", { params: { depth: 0 } });
      setRules(response.data.docs);
    } catch {
      // Silent - empty state will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Discipline Tracker</h2>
        <p className="text-muted-foreground text-sm">
          Define your trading rules, track daily compliance, and identify patterns in rule violations.
        </p>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Daily Log
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          <RulesManager rules={rules} onRulesChange={fetchRules} />
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <DailyCompliance rules={rules} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <DisciplineAnalyticsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
