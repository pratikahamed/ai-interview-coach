"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}

function parseSearchParamString(param: string | null): string {
  if (!param) return "";
  try {
    return decodeURIComponent(param);
  } catch {
    return param;
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

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL search parameters
  const rawTopic = searchParams.get("topic");
  const rawDifficulty = searchParams.get("difficulty");
  const rawFirstMessage = searchParams.get("firstMessage");
  const rawConversationHistory = searchParams.get("conversationHistory");

  const topic = rawTopic ? decodeURIComponent(rawTopic) : "Technical Interview";
  const difficulty = rawDifficulty ? decodeURIComponent(rawDifficulty) : "Medium";
  const firstMessage = parseSearchParamString(rawFirstMessage);
  const parsedHistory = parseConversationHistoryParam(rawConversationHistory);

  // Initialize state variables
  const [messages, setMessages] = useState<Message[]>(() => {
    if (firstMessage) {
      return [{ role: "assistant", content: firstMessage }];
    }
    if (parsedHistory.length > 0 && parsedHistory[0].role === "assistant") {
      return [{ role: "assistant", content: parsedHistory[0].content }];
    }
    return [
      {
        role: "assistant",
        content: "Hello! I am your AI interviewer today. Let's begin the interview.",
      },
    ];
  });

  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: string; content: string }>
  >(() => {
    if (parsedHistory.length > 0) {
      return parsedHistory;
    }
    if (firstMessage) {
      return [{ role: "assistant", content: firstMessage }];
    }
    return [];
  });

  const [currentInput, setCurrentInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the bottom after each new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmitAnswer = async () => {
    const trimmedInput = currentInput.trim();
    if (!trimmedInput || isLoading) {
      return;
    }

    setErrorMessage(null);

    // 2. Add the user message to messages with role "user"
    const newUserMessage: Message = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, newUserMessage]);

    // 3. Set isLoading to true, clear currentInput
    setIsLoading(true);
    setCurrentInput("");

    // 4. Make a POST request to NEXT_PUBLIC_API_URL + /api/interview/answer
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/api/interview/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          difficulty,
          user_answer: trimmedInput,
          conversation_history: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from interviewer");
      }

      const data = await response.json();

      // 5. When the response arrives:
      // - Add the ai_message to messages with role "assistant"
      const newAiMessage: Message = {
        role: "assistant",
        content: data.ai_message,
      };
      setMessages((prev) => [...prev, newAiMessage]);

      // - Update conversationHistory with the returned conversation_history
      setConversationHistory(data.conversation_history);

      // - If is_complete is true: navigate to /report
      if (data.is_complete) {
        const encodedHistory = encodeURIComponent(
          JSON.stringify(data.conversation_history)
        );
        router.push(
          `/report?topic=${encodeURIComponent(
            topic
          )}&difficulty=${encodeURIComponent(
            difficulty
          )}&conversationHistory=${encodedHistory}`
        );
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      setErrorMessage("Failed to send your answer. Please try again.");
    } finally {
      // - Set isLoading to false
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-slate-100 animate-fade-in selection:bg-slate-800 selection:text-white overflow-hidden">
      {/* Part 1: Top header bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Badge
            variant="secondary"
            className="px-3 py-1 bg-slate-800 text-slate-200 border-slate-700 text-xs sm:text-sm font-medium"
          >
            {topic}
          </Badge>
          <Badge
            variant="outline"
            className="px-3 py-1 border-slate-700 bg-slate-800/40 text-slate-300 text-xs sm:text-sm font-medium"
          >
            {difficulty}
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Interview in progress</span>
        </div>
      </header>

      {/* Part 2: Scrollable chat area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message, index) => {
            const isAssistant = message.role === "assistant";
            return (
              <div
                key={index}
                className={`flex flex-col ${
                  isAssistant
                    ? "items-start max-w-[85%] sm:max-w-[75%]"
                    : "items-end max-w-[85%] sm:max-w-[75%] ml-auto"
                }`}
              >
                {/* Role label */}
                <span
                  className={`text-xs font-semibold mb-1.5 ${
                    isAssistant ? "text-slate-400 ml-1" : "text-blue-300 mr-1"
                  }`}
                >
                  {isAssistant ? "Interviewer" : "You"}
                </span>

                {/* Card-like bubble */}
                <div
                  className={`rounded-2xl px-5 py-3.5 shadow-md leading-relaxed text-sm sm:text-base whitespace-pre-wrap break-words ${
                    isAssistant
                      ? "rounded-tl-sm bg-slate-800 text-white border border-slate-700/60"
                      : "rounded-tr-sm bg-blue-600 text-white"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            );
          })}

          {/* Assistant thinking indicator in chat area */}
          {isLoading && (
            <div className="flex flex-col items-start max-w-[85%] sm:max-w-[75%] animate-pulse">
              <span className="text-xs font-semibold text-slate-400 mb-1.5 ml-1">
                Interviewer
              </span>
              <div className="rounded-2xl rounded-tl-sm px-5 py-3.5 bg-slate-800 text-slate-300 border border-slate-700/60 text-sm flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-1 text-slate-400 text-xs">
                  AI is thinking...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Part 3: Input area at the bottom */}
      <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {errorMessage && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs sm:text-sm text-red-400 text-center">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <Textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer here..."
              disabled={isLoading}
              rows={2}
              className="resize-none flex-1 min-h-[56px] max-h-36 border-slate-700 bg-slate-800/80 text-slate-100 placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:ring-slate-400/20"
            />
            <Button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={isLoading || !currentInput.trim()}
              className="w-full sm:w-auto h-[56px] px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all duration-200 shadow-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "AI is thinking..." : "Submit Answer"}
            </Button>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
            <span>Press Enter to submit, Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium">Loading interview session...</span>
          </div>
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
