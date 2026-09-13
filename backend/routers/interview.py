import os
import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status

from schemas import (
    StartInterviewRequest,
    StartInterviewResponse,
    AnswerRequest,
    AnswerResponse,
    AnswerInterviewRequest,
    AnswerInterviewResponse,
)
from services.llm_service import get_next_interviewer_message

# Maximum candidate questions before automatically wrapping up and transitioning to report
MAX_INTERVIEW_QUESTIONS: int = int(os.getenv("MAX_INTERVIEW_QUESTIONS", "5"))

# Configure module-level logger for verbose and debuggable tracing
logger = logging.getLogger("backend.routers.interview")

router = APIRouter(tags=["interview"])


@router.post(
    "/start",
    response_model=StartInterviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Initialize an interview session",
)
def start_interview(request: StartInterviewRequest) -> StartInterviewResponse:
    """
    Initialize an interview session and generate the first interview question.
    """
    logger.info(
        "Starting new interview session for topic: '%s' at difficulty: '%s'",
        request.topic,
        request.difficulty,
    )
    try:
        first_message, _ = get_next_interviewer_message(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=[],
        )
        conversation_history: List[Dict[str, Any]] = [
            {"role": "assistant", "content": first_message}
        ]
        logger.info(
            "Successfully initialized interview for topic: '%s'. Generated opening question (%d chars).",
            request.topic,
            len(first_message),
        )
        return StartInterviewResponse(
            first_message=first_message,
            conversation_history=conversation_history,
        )
    except ValueError as val_err:
        logger.warning("Validation error in start_interview: %s", val_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request parameters: {str(val_err)}",
        )
    except Exception as exc:
        logger.error("Failed to start interview session: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start interview: {str(exc)}",
        )


@router.post(
    "/answer",
    response_model=AnswerResponse,
    status_code=status.HTTP_200_OK,
    summary="Process candidate answer and receive follow-up",
)
def answer_interview(request: AnswerRequest) -> AnswerResponse:
    """
    Process candidate answer and generate the next interviewer question or conclusion.
    Enforces a maximum conversation ceiling (MAX_INTERVIEW_QUESTIONS) to avoid infinite loops.
    """
    logger.info(
        "Processing candidate answer for topic: '%s', difficulty: '%s', current history length: %d",
        request.topic,
        request.difficulty,
        len(request.conversation_history),
    )
    try:
        # Append candidate answer to conversation history
        history: List[Dict[str, Any]] = list(request.conversation_history)
        history.append({"role": "user", "content": request.user_answer})

        # Calculate user turns so far
        candidate_turns = len([m for m in history if m.get("role") == "user"])

        # Generate next message from LLM service
        ai_message, is_complete = get_next_interviewer_message(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=history,
        )

        # Enforce maximum conversation limit ceiling (e.g. 5 questions)
        if candidate_turns >= MAX_INTERVIEW_QUESTIONS:
            logger.info(
                "Reached maximum interview conversation limit (%d >= %d). Marking interview as complete.",
                candidate_turns,
                MAX_INTERVIEW_QUESTIONS,
            )
            is_complete = True
            if not any(token in ai_message.lower() for token in ["conclude", "wrap up", "thank you", "complete"]):
                ai_message = f"{ai_message.rstrip()}\n\nThank you for participating! That concludes our technical interview."

        # Append AI response to conversation history
        history.append({"role": "assistant", "content": ai_message})

        logger.info(
            "Processed answer successfully. Follow-up generated (%d chars), is_complete=%s",
            len(ai_message),
            is_complete,
        )

        return AnswerResponse(
            ai_message=ai_message,
            is_complete=is_complete,
            conversation_history=history,
        )
    except ValueError as val_err:
        logger.warning("Validation error in answer_interview: %s", val_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request parameters: {str(val_err)}",
        )
    except Exception as exc:
        logger.error("Failed to process interview answer: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process answer: {str(exc)}",
        )
