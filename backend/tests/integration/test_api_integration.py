import os
import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

# Verify that GROQ_API_KEY is present for integration tests
has_groq_key = bool(os.getenv("GROQ_API_KEY", "").strip())
pytestmark = pytest.mark.skipif(
    not has_groq_key,
    reason="Live integration tests require GROQ_API_KEY to be set in backend/.env",
)


class TestApiIntegrationLive:
    """
    Live end-to-end integration tests for all backend API endpoints
    communicating with the Groq LLM service.
    """

    def test_health_check_endpoint(self, client: TestClient):
        """Verify the health check endpoint returns 200 and expected status."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "AI Interview Coach API is running" in data["message"]

    def test_start_interview_live(self, client: TestClient):
        """Verify POST /api/interview/start generates a valid opening question from Groq."""
        payload = {
            "topic": "Python",
            "difficulty": "Easy",
        }
        response = client.post("/api/interview/start", json=payload)
        assert response.status_code == 200, f"API failed with: {response.text}"

        data = response.json()
        assert "first_message" in data
        assert "conversation_history" in data

        first_message = data["first_message"]
        assert isinstance(first_message, str)
        assert len(first_message.strip()) > 10, "Opening question should be substantive."

        history = data["conversation_history"]
        assert isinstance(history, list)
        assert len(history) == 1
        assert history[0]["role"] == "assistant"
        assert history[0]["content"] == first_message

    def test_interview_full_turn_flow(self, client: TestClient):
        """
        Verify the interactive flow:
        1. Start interview
        2. Provide answer to opening question
        3. Receive follow-up question
        """
        # Step 1: Start interview
        start_payload = {"topic": "Python", "difficulty": "Easy"}
        start_res = client.post("/api/interview/start", json=start_payload)
        assert start_res.status_code == 200
        start_data = start_res.json()
        history = start_data["conversation_history"]

        # Step 2: Answer the question
        answer_payload = {
            "topic": "Python",
            "difficulty": "Easy",
            "user_answer": "In Python, a list is mutable and defined with square brackets, while a tuple is immutable and defined with parentheses.",
            "conversation_history": history,
        }
        answer_res = client.post("/api/interview/answer", json=answer_payload)
        assert answer_res.status_code == 200, f"Answer failed with: {answer_res.text}"

        answer_data = answer_res.json()
        assert "ai_message" in answer_data
        assert "is_complete" in answer_data
        assert "conversation_history" in answer_data

        ai_message = answer_data["ai_message"]
        assert isinstance(ai_message, str)
        assert len(ai_message.strip()) > 10

        is_complete = answer_data["is_complete"]
        assert isinstance(is_complete, bool)

        updated_history = answer_data["conversation_history"]
        assert len(updated_history) == 3
        assert updated_history[0]["role"] == "assistant"
        assert updated_history[1]["role"] == "user"
        assert updated_history[2]["role"] == "assistant"
        assert updated_history[2]["content"] == ai_message

    def test_generate_report_live(self, client: TestClient, sample_conversation_history):
        """
        Verify POST /api/report/generate produces a structured report adhering to GenerateReportResponse schema.
        """
        payload = {
            "topic": "Python",
            "difficulty": "Medium",
            "conversation_history": sample_conversation_history,
        }
        response = client.post("/api/report/generate", json=payload)
        assert response.status_code == 200, f"Report generation failed with: {response.text}"

        report = response.json()
        # Verify schema keys
        for expected_key in ["score", "strengths", "weaknesses", "revision_areas", "verdict", "recommendation"]:
            assert expected_key in report, f"Missing key '{expected_key}' in report"

        # Verify types and constraints
        assert isinstance(report["score"], int)
        assert 0 <= report["score"] <= 100
        assert report["recommendation"] in ["Pass", "Fail"]
        assert len(report["strengths"].strip()) > 10
        assert len(report["weaknesses"].strip()) > 10
        assert len(report["revision_areas"].strip()) > 5
        assert len(report["verdict"].strip()) > 10

    def test_validation_errors_live(self, client: TestClient):
        """Verify API responds with 422 Unprocessable Entity on missing required payload fields."""
        # Missing topic
        bad_start = client.post("/api/interview/start", json={"difficulty": "Easy"})
        assert bad_start.status_code == 422

        # Missing user_answer
        bad_answer = client.post(
            "/api/interview/answer",
            json={"topic": "Python", "difficulty": "Easy", "conversation_history": []},
        )
        assert bad_answer.status_code == 422

        # Missing topic for report
        bad_report = client.post("/api/report/generate", json={"difficulty": "Hard"})
        assert bad_report.status_code == 422
