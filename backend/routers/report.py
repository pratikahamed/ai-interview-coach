import logging
from fastapi import APIRouter, HTTPException, status

from schemas import (
    ReportRequest,
    ReportResponse,
    GenerateReportRequest,
    GenerateReportResponse,
)
from services.llm_service import generate_interview_report

# Configure module-level logger for verbose and debuggable tracing
logger = logging.getLogger("backend.routers.report")

router = APIRouter(tags=["report"])


@router.post(
    "/generate",
    response_model=ReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate comprehensive candidate performance report",
)
def generate_report(request: ReportRequest) -> ReportResponse:
    """
    Generate structured evaluation report from completed interview conversation history.
    """
    logger.info(
        "Received report generation request for topic: '%s', difficulty: '%s', turns: %d",
        request.topic,
        request.difficulty,
        len(request.conversation_history),
    )

    try:
        raw_report = generate_interview_report(
            topic=request.topic,
            difficulty=request.difficulty,
            conversation_history=request.conversation_history,
        )
        response = ReportResponse(**raw_report)
        logger.info("Successfully formulated report response for topic: '%s'", request.topic)
        return response
    except ValueError as val_err:
        logger.warning("Validation error in report generation: %s", val_err, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Report validation failed: {str(val_err)}",
        )
    except Exception as exc:
        logger.error("Unexpected failure generating report: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(exc)}",
        )
