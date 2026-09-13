"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Backend health state: "checking" | "healthy" | "unhealthy"
  const [backendStatus, setBackendStatus] = useState<"checking" | "healthy" | "unhealthy">("checking");
  const [isRetryingHealth, setIsRetryingHealth] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const checkBackendHealth = useCallback(async () => {
    setIsRetryingHealth(true);
    try {
      const response = await fetch(`${apiUrl}/health`, { method: "GET" }).catch(async () => {
        return await fetch(`${apiUrl}/`, { method: "GET" });
      });

      if (response && response.ok) {
        setBackendStatus("healthy");
      } else {
        setBackendStatus("unhealthy");
      }
    } catch {
      setBackendStatus("unhealthy");
    } finally {
      setIsRetryingHealth(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate that both topic and difficulty are filled in
    if (!topic.trim() || !difficulty.trim()) {
      setErrorMessage("Please enter an interview topic and select a difficulty level.");
      return;
    }

    // If backend is detected as unhealthy, block submission with a clear error
    if (backendStatus === "unhealthy") {
      setErrorMessage(
        `Backend server is offline or unreachable at ${apiUrl}. Please start the backend server before beginning an interview.`
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/interview/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty: difficulty.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      const data = await response.json();

      const encodedFirstMessage = encodeURIComponent(data.first_message);
      const encodedConversationHistory = encodeURIComponent(
        JSON.stringify(data.conversation_history)
      );

      router.push(
        `/interview?topic=${encodeURIComponent(
          topic.trim()
        )}&difficulty=${encodeURIComponent(
          difficulty.trim()
        )}&firstMessage=${encodedFirstMessage}&conversationHistory=${encodedConversationHistory}`
      );
    } catch (error) {
      console.error("Failed to start interview session:", error);
      if (error instanceof Error && error.message === "Failed to start interview") {
        setErrorMessage("Something went wrong. Please try again.");
      } else {
        setBackendStatus("unhealthy");
        setErrorMessage(
          `Cannot connect to backend server at ${apiUrl}. Please ensure the backend is running and healthy.`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 animate-fade-in selection:bg-slate-800 selection:text-white">
      {/* Container */}
      <div className="w-full max-w-lg flex flex-col items-center">
        {/* Title and Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            AI Interview Coach
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Practice technical interviews with an AI-powered interviewer. Get real
            feedback. Improve fast.
          </p>
        </div>

        {/* Backend Unhealthy / Offline Alert Banner */}
        {backendStatus === "unhealthy" && (
          <div
            data-testid="backend-offline-banner"
            className="w-full mb-6 rounded-xl bg-red-950/80 border-2 border-red-500/80 p-4 sm:p-5 text-red-100 shadow-2xl space-y-3 animate-in fade-in duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-red-200">
                  Backend Server Offline or Unhealthy
                </h3>
                <p className="text-xs sm:text-sm text-red-300/90 leading-relaxed">
                  Cannot connect to the API at{" "}
                  <code className="font-mono bg-red-900/60 px-1.5 py-0.5 rounded text-red-100 font-semibold">
                    {apiUrl}
                  </code>
                  . The AI Interview Coach requires the FastAPI backend to generate questions and feedback.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 rounded-lg p-3 border border-red-500/30 text-xs font-mono text-slate-300">
              <p className="text-slate-400 mb-1.5 font-sans text-[11px] font-semibold uppercase tracking-wider">
                Start Backend Server in Terminal:
              </p>
              <div className="space-y-1 select-all text-emerald-400">
                <p>cd backend</p>
                <p>.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={checkBackendHealth}
                disabled={isRetryingHealth}
                className="h-8 text-xs font-medium border-red-500/50 hover:bg-red-900/40 text-red-200"
              >
                {isRetryingHealth ? "Checking..." : "Retry Connection"}
              </Button>
            </div>
          </div>
        )}

        {/* Backend Connected Indicator */}
        {backendStatus === "healthy" && (
          <div className="flex items-center gap-2 mb-4 text-xs text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Backend Server Connected & Healthy</span>
          </div>
        )}

        {/* Main Form Card */}
        <Card className="w-full border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-sm rounded-xl">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Interview Topic Field */}
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-sm font-medium text-slate-200">
                  Interview Topic
                </Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isLoading || backendStatus === "unhealthy"}
                  className="h-10 w-full border-slate-700 bg-slate-800/80 text-slate-100 placeholder:text-slate-500 focus:border-slate-400 focus:ring-slate-400/20 disabled:opacity-50"
                />
              </div>

              {/* Difficulty Level Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium text-slate-200">
                  Difficulty Level
                </Label>
                <Select
                  value={difficulty}
                  onValueChange={(val: string | null) => setDifficulty(val || "")}
                  disabled={isLoading || backendStatus === "unhealthy"}
                >
                  <SelectTrigger
                    id="difficulty"
                    className="w-full h-10 border-slate-700 bg-slate-800/80 text-slate-100 focus:border-slate-400 focus:ring-slate-400/20 disabled:opacity-50"
                  >
                    <SelectValue placeholder="Select difficulty level" />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900 text-slate-100 shadow-xl">
                    <SelectItem value="Easy" className="cursor-pointer focus:bg-slate-800 focus:text-white">
                      Easy
                    </SelectItem>
                    <SelectItem value="Medium" className="cursor-pointer focus:bg-slate-800 focus:text-white">
                      Medium
                    </SelectItem>
                    <SelectItem value="Hard" className="cursor-pointer focus:bg-slate-800 focus:text-white">
                      Hard
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inline Error Message */}
              {errorMessage && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400 text-center">
                  {errorMessage}
                </div>
              )}

              {/* Start Interview Button */}
              <Button
                type="submit"
                disabled={isLoading || backendStatus === "unhealthy"}
                className="w-full h-10 bg-slate-100 hover:bg-white text-slate-950 font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {backendStatus === "unhealthy"
                  ? "Backend Offline — Start Backend First"
                  : isLoading
                  ? "Starting Interview..."
                  : "Start Interview"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Subtext */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Powered by AI. Built for learners.
        </p>
      </div>
    </main>
  );
}
