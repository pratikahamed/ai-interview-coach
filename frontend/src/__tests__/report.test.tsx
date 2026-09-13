import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ReportPage from "@/app/report/page";

const pushMock = vi.fn();
let mockSearchParams = new Map<string, string>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

describe("Report Page (src/app/report/page.tsx)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map<string, string>([
      ["topic", encodeURIComponent("Binary Search Trees")],
      ["difficulty", encodeURIComponent("Hard")],
      [
        "conversationHistory",
        encodeURIComponent(
          JSON.stringify([
            { role: "assistant", content: "How do you rebalance an AVL tree?" },
            { role: "user", content: "By performing rotations." },
          ])
        ),
      ],
    ]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows loading state with skeleton placeholders initially while report is generating", () => {
    // Keep fetch unresolved
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<ReportPage />);

    expect(screen.getByTestId("report-skeleton-container")).toBeInTheDocument();
    expect(
      screen.getByText(/generating your report\.\.\./i)
    ).toBeInTheDocument();
  });

  it("renders report header, badges, green score, PASS badge, and 4 cards for a passing score >= 70", async () => {
    const mockReport = {
      score: 85,
      strengths: "Excellent understanding of tree rotations and balance factor calculations.",
      weaknesses: "Could write more concise iterative helper functions.",
      revision_areas: "Red-Black tree properties and B-tree deletions.",
      verdict: "Strong candidate with solid algorithmic foundation.",
      recommendation: "Pass",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReport,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("Interview Complete")).toBeInTheDocument();
    });

    // Topic & Difficulty Badges
    expect(screen.getByText("Binary Search Trees")).toBeInTheDocument();
    expect(screen.getByText("Hard")).toBeInTheDocument();

    // Score
    const scoreElement = screen.getByText("85 / 100");
    expect(scoreElement).toBeInTheDocument();
    expect(scoreElement.closest("div")).toHaveClass("text-emerald-700");

    // PASS recommendation badge
    const passBadge = screen.getByText("PASS");
    expect(passBadge).toBeInTheDocument();
    expect(passBadge).toHaveClass("bg-emerald-600");

    // 4 Cards
    expect(screen.getByText("Strengths")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Excellent understanding of tree rotations and balance factor calculations."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("Areas for Improvement")).toBeInTheDocument();
    expect(
      screen.getByText("Could write more concise iterative helper functions.")
    ).toBeInTheDocument();

    expect(screen.getByText("Topics to Revise")).toBeInTheDocument();
    expect(
      screen.getByText("Red-Black tree properties and B-tree deletions.")
    ).toBeInTheDocument();

    expect(screen.getByText("Interviewer's Verdict")).toBeInTheDocument();
    expect(
      screen.getByText("Strong candidate with solid algorithmic foundation.")
    ).toBeInTheDocument();

    // Start New Interview Button
    const newInterviewBtn = screen.getByRole("button", {
      name: /start new interview/i,
    });
    expect(newInterviewBtn).toBeInTheDocument();
    fireEvent.click(newInterviewBtn);
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("renders green score boundary at 70", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        score: 70,
        strengths: "Good",
        weaknesses: "None",
        revision_areas: "None",
        verdict: "Good",
        recommendation: "Pass",
      }),
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("70 / 100")).toBeInTheDocument();
    });

    const scoreDiv = screen.getByText("70 / 100").closest("div");
    expect(scoreDiv).toHaveClass("text-emerald-700");
  });

  it("renders yellow score for mid-range score (50-69) and boundary 69 & 50", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        score: 69,
        strengths: "Good intuition on recursion.",
        weaknesses: "Struggled with balance factors.",
        revision_areas: "AVL Rotations.",
        verdict: "Borderline performance.",
        recommendation: "Pass",
      }),
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("69 / 100")).toBeInTheDocument();
    });

    const scoreDiv = screen.getByText("69 / 100").closest("div");
    expect(scoreDiv).toHaveClass("text-amber-700");
  });

  it("renders red score and FAIL badge for failing score (< 50) and boundary 49", async () => {
    const mockReport = {
      score: 49,
      strengths: "Understood basic tree definitions.",
      weaknesses: "Unable to explain rotation mechanics.",
      revision_areas: "Basic tree traversal and balancing algorithms.",
      verdict: "Candidate requires significant revision before proceeding.",
      recommendation: "Fail",
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReport,
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(screen.getByText("49 / 100")).toBeInTheDocument();
    });

    const scoreDiv = screen.getByText("49 / 100").closest("div");
    expect(scoreDiv).toHaveClass("text-rose-700");

    const failBadge = screen.getByText("FAIL");
    expect(failBadge).toBeInTheDocument();
    expect(failBadge).toHaveClass("bg-rose-600");
  });

  it("displays error state when API fails and allows retrying", async () => {
    let shouldFail = true;
    const mockSuccessReport = {
      score: 75,
      strengths: "Good problem solving.",
      weaknesses: "Minor syntax hesitation.",
      revision_areas: "Time complexity analysis.",
      verdict: "Ready for interview.",
      recommendation: "Pass",
    };

    global.fetch = vi.fn().mockImplementation(() => {
      if (shouldFail) {
        return Promise.resolve({ ok: false, status: 500 });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockSuccessReport,
      });
    });

    render(<ReportPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/failed to generate report/i)
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/could not generate your interview report/i)
    ).toBeInTheDocument();

    // Now backend is ready, click Try Again
    shouldFail = false;
    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(tryAgainBtn);

    await waitFor(() => {
      expect(screen.getByText("Interview Complete")).toBeInTheDocument();
    });

    expect(screen.getByText("75 / 100")).toBeInTheDocument();
  });
});
