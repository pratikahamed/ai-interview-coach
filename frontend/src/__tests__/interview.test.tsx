import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import InterviewPage from "@/app/interview/page";

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

describe("Interview Page (src/app/interview/page.tsx)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new Map<string, string>([
      ["topic", encodeURIComponent("Binary Trees")],
      ["difficulty", encodeURIComponent("Medium")],
      [
        "firstMessage",
        encodeURIComponent("Can you explain how to invert a binary tree?"),
      ],
      [
        "conversationHistory",
        encodeURIComponent(
          JSON.stringify([
            {
              role: "assistant",
              content: "Can you explain how to invert a binary tree?",
            },
          ])
        ),
      ],
    ]);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders Part 1 Header: topic and difficulty badges and status text", () => {
    render(<InterviewPage />);

    // Badges
    expect(screen.getByText("Binary Trees")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();

    // Subtle status text
    expect(screen.getByText(/interview in progress/i)).toBeInTheDocument();
  });

  it("renders Part 2 Chat Area: initial AI firstMessage labeled Interviewer", () => {
    render(<InterviewPage />);

    expect(screen.getByText("Interviewer")).toBeInTheDocument();
    expect(
      screen.getByText("Can you explain how to invert a binary tree?")
    ).toBeInTheDocument();
  });

  it("renders Part 3 Input Area: textarea with placeholder and Submit Answer button", () => {
    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    expect(textarea).toBeInTheDocument();

    const submitButton = screen.getByRole("button", {
      name: /submit answer/i,
    });
    expect(submitButton).toBeInTheDocument();
    // Empty input: button should be disabled
    expect(submitButton).toBeDisabled();
  });

  it("does not submit when currentInput is empty or whitespace only", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(textarea, { target: { value: "   " } });

    const submitButton = screen.getByRole("button", {
      name: /submit answer/i,
    });
    fireEvent.click(submitButton);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("submits user answer, displays User message with You label, shows loading state, and handles AI response", async () => {
    const user = userEvent.setup();
    const mockApiResponse = {
      ai_message: "Great! Now how would you do it iteratively?",
      is_complete: false,
      conversation_history: [
        {
          role: "assistant",
          content: "Can you explain how to invert a binary tree?",
        },
        {
          role: "user",
          content: "You swap the left and right children recursively.",
        },
        {
          role: "assistant",
          content: "Great! Now how would you do it iteratively?",
        },
      ],
    };

    let resolveFetch!: (value: {
      ok: boolean;
      json: () => Promise<typeof mockApiResponse>;
    }) => void;
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    await user.type(
      textarea,
      "You swap the left and right children recursively."
    );

    const submitButton = screen.getByRole("button", {
      name: /submit answer/i,
    });
    expect(submitButton).toBeEnabled();
    await user.click(submitButton);

    // User message should appear immediately labeled with "You"
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(
      screen.getByText("You swap the left and right children recursively.")
    ).toBeInTheDocument();

    // Loading state: textarea is disabled and button says "AI is thinking..."
    expect(textarea).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /ai is thinking\.\.\./i })
    ).toBeDisabled();

    // Verify payload sent to API
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/interview/answer"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: "Binary Trees",
          difficulty: "Medium",
          user_answer: "You swap the left and right children recursively.",
          conversation_history: [
            {
              role: "assistant",
              content: "Can you explain how to invert a binary tree?",
            },
          ],
        }),
      })
    );

    // Resolve API response
    resolveFetch({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Verify AI response appears in chat
    await waitFor(() => {
      expect(
        screen.getByText("Great! Now how would you do it iteratively?")
      ).toBeInTheDocument();
    });

    // Loading state removed
    expect(textarea).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /submit answer/i })
    ).toBeInTheDocument();
  });

  it("submits answer on Enter key press alone", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ai_message: "Next question",
        is_complete: false,
        conversation_history: [],
      }),
    });

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(textarea, { target: { value: "My answer via Enter" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/interview/answer"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("My answer via Enter"),
        })
      );
    });
  });

  it("does not submit answer on Shift+Enter key press (allows newline)", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    fireEvent.change(textarea, { target: { value: "First line" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("navigates to /report when is_complete is true in the API response", async () => {
    const user = userEvent.setup();
    const completedHistory = [
      {
        role: "assistant",
        content: "Can you explain how to invert a binary tree?",
      },
      {
        role: "user",
        content: "We use a queue to swap level by level.",
      },
      {
        role: "assistant",
        content: "Thank you, that concludes our interview!",
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ai_message: "Thank you, that concludes our interview!",
        is_complete: true,
        conversation_history: completedHistory,
      }),
    });

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    await user.type(textarea, "We use a queue to swap level by level.");

    const submitButton = screen.getByRole("button", {
      name: /submit answer/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
    });

    const pushedUrl: string = pushMock.mock.calls[0][0];
    expect(pushedUrl).toContain("/report?");
    expect(pushedUrl).toContain("topic=" + encodeURIComponent("Binary Trees"));
    expect(pushedUrl).toContain("difficulty=" + encodeURIComponent("Medium"));
    expect(pushedUrl).toContain(
      "conversationHistory=" +
        encodeURIComponent(JSON.stringify(completedHistory))
    );
  });

  it("displays error message if API fails and restores input capability", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Backend failure" }),
    });

    render(<InterviewPage />);

    const textarea = screen.getByPlaceholderText("Type your answer here...");
    await user.type(textarea, "My solution attempt.");

    const submitButton = screen.getByRole("button", {
      name: /submit answer/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to send your answer. Please try again.")
      ).toBeInTheDocument();
    });

    expect(textarea).toBeEnabled();
  });
});
