import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Home from "@/app/page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

describe("Landing Page (src/app/page.tsx)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (
        typeof url === "string" &&
        (url.includes("/health") || url.endsWith("/"))
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: "healthy",
            message: "AI Interview Coach API is running",
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders the application title, subtitle, and footer text", async () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: /ai interview coach/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /practice technical interviews with an ai-powered interviewer\. get real feedback\. improve fast\./i
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText(/powered by ai\. built for learners\./i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/backend server connected & healthy/i)
      ).toBeInTheDocument();
    });
  });

  it("renders the input labeled 'Interview Topic' and the 'Start Interview' button", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/backend server connected & healthy/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/interview topic/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
      )
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/difficulty level/i)).toBeInTheDocument();

    const submitButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    expect(submitButton).toBeInTheDocument();
  });

  it("displays an inline validation error when submitting with empty fields", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/backend server connected & healthy/i)
      ).toBeInTheDocument();
    });

    const submitButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    fireEvent.click(submitButton);

    expect(
      screen.getByText(
        /please enter an interview topic and select a difficulty level\./i
      )
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("displays validation error when only topic is entered but difficulty is missing", async () => {
    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/backend server connected & healthy/i)
      ).toBeInTheDocument();
    });

    const topicInput = screen.getByPlaceholderText(
      "e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
    );
    fireEvent.change(topicInput, { target: { value: "Graph Theory" } });

    const submitButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    fireEvent.click(submitButton);

    expect(
      screen.getByText(
        /please enter an interview topic and select a difficulty level\./i
      )
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("handles successful submission, shows loading state, and navigates with encoded search params", async () => {
    const user = userEvent.setup();
    const mockApiResponse = {
      first_message: "Can you explain Dijkstra's algorithm?",
      conversation_history: [
        { role: "assistant", content: "Can you explain Dijkstra's algorithm?" },
      ],
    };

    let resolveFetch!: (value: {
      ok: boolean;
      json: () => Promise<typeof mockApiResponse>;
    }) => void;
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (
        typeof url === "string" &&
        (url.includes("/health") || url.endsWith("/"))
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "healthy" }),
        });
      }
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    });

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/backend server connected & healthy/i)
      ).toBeInTheDocument();
    });

    // Fill topic
    const topicInput = screen.getByPlaceholderText(
      "e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
    );
    await user.type(topicInput, "Graphs & Shortest Path");

    // Open select dropdown and choose Medium
    const selectTrigger = screen.getByLabelText(/difficulty level/i);
    await user.click(selectTrigger);

    // Click the "Medium" option
    const mediumOption = await screen.findByRole("option", { name: "Medium" });
    await user.click(mediumOption);

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    await user.click(submitButton);

    // Verify loading state during pending API call
    expect(
      screen.getByRole("button", { name: /starting interview\.\.\./i })
    ).toBeDisabled();

    // Resolve the API call
    resolveFetch({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Await navigation
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledTimes(1);
    });

    const pushedUrl: string = pushMock.mock.calls[0][0];
    expect(pushedUrl).toContain("/interview?");
    expect(pushedUrl).toContain(
      "topic=" + encodeURIComponent("Graphs & Shortest Path")
    );
    expect(pushedUrl).toContain("difficulty=Medium");
    expect(pushedUrl).toContain(
      "firstMessage=" +
        encodeURIComponent("Can you explain Dijkstra's algorithm?")
    );
    expect(pushedUrl).toContain(
      "conversationHistory=" +
        encodeURIComponent(JSON.stringify(mockApiResponse.conversation_history))
    );
  });

  it("shows error message when the API request fails with 500", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (
        typeof url === "string" &&
        (url.includes("/health") || url.endsWith("/"))
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "healthy" }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({ detail: "Internal Server Error" }),
      });
    });

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByText(/backend server connected & healthy/i)
      ).toBeInTheDocument();
    });

    const topicInput = screen.getByPlaceholderText(
      "e.g. Binary Trees, Sorting Algorithms, Dynamic Programming"
    );
    await user.type(topicInput, "Dynamic Programming");

    // Open select dropdown and choose Hard
    const selectTrigger = screen.getByLabelText(/difficulty level/i);
    await user.click(selectTrigger);
    const hardOption = await screen.findByRole("option", { name: "Hard" });
    await user.click(hardOption);

    const submitButton = screen.getByRole("button", {
      name: /start interview/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again.")
      ).toBeInTheDocument();
    });

    // Verify button is restored and enabled
    expect(
      screen.getByRole("button", { name: /start interview/i })
    ).toBeEnabled();
  });

  it("displays prominent backend offline banner, instructions, and disables submit when backend is unreachable", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByTestId("backend-offline-banner")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/backend server offline or unhealthy/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/cd backend/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /\.\\\.venv\\Scripts\\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload/i
      )
    ).toBeInTheDocument();

    const submitButton = screen.getByRole("button", {
      name: /backend offline — start backend first/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("allows retrying connection from offline banner when backend comes back online", async () => {
    let shouldFail = true;
    global.fetch = vi.fn().mockImplementation(() => {
      if (shouldFail) {
        return Promise.reject(new Error("Failed to fetch"));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ status: "healthy" }),
      });
    });

    render(<Home />);

    await waitFor(() => {
      expect(
        screen.getByTestId("backend-offline-banner")
      ).toBeInTheDocument();
    });

    // Backend comes back online
    shouldFail = false;

    const retryButton = screen.getByRole("button", {
      name: /retry connection/i,
    });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(
        screen.queryByTestId("backend-offline-banner")
      ).not.toBeInTheDocument();
    });

    expect(
      screen.getByText(/backend server connected & healthy/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start interview/i })
    ).toBeEnabled();
  });
});
