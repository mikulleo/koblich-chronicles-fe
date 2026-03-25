"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sun,
  BookOpen,
  AlertTriangle,
  Shield,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { DailyCheckIn } from "./daily/daily-check-in";
import { JournalList } from "./journal/journal-list";
import { TrapDashboard } from "./traps/trap-dashboard";
import { DisciplineTracker } from "./discipline/discipline-tracker";
import { WeeklyReview } from "./weekly/weekly-review";
import { InsightsDashboard } from "./insights/insights-dashboard";

export function MentalEdge() {
  return (
    <Tabs defaultValue="today" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="today" className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <span className="hidden sm:inline">Daily</span>
        </TabsTrigger>
        <TabsTrigger value="journal" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Journal</span>
        </TabsTrigger>
        <TabsTrigger value="traps" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Traps</span>
        </TabsTrigger>
        <TabsTrigger value="discipline" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Discipline</span>
        </TabsTrigger>
        <TabsTrigger value="weekly" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Weekly</span>
        </TabsTrigger>
        <TabsTrigger value="insights" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Insights</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="today" className="mt-6 w-full">
        <DailyCheckIn />
      </TabsContent>

      <TabsContent value="journal" className="mt-6 w-full">
        <JournalList />
      </TabsContent>

      <TabsContent value="traps" className="mt-6 w-full">
        <TrapDashboard />
      </TabsContent>

      <TabsContent value="discipline" className="mt-6 w-full">
        <DisciplineTracker />
      </TabsContent>

      <TabsContent value="weekly" className="mt-6 w-full">
        <WeeklyReview />
      </TabsContent>

      <TabsContent value="insights" className="mt-6 w-full">
        <InsightsDashboard />
      </TabsContent>
    </Tabs>
  );
}
