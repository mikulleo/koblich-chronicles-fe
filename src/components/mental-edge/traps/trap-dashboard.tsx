"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrapFrequencyChart } from "./trap-frequency-chart";
import { TrapContextChart } from "./trap-context-chart";
import { AlertTriangle } from "lucide-react";
import apiClient from "@/lib/api/client";
import type { CheckInTrends } from "@/lib/types";

export function TrapDashboard() {
  const [trends, setTrends] = useState<CheckInTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/mental-check-ins/trends", { params: { depth: 0 } });
        setTrends(response.data);
      } catch {
        // Silent - empty state will show
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Aggregate trap counts from all check-ins
  const trapCounts: Record<string, number> = {};
  const driftCounts: Record<string, number> = {};

  if (trends) {
    for (const day of trends.trends) {
      for (const trap of day.traps) {
        trapCounts[trap] = (trapCounts[trap] || 0) + 1;
      }
      for (const drift of day.driftPatterns) {
        driftCounts[drift] = (driftCounts[drift] || 0) + 1;
      }
    }
  }

  const totalTraps = Object.values(trapCounts).reduce((a, b) => a + b, 0);
  const daysWithTraps = trends?.trends.filter((d) => d.traps.length > 0).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Emotional Trap Tracker</h2>
        <p className="text-muted-foreground text-sm">
          Identify patterns in your emotional traps to build awareness and prevention strategies.
        </p>
      </div>

      {!trends || trends.totalDays === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No check-in data yet.</p>
            <p className="text-sm mt-1">Complete daily check-ins to see trap analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{trends.totalDays}</div>
                <div className="text-xs text-muted-foreground">Days Tracked</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{totalTraps}</div>
                <div className="text-xs text-muted-foreground">Total Traps</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">{daysWithTraps}</div>
                <div className="text-xs text-muted-foreground">Days with Traps</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-3xl font-bold">
                  {trends.totalDays > 0
                    ? Math.round(((trends.totalDays - daysWithTraps) / trends.totalDays) * 100)
                    : 0}%
                </div>
                <div className="text-xs text-muted-foreground">Clean Days</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrapFrequencyChart trapCounts={trapCounts} />
            <TrapContextChart trends={trends.trends} />
          </div>

          {/* Drift patterns */}
          {Object.keys(driftCounts).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detected Drift Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(driftCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([pattern, count]) => (
                      <Badge key={pattern} variant="destructive">
                        {pattern} ({count}x)
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
