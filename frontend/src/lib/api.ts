const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StartInterviewResponse {
  first_message: string;
  conversation_history: Message[];
}

export interface AnswerInterviewResponse {
  ai_message: string;
  is_complete: boolean;
  conversation_history: Message[];
}

export interface InterviewReport {
  score: number;
  strengths: string;
  weaknesses: string;
  revision_areas: string;
  verdict: string;
  recommendation: "Pass" | "Fail" | string;
}

export async function startInterview(
  topic: string,
  difficulty: string
): Promise<StartInterviewResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interview/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, difficulty }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to start interview (${response.status})`);
  }

  return response.json();
}

export async function submitAnswer(
  topic: string,
  difficulty: string,
  user_answer: string,
  conversation_history: Message[]
): Promise<AnswerInterviewResponse> {
  const response = await fetch(`${API_BASE_URL}/api/interview/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      difficulty,
      user_answer,
      conversation_history,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to submit answer (${response.status})`);
  }

  return response.json();
}

export async function generateReport(
  topic: string,
  difficulty: string,
  conversation_history: Message[]
): Promise<InterviewReport> {
  const response = await fetch(`${API_BASE_URL}/api/report/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      difficulty,
      conversation_history,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to generate report (${response.status})`);
  }

  return response.json();
}
