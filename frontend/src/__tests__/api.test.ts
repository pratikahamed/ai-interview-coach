import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { startInterview, submitAnswer, generateReport } from "@/lib/api";

describe("API client module (src/lib/api.ts)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("startInterview", () => {
    it("sends correct POST payload and parses response", async () => {
      const mockResponseData = {
        first_message: "What is a hash collision and how do you resolve it?",
        conversation_history: [
          {
            role: "assistant",
            content: "What is a hash collision and how do you resolve it?",
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponseData,
      });

      const result = await startInterview("Data Structures", "Medium");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain("/api/interview/start");
      expect(options?.method).toBe("POST");
      expect((options?.headers as Record<string, string>)["Content-Type"]).toBe(
        "application/json"
      );
      expect(JSON.parse(options?.body as string)).toEqual({
        topic: "Data Structures",
        difficulty: "Medium",
      });
      expect(result).toEqual(mockResponseData);
    });

    it("throws error with server detail when API response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: "Invalid difficulty calibration" }),
      });

      await expect(startInterview("Python", "Impossible")).rejects.toThrow(
        "Invalid difficulty calibration"
      );
    });

    it("throws fallback error when server fails without json detail", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("Cannot parse");
        },
      });

      await expect(startInterview("Python", "Easy")).rejects.toThrow(
        "Failed to start interview (500)"
      );
    });
  });

  describe("submitAnswer", () => {
    it("sends user answer with updated history and returns follow-up", async () => {
      const mockAnswerResponse = {
        ai_message: "Good explanation. How about chaining vs open addressing?",
        is_complete: false,
        conversation_history: [
          { role: "assistant", content: "What is a hash collision?" },
          { role: "user", content: "When two keys hash to the same bucket." },
          {
            role: "assistant",
            content: "Good explanation. How about chaining vs open addressing?",
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAnswerResponse,
      });

      const initialHistory = [
        { role: "assistant" as const, content: "What is a hash collision?" },
      ];
      const result = await submitAnswer(
        "Data Structures",
        "Medium",
        "When two keys hash to the same bucket.",
        initialHistory
      );

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain("/api/interview/answer");
      expect(JSON.parse(options?.body as string)).toEqual({
        topic: "Data Structures",
        difficulty: "Medium",
        user_answer: "When two keys hash to the same bucket.",
        conversation_history: initialHistory,
      });
      expect(result).toEqual(mockAnswerResponse);
    });
  });

  describe("generateReport", () => {
    it("sends conversation transcript and returns evaluation report", async () => {
      const mockReportData = {
        score: 88,
        strengths: "Solid understanding of algorithm fundamentals.",
        weaknesses: "Slight hesitation on amortization complexities.",
        revision_areas: "Amortized Analysis, Red-Black Trees",
        verdict: "Strong candidate with solid problem-solving foundation.",
        recommendation: "Pass",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockReportData,
      });

      const history = [
        { role: "assistant" as const, content: "Question 1" },
        { role: "user" as const, content: "Answer 1" },
      ];

      const report = await generateReport("Algorithms", "Hard", history);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toContain("/api/report/generate");
      expect(report).toEqual(mockReportData);
    });
  });
});
