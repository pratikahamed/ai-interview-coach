import os
import sys
import pytest
from typing import Dict, Any, List
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

# Ensure backend directory is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient fixture for router and integration testing."""
    return TestClient(app)


@pytest.fixture
def sample_conversation_history() -> List[Dict[str, Any]]:
    """Sample realistic interview conversation history."""
    return [
        {
            "role": "assistant",
            "content": "Can you explain the difference between a list and a tuple in Python?",
        },
        {
            "role": "user",
            "content": "Lists are mutable, meaning their items can be modified, whereas tuples are immutable. Also, lists use square brackets and tuples use parentheses.",
        },
        {
            "role": "assistant",
            "content": "That is correct. In terms of performance and memory overhead, why might you choose a tuple over a list?",
        },
        {
            "role": "user",
            "content": "Tuples have lower memory overhead and are slightly faster to allocate because of immutability and optimization in CPython.",
        },
    ]


@pytest.fixture
def sample_report_dict() -> Dict[str, Any]:
    """Sample report dict matching the required schema."""
    return {
        "score": 92,
        "strengths": "Demonstrated crystal-clear understanding of Python memory models and data structures.",
        "weaknesses": "Could provide more specific examples of real-world tuple unpacking edge cases.",
        "revision_areas": "CPython internal memory allocation, NamedTuples vs Dataclasses",
        "verdict": "Candidate demonstrated senior-level grasp of language fundamentals and performance characteristics.",
        "recommendation": "Pass",
    }


def make_mock_groq_completion(content: str) -> MagicMock:
    """Helper to construct a mock Groq chat completion response."""
    mock_choice = MagicMock()
    mock_choice.message.content = content
    mock_completion = MagicMock()
    mock_completion.choices = [mock_choice]
    return mock_completion
