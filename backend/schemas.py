"""
Pydantic schemas for the AI Interview Coach backend API.
Centralizes all request and response models across routers.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class StartInterviewRequest(BaseModel):
    """Payload to initialize a new interview session."""
    topic: str = Field(..., min_length=1, description="Interview subject or technology (e.g., Python, React)")
    difficulty: str = Field(..., min_length=1, description="Difficulty level (Easy, Medium, Hard)")


class StartInterviewResponse(BaseModel):
    """Initial response containing opening question and initial transcript."""
    first_message: str = Field(..., description="Opening question from the AI interviewer")
    conversation_history: List[Dict[str, Any]] = Field(
        ...,
        description="Initial conversation transcript containing the assistant's first message",
    )


class AnswerRequest(BaseModel):
    """Payload containing candidate answer and conversation transcript."""
    topic: str = Field(..., min_length=1, description="Interview subject or technology")
    difficulty: str = Field(..., min_length=1, description="Difficulty level (Easy, Medium, Hard)")
    user_answer: str = Field(..., min_length=1, description="Candidate's response to previous question")
    conversation_history: list = Field(
        default_factory=list,
        description="Chronological transcript of interview messages up to this point",
    )


class AnswerResponse(BaseModel):
    """Interviewer follow-up message and completion status."""
    ai_message: str = Field(..., description="Next follow-up question or concluding remark from interviewer")
    is_complete: bool = Field(..., description="True if the interview has reached its natural or max turn conclusion")
    conversation_history: list = Field(
        ...,
        description="Updated transcript including user answer and new assistant message",
    )


class ReportRequest(BaseModel):
    """Payload to generate structured evaluation scorecard."""
    topic: str = Field(..., min_length=1, description="Subject topic of the interview (e.g., Python, React)")
    difficulty: str = Field(..., min_length=1, description="Difficulty level (e.g., Easy, Medium, Hard)")
    conversation_history: list = Field(
        default_factory=list,
        description="Chronological transcript of interview messages containing 'role' and 'content'",
    )


class ReportResponse(BaseModel):
    """Comprehensive candidate performance scorecard."""
    score: int = Field(..., ge=0, le=100, description="Overall performance score (0-100)")
    strengths: str = Field(..., description="Key candidate strengths observed in transcript")
    weaknesses: str = Field(..., description="Key candidate weaknesses or knowledge gaps observed")
    revision_areas: str = Field(..., description="Recommended areas or topics for candidate study")
    verdict: str = Field(..., description="Evaluator verdict and summary of candidate readiness")
    recommendation: str = Field(..., description="'Pass' or 'Fail'")


# Backward-compatible aliases
AnswerInterviewRequest = AnswerRequest
AnswerInterviewResponse = AnswerResponse
GenerateReportRequest = ReportRequest
GenerateReportResponse = ReportResponse
