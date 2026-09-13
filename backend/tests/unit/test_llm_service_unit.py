import json
import pytest
from unittest.mock import patch, MagicMock
from services import llm_service
from tests.conftest import make_mock_groq_completion


class TestGroqClientInitialization:
    """Unit tests for Groq client initialization and credential validation."""

    def test_missing_api_key_raises_value_error(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        with pytest.raises(ValueError, match="GROQ_API_KEY environment variable is not set"):
            llm_service.get_groq_client()

    def test_whitespace_api_key_raises_value_error(self, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "   ")
        with pytest.raises(ValueError, match="GROQ_API_KEY environment variable is not set"):
            llm_service.get_groq_client()

    def test_valid_api_key_initializes_client(self, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "gsk_dummy_test_key_12345")
        client = llm_service.get_groq_client()
        assert client is not None


class TestModelResolution:
    """Unit tests for dynamic chat model resolution and fallbacks."""

    @pytest.fixture(autouse=True)
    def reset_model(self):
        llm_service._RESOLVED_MODEL = None
        yield
        llm_service._RESOLVED_MODEL = None

    def test_resolve_model_finds_target(self, monkeypatch):
        llm_service._RESOLVED_MODEL = None
        monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")

        mock_client = MagicMock()
        model_1 = MagicMock()
        model_1.id = "openai/gpt-oss-120b"
        model_2 = MagicMock()
        model_2.id = "mixtral-8x7b-32768"
        mock_client.models.list.return_value.data = [model_1, model_2]

        resolved = llm_service.resolve_chat_model(mock_client)
        assert resolved == "openai/gpt-oss-120b"

    def test_resolve_model_falls_back_when_target_missing(self, monkeypatch):
        llm_service._RESOLVED_MODEL = None
        monkeypatch.setenv("GROQ_MODEL", "non-existent-model-xyz")

        mock_client = MagicMock()
        model_whisper = MagicMock()
        model_whisper.id = "whisper-large-v3"
        model_fallback = MagicMock()
        model_fallback.id = "openai/gpt-oss-20b"
        mock_client.models.list.return_value.data = [model_whisper, model_fallback]

        resolved = llm_service.resolve_chat_model(mock_client)
        assert resolved == "openai/gpt-oss-20b"

    def test_resolve_model_gracefully_handles_api_exception(self, monkeypatch):
        llm_service._RESOLVED_MODEL = None
        monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")

        mock_client = MagicMock()
        mock_client.models.list.side_effect = RuntimeError("Groq API unreachable")

        resolved = llm_service.resolve_chat_model(mock_client)
        assert resolved == "openai/gpt-oss-120b"


class TestInterviewerMessaging:
    """Unit tests for get_next_interviewer_message."""

    def test_empty_topic_raises_value_error(self):
        with pytest.raises(ValueError, match="Interview topic cannot be empty"):
            llm_service.get_next_interviewer_message(
                topic="",
                difficulty="Medium",
                conversation_history=[],
            )

    def test_empty_difficulty_raises_value_error(self):
        with pytest.raises(ValueError, match="Interview difficulty cannot be empty"):
            llm_service.get_next_interviewer_message(
                topic="Python",
                difficulty="",
                conversation_history=[],
            )

    @patch("services.llm_service.get_groq_client")
    @patch("services.llm_service.resolve_chat_model")
    def test_standard_question_generation(self, mock_resolve, mock_get_client):
        mock_resolve.return_value = "llama-3.3-70b-versatile"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_mock_groq_completion(
            "What is the difference between a list and a set in Python?"
        )
        mock_get_client.return_value = mock_client

        message, is_complete = llm_service.get_next_interviewer_message(
            topic="Python",
            difficulty="Easy",
            conversation_history=[],
        )

        assert message == "What is the difference between a list and a set in Python?"
        assert is_complete is False
        assert mock_client.chat.completions.create.called

    @patch("services.llm_service.get_groq_client")
    @patch("services.llm_service.resolve_chat_model")
    def test_completion_flag_detection(self, mock_resolve, mock_get_client):
        mock_resolve.return_value = "llama-3.3-70b-versatile"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_mock_groq_completion(
            "Thank you for your time today. You did very well! [INTERVIEW COMPLETE]"
        )
        mock_get_client.return_value = mock_client

        message, is_complete = llm_service.get_next_interviewer_message(
            topic="Python",
            difficulty="Hard",
            conversation_history=[{"role": "user", "content": "Here is my detailed solution."}],
        )

        assert "[INTERVIEW COMPLETE]" not in message
        assert message == "Thank you for your time today. You did very well!"
        assert is_complete is True


class TestInterviewReportGeneration:
    """Unit tests for generate_interview_report."""

    def test_empty_topic_or_difficulty_raises_value_error(self):
        with pytest.raises(ValueError, match="Interview topic cannot be empty"):
            llm_service.generate_interview_report("", "Easy", [])

        with pytest.raises(ValueError, match="Interview difficulty cannot be empty"):
            llm_service.generate_interview_report("Python", " ", [])

    @patch("services.llm_service.get_groq_client")
    @patch("services.llm_service.resolve_chat_model")
    def test_valid_json_report_generation(self, mock_resolve, mock_get_client, sample_report_dict):
        mock_resolve.return_value = "llama-3.3-70b-versatile"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_mock_groq_completion(
            json.dumps(sample_report_dict)
        )
        mock_get_client.return_value = mock_client

        result = llm_service.generate_interview_report(
            topic="Python",
            difficulty="Medium",
            conversation_history=[{"role": "user", "content": "I understand GIL."}],
        )

        assert result["score"] == 92
        assert result["recommendation"] == "Pass"
        assert "GIL" in sample_report_dict["strengths"] or len(result["strengths"]) > 0

    @patch("services.llm_service.get_groq_client")
    @patch("services.llm_service.resolve_chat_model")
    def test_regex_fallback_for_surrounded_json(self, mock_resolve, mock_get_client, sample_report_dict):
        mock_resolve.return_value = "llama-3.3-70b-versatile"
        surrounded_text = f"Here is the evaluation result:\n{json.dumps(sample_report_dict)}\nHope this helps!"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_mock_groq_completion(surrounded_text)
        mock_get_client.return_value = mock_client

        result = llm_service.generate_interview_report(
            topic="Python",
            difficulty="Medium",
            conversation_history=[],
        )

        assert result["score"] == 92
        assert result["recommendation"] == "Pass"

    @patch("services.llm_service.get_groq_client")
    @patch("services.llm_service.resolve_chat_model")
    def test_missing_required_keys_raises_value_error(self, mock_resolve, mock_get_client):
        mock_resolve.return_value = "llama-3.3-70b-versatile"
        incomplete_json = {"score": 80, "verdict": "Good job"}  # missing strengths, weaknesses, etc.
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_mock_groq_completion(
            json.dumps(incomplete_json)
        )
        mock_get_client.return_value = mock_client

        with pytest.raises(ValueError, match="Report is missing required keys"):
            llm_service.generate_interview_report("Python", "Easy", [])

    @patch("services.llm_service.get_groq_client")
    @patch("services.llm_service.resolve_chat_model")
    def test_unparseable_output_raises_value_error(self, mock_resolve, mock_get_client):
        mock_resolve.return_value = "llama-3.3-70b-versatile"
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = make_mock_groq_completion(
            "This is just plain text without any JSON brackets whatsoever."
        )
        mock_get_client.return_value = mock_client

        with pytest.raises(ValueError, match="No valid JSON object found in model response"):
            llm_service.generate_interview_report("Python", "Easy", [])
