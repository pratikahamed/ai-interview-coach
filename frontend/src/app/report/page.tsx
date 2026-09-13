"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportData {
  score: number;
  strengths: string;
  weaknesses: string;
  revision_areas: string;
  verdict: string;
  recommendation: string;
}

function safeDecode(val: string | null, fallback: string): string {
  if (!val) return fallback;
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

function parseConversationHistoryParam(
  param: string | null
): Array<{ role: string; content: string }> {
  if (!param) return [];
  try {
    const decoded = decodeURIComponent(param);
    return JSON.parse(decoded);
  } catch {
    try {
      return JSON.parse(param);
    } catch {
      return [];
    }
  }
}

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL search parameters
  const rawTopic = searchParams.get("topic");
  const rawDifficulty = searchParams.get("difficulty");
  const rawConversationHistory = searchParams.get("conversationHistory");

  const topic = safeDecode(rawTopic, "Technical Interview");
  const difficulty = safeDecode(rawDifficulty, "Medium");

  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const parsedHistory = parseConversationHistoryParam(rawConversationHistory);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/api/report/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          difficulty,
          conversation_history: parsedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const data: ReportData = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Error generating report:", error);
      setErrorMessage(
        "Could not generate your interview report. Please check that the backend server is running and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [rawConversationHistory, topic, difficulty]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Loading state using shadcn/ui Skeleton components
  if (isLoading) {
    return (
      <main className="min-h-screen w-full bg-slate-950 text-slate-100 py-6 sm:py-10 px-4 sm:px-6 flex flex-col items-center justify-center animate-fade-in selection:bg-slate-800 selection:text-white">
        <div
          data-testid="report-skeleton-container"
          className="w-full max-w-[800px] bg-slate-50 text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 space-y-8"
        >
          {/* Header Skeleton */}
          <div className="flex flex-col items-center space-y-3">
            <Skeleton className="w-14 h-14 rounded-full bg-slate-200" />
            <Skeleton className="h-8 w-60 sm:w-72 rounded-lg bg-slate-200" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-6 w-24 rounded-full bg-slate-200" />
              <Skeleton className="h-6 w-16 rounded-full bg-slate-200" />
            </div>
          </div>

          {/* Score & Recommendation Skeleton */}
          <div className="flex flex-col items-center justify-center gap-3">
            <Skeleton className="w-48 h-24 rounded-2xl bg-slate-200" />
            <Skeleton className="w-24 h-8 rounded-full bg-slate-200" />
          </div>

          {/* 4 Cards Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Skeleton className="h-36 rounded-xl bg-slate-200" />
            <Skeleton className="h-36 rounded-xl bg-slate-200" />
            <Skeleton className="h-36 rounded-xl bg-slate-200" />
            <Skeleton className="h-36 rounded-xl bg-slate-200" />
          </div>

          {/* Button Skeleton */}
          <div className="flex justify-center pt-2">
            <Skeleton className="h-11 w-48 rounded-lg bg-slate-200" />
          </div>

          {/* Subtle loading status text */}
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 font-medium pt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            <span>Generating your report...</span>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (errorMessage || !report) {
    return (
      <main className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in selection:bg-slate-800 selection:text-white">
        <div className="w-full max-w-[500px] bg-red-950/80 border-2 border-red-500/80 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-200">
            Failed to Generate Report
          </h2>
          <p className="text-sm text-red-300/90 leading-relaxed">
            {errorMessage || "An unexpected error occurred while generating your report."}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-3">
            <Button
              type="button"
              onClick={fetchReport}
              variant="outline"
              className="border-red-500/50 hover:bg-red-900/40 text-red-200 font-medium"
            >
              Try Again
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/")}
              className="bg-slate-800 hover:bg-slate-700 text-white font-medium"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Score coloring logic based strictly on requirements:
  // - Green if score is 70 or above
  // - Yellow if score is 50 to 69
  // - Red if score is below 50
  const numericScore =
    typeof report.score === "number"
      ? report.score
      : parseInt(String(report.score), 10) || 0;

  const getScoreColorClasses = (score: number) => {
    if (score >= 70) {
      return "text-emerald-700 bg-emerald-50 border-emerald-300";
    }
    if (score >= 50 && score <= 69) {
      return "text-amber-700 bg-amber-50 border-amber-300";
    }
    return "text-rose-700 bg-rose-50 border-rose-300";
  };

  // Recommendation Badge logic:
  // - Green with text "PASS" if recommendation is Pass
  // - Red with text "FAIL" if recommendation is Fail
  const isPass = report.recommendation?.trim().toLowerCase() === "pass";

  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 py-6 sm:py-10 px-3 sm:px-6 flex flex-col items-center justify-center animate-fade-in selection:bg-slate-800 selection:text-white">
      {/* Light report container against dark page background */}
      <div className="w-full max-w-[800px] bg-slate-50 text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200">
        {/* Header with completion icon */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Interview Complete
          </h1>

          {/* Topic and Difficulty Badges */}
          <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
            <Badge
              variant="secondary"
              className="px-3 py-1 bg-slate-200 text-slate-800 font-medium text-xs sm:text-sm"
            >
              {topic}
            </Badge>
            <Badge
              variant="outline"
              className="px-3 py-1 border-slate-300 text-slate-700 font-medium text-xs sm:text-sm"
            >
              {difficulty}
            </Badge>
          </div>
        </div>

        {/* Score & Recommendation Display */}
        <div className="my-8 flex flex-col items-center justify-center gap-3">
          <div
            className={`flex flex-col items-center justify-center px-8 py-5 rounded-2xl border-2 shadow-sm ${getScoreColorClasses(
              numericScore
            )}`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Overall Score
            </span>
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              {numericScore} / 100
            </span>
          </div>

          {/* Large Recommendation Badge */}
          <div>
            {isPass ? (
              <Badge className="px-5 py-1.5 text-sm sm:text-base font-bold bg-emerald-600 text-white hover:bg-emerald-600 shadow-md">
                PASS
              </Badge>
            ) : (
              <Badge className="px-5 py-1.5 text-sm sm:text-base font-bold bg-rose-600 text-white hover:bg-rose-600 shadow-md">
                FAIL
              </Badge>
            )}
          </div>
        </div>

        {/* Responsive 4-card Grid (2 columns on desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-6">
          {/* Card 1: Strengths */}
          <Card className="border-l-4 border-l-emerald-500 bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-emerald-800">
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {report.strengths}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Areas for Improvement */}
          <Card className="border-l-4 border-l-amber-500 bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-amber-800">
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {report.weaknesses}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Topics to Revise */}
          <Card className="border-l-4 border-l-blue-500 bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-blue-800">
                Topics to Revise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {report.revision_areas}
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Interviewer's Verdict */}
          <Card className="border-l-4 border-l-slate-400 bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">
                Interviewer&apos;s Verdict
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {report.verdict}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Start New Interview Button */}
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            onClick={() => router.push("/")}
            className="w-full sm:w-auto h-11 px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all duration-200 shadow-md"
          >
            Start New Interview
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen w-full bg-slate-950 text-slate-100 py-6 sm:py-10 px-4 sm:px-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-[800px] bg-slate-50 text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-10 border border-slate-200 space-y-8">
            <Skeleton className="h-8 w-48 mx-auto bg-slate-200" />
            <Skeleton className="h-32 w-full bg-slate-200" />
          </div>
        </main>
      }
    >
      <ReportContent />
    </Suspense>
  );
}
