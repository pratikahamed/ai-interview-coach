import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app


class TestRootAndHealthEndpoints:
    """Unit tests for root and health check endpoint."""

    def test_read_root_success(self, client: TestClient):
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"message": "AI Interview Coach API is running"}

    def test_read_health_success(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "message": "AI Interview Coach API is running"}

    def test_global_exception_handler_returns_friendly_json(self):
        @app.get("/test-unhandled-crash")
        def trigger_crash():
            raise RuntimeError("Simulated unexpected crash")

        no_raise_client = TestClient(app, raise_server_exceptions=False)
        response = no_raise_client.get("/test-unhandled-crash")
        assert response.status_code == 500
        assert response.json() == {
            "detail": "An unexpected error occurred. Please try again later."
        }


class TestInterviewRouterUnit:
    """Unit tests for /api/interview routes using mocked llm_service."""

    @patch("routers.interview.get_next_interviewer_message")
    def test_start_interview_success(self, mock_get_msg, client: TestClient):
        mock_get_msg.return_value = ("Can you explain how async/await works in Python?", False)

        payload = {"topic": "Python", "difficulty": "Medium"}
        response = client.post("/api/interview/start", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["first_message"] == "Can you explain how async/await works in Python?"
        assert len(data["conversation_history"]) == 1
        assert data["conversation_history"][0] == {
            "role": "assistant",
            "content": "Can you explain how async/await works in Python?",
        }
        mock_get_msg.assert_called_once_with(
            topic="Python",
            difficulty="Medium",
            conversation_history=[],
        )

    def test_start_interview_missing_fields_validation(self, client: TestClient):
        # Empty topic
        response = client.post("/api/interview/start", json={"topic": "", "difficulty": "Easy"})
        assert response.status_code == 422

        # Missing difficulty
        response = client.post("/api/interview/start", json={"topic": "Python"})
        assert response.status_code == 422

    @patch("routers.interview.get_next_interviewer_message")
    def test_start_interview_value_error_handled(self, mock_get_msg, client: TestClient):
        mock_get_msg.side_effect = ValueError("Invalid difficulty calibration")

        response = client.post("/api/interview/start", json={"topic": "Python", "difficulty": "Easy"})
        assert response.status_code == 400
        assert "Invalid request parameters" in response.json()["detail"]

    @patch("routers.interview.get_next_interviewer_message")
    def test_start_interview_internal_error_handled(self, mock_get_msg, client: TestClient):
        mock_get_msg.side_effect = Exception("Groq connection timeout")

        response = client.post("/api/interview/start", json={"topic": "Python", "difficulty": "Easy"})
        assert response.status_code == 500
        assert "Failed to start interview" in response.json()["detail"]

    @patch("routers.interview.get_next_interviewer_message")
    def test_answer_interview_success(self, mock_get_msg, client: TestClient):
        mock_get_msg.return_value = ("Good answer. How do tasks differ from threads?", False)

        history = [{"role": "assistant", "content": "Explain async/await"}]
        payload = {
            "topic": "Python",
            "difficulty": "Medium",
            "user_answer": "Asyncio uses cooperative multitasking.",
            "conversation_history": history,
        }
        response = client.post("/api/interview/answer", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["ai_message"] == "Good answer. How do tasks differ from threads?"
        assert data["is_complete"] is False
        assert len(data["conversation_history"]) == 3
        assert data["conversation_history"][1] == {
            "role": "user",
            "content": "Asyncio uses cooperative multitasking.",
        }
        assert data["conversation_history"][2] == {
            "role": "assistant",
            "content": "Good answer. How do tasks differ from threads?",
        }

    @patch("routers.interview.get_next_interviewer_message")
    def test_answer_interview_detects_completion(self, mock_get_msg, client: TestClient):
        mock_get_msg.return_value = (
            "Thank you! You have demonstrated strong Python proficiency.",
            True,
        )

        payload = {
            "topic": "Python",
            "difficulty": "Hard",
            "user_answer": "Final comprehensive response.",
            "conversation_history": [],
        }
        response = client.post("/api/interview/answer", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["is_complete"] is True

    @patch("routers.interview.get_next_interviewer_message")
    def test_answer_interview_enforces_max_questions_limit(self, mock_get_msg, client: TestClient):
        # LLM did NOT flag interview as complete
        mock_get_msg.return_value = ("Here is another thought.", False)

        # 4 previous user turns + 1 new turn = 5 candidate answers
        prev_history = []
        for i in range(4):
            prev_history.append({"role": "assistant", "content": f"Question {i+1}"})
            prev_history.append({"role": "user", "content": f"Answer {i+1}"})

        payload = {
            "topic": "Python",
            "difficulty": "Medium",
            "user_answer": "Fifth answer reached.",
            "conversation_history": prev_history,
        }
        response = client.post("/api/interview/answer", json=payload)

        assert response.status_code == 200
        data = response.json()
        # Maximum limit ceiling reached: is_complete must be True
        assert data["is_complete"] is True
        assert "conclude" in data["ai_message"].lower() or "thank you" in data["ai_message"].lower()

    def test_answer_interview_validation_failure(self, client: TestClient):
        # Empty user answer
        payload = {
            "topic": "Python",
            "difficulty": "Medium",
            "user_answer": "",
        }
        response = client.post("/api/interview/answer", json=payload)
        assert response.status_code == 422


class TestReportRouterUnit:
    """Unit tests for /api/report/generate using mocked llm_service."""

    @patch("routers.report.generate_interview_report")
    def test_generate_report_success(self, mock_gen_report, client: TestClient, sample_report_dict):
        mock_gen_report.return_value = sample_report_dict

        payload = {
            "topic": "Python",
            "difficulty": "Hard",
            "conversation_history": [
                {"role": "assistant", "content": "Question 1"},
                {"role": "user", "content": "Answer 1"},
            ],
        }
        response = client.post("/api/report/generate", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 92
        assert data["recommendation"] == "Pass"
        assert data["verdict"] == sample_report_dict["verdict"]
        assert data["strengths"] == sample_report_dict["strengths"]
        assert data["weaknesses"] == sample_report_dict["weaknesses"]
        assert data["revision_areas"] == sample_report_dict["revision_areas"]

    def test_generate_report_validation_failure(self, client: TestClient):
        # Missing topic
        response = client.post(
            "/api/report/generate",
            json={"topic": "", "difficulty": "Easy", "conversation_history": []},
        )
        assert response.status_code == 422

    @patch("routers.report.generate_interview_report")
    def test_generate_report_value_error_handled(self, mock_gen_report, client: TestClient):
        mock_gen_report.side_effect = ValueError("Report is missing required keys: verdict")

        payload = {"topic": "Python", "difficulty": "Easy", "conversation_history": []}
        response = client.post("/api/report/generate", json=payload)

        assert response.status_code == 400
        assert "Report validation failed" in response.json()["detail"]

    @patch("routers.report.generate_interview_report")
    def test_generate_report_internal_error_handled(self, mock_gen_report, client: TestClient):
        mock_gen_report.side_effect = Exception("LLM service timeout")

        payload = {"topic": "Python", "difficulty": "Easy", "conversation_history": []}
        response = client.post("/api/report/generate", json=payload)

        assert response.status_code == 500
        assert "Failed to generate report" in response.json()["detail"]
