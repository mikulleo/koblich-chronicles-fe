"use client";

import { useState, useCallback } from "react";
import apiClient from "@/lib/api/client";
import type { MindsetEvaluation, EvaluationType } from "@/lib/types";

export function useMindsetEvaluation() {
  const [evaluation, setEvaluation] = useState<MindsetEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestEvaluation = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get("/mindset-evaluations/latest", {
        params: { date },
      });
      setEvaluation(response.data);
    } catch {
      setError("Failed to fetch evaluation");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestEvaluation = useCallback(async (type: EvaluationType, date: string, force = false) => {
    setGenerating(true);
    setError(null);
    try {
      const response = await apiClient.post("/mindset-evaluations/evaluate", {
        type,
        date,
        force,
      });
      setEvaluation(response.data);
      return response.data as MindsetEvaluation & { _regenerationsRemaining?: number };
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosError.response?.status === 429) {
        setError(axiosError.response.data?.error || "Regeneration limit reached for this date.");
      } else if (axiosError.response?.status === 400) {
        setError(axiosError.response.data?.error || "AI evaluations are not enabled.");
      } else {
        setError("Failed to generate evaluation. Please try again.");
      }
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const deleteEvaluation = useCallback(async (id: string) => {
    setDeleting(true);
    setError(null);
    try {
      await apiClient.post("/mindset-evaluations/remove", { id });
      setEvaluation(null);
      return true;
    } catch {
      setError("Failed to delete evaluation");
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  return {
    evaluation,
    loading,
    generating,
    deleting,
    error,
    fetchLatestEvaluation,
    generate: requestEvaluation,
    deleteEvaluation,
  };
}
