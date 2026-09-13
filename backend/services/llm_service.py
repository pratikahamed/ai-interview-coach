import os
import json
import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from dotenv import load_dotenv
from groq import Groq, NotFoundError

# Configure module-level logger for verbose and debuggable tracing
logger = logging.getLogger("backend.services.llm_service")

# Load environment variables
load_dotenv()

# Model name defaults to openai/gpt-oss-120b, with GROQ_MODEL override
MODEL_NAME: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
_RESOLVED_MODEL: Optional[str] = None


def resolve_chat_model(client: Groq) -> str:
    """
    Resolve a valid chat model, falling back to an available chat model
    if the configured target model is not found on the account.
    """
    global _RESOLVED_MODEL
    if _RESOLVED_MODEL:
        return _RESOLVED_MODEL

    target = os.getenv("GROQ_MODEL", MODEL_NAME)
    logger.debug("Attempting to resolve Groq chat model for target: '%s'", target)
    try:
        models_data = client.models.list().data
        available_ids = [m.id for m in models_data]
        logger.debug("Available models on Groq account: %s", available_ids)

        if target in available_ids:
            _RESOLVED_MODEL = target
            logger.info("Using configured target model: '%s'", _RESOLVED_MODEL)
            return _RESOLVED_MODEL

        # Target not found in available IDs; pick a capable chat fallback
        candidates = [
            m_id for m_id in available_ids
            if not any(excluded in m_id for excluded in ["whisper", "prompt-guard", "safeguard"])
        ]
        if candidates:
            _RESOLVED_MODEL = candidates[0]
            logger.warning(
                "Configured model '%s' not accessible on account. Falling back to '%s'.",
                target,
                _RESOLVED_MODEL,
            )
            return _RESOLVED_MODEL
    except Exception as exc:
        logger.warning(
            "Failed to query available models from Groq API (%s). Defaulting to target '%s'.",
            exc,
            target,
        )

    _RESOLVED_MODEL = target
    return _RESOLVED_MODEL


INTERVIEWER_SYSTEM_PROMPT = """You are an expert technical interviewer conducting a technical interview.

Interview Configuration:
- Topic: {topic}
- Difficulty: {difficulty}

Your Instructions:
1. Difficulty Calibration:
   - Easy: Ask basic recall, fundamental concepts, and definition questions.
   - Medium: Ask applied understanding, practical implementation, and problem-solving questions.
   - Hard: Ask deep expertise, architectural trade-offs, and system-thinking questions.

2. Interview Flow & Questioning:
   - Ask only ONE clear, focused question at a time appropriate to the topic and difficulty.
   - After each candidate answer, decide one of three things:
     a. If the answer is strong: Acknowledge briefly in one sentence, then ask a question on a different aspect of the topic.
     b. If the answer is partially correct: Probe deeper with one specific follow-up question. Do not reveal the correct answer.
     c. If the answer is incorrect: Note the gap in one sentence, then move to a different question.

3. Progress & Conclusion:
   - Monitor overall performance throughout the interview.
   - If the candidate is clearly struggling across multiple topics, naturally conclude the interview early with a kind note.
   - If the candidate is performing very well, feel free to wrap up after covering the key areas rather than continuing unnecessarily.
   - When concluding the interview early or naturally, you MUST end your message with the exact phrase: [INTERVIEW COMPLETE]

4. Core Rules:
   - Never teach, never give hints, and never reveal answers.
   - Keep your tone professional, neutral, and encouraging.
   - Ask only ONE question per message."""


REPORT_SYSTEM_PROMPT = """You are an expert interview evaluator assessing a completed technical interview.

You will be provided with the full conversation transcript between the interviewer and the candidate.

Scoring Guide:
- 85 to 100: Excellent performance. Comprehensive knowledge, clear explanations, and strong problem solving.
- 70 to 84: Good performance. Solid grasp of core concepts with minor gaps or slight hesitation.
- 55 to 69: Adequate performance. Basic understanding present but answers lack depth or struggle with technical details.
- Below 55: Weak performance. Significant knowledge gaps, frequent errors, or inability to answer foundational questions.

Output Requirements:
- Return ONLY a valid JSON object.
- Do NOT include any intro, outro, explanations, or markdown code blocks (do not wrap in ```json or ```).
- The JSON object must contain EXACTLY the following keys:
  - "score": an integer from 0 to 100 based on the scoring guide.
  - "strengths": string, 2 to 4 specific sentences referencing actual answers given by the candidate.
  - "weaknesses": string, 2 to 4 specific sentences referencing gaps in the candidate's answers.
  - "revision_areas": string, comma-separated list of 3 to 5 specific topics for the candidate to review.
  - "verdict": string, 2 to 3 sentences of overall direct assessment of candidate readiness.
  - "recommendation": string, exactly the word "Pass" or the word "Fail"."""


def get_groq_client() -> Groq:
    """
    Instantiate and return the Groq client using GROQ_API_KEY from the environment.
    Raises ValueError if the key is missing or blank.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or not api_key.strip():
        logger.error("GROQ_API_KEY environment variable is not set or empty.")
        raise ValueError(
            "GROQ_API_KEY environment variable is not set. Please set it in your .env file."
        )
    return Groq(api_key=api_key.strip())


def get_next_interviewer_message(
    topic: str,
    difficulty: str,
    conversation_history: List[Dict[str, Any]],
) -> Tuple[str, bool]:
    """
    Generate the next interviewer message based on the topic, difficulty, and conversation history.

    Parameters:
        topic (str): The subject of the interview (e.g. 'Python', 'React').
        difficulty (str): The difficulty level ('Easy', 'Medium', 'Hard').
        conversation_history (list of dicts): Past conversation messages.

    Returns:
        tuple (str, bool): (response_text, is_complete)
    """
    if not topic or not topic.strip():
        raise ValueError("Interview topic cannot be empty.")
    if not difficulty or not difficulty.strip():
        raise ValueError("Interview difficulty cannot be empty.")

    logger.debug(
        "Requesting next interviewer message. Topic: '%s', Difficulty: '%s', History items: %d",
        topic,
        difficulty,
        len(conversation_history),
    )

    client = get_groq_client()

    system_prompt = INTERVIEWER_SYSTEM_PROMPT.format(
        topic=topic.strip(),
        difficulty=difficulty.strip(),
    )

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": system_prompt}
    ] + list(conversation_history)

    model_to_use = resolve_chat_model(client)
    try:
        chat_completion = client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            temperature=0.7,
            max_tokens=500,
        )
    except Exception as exc:
        logger.error(
            "Groq API call failed during get_next_interviewer_message: %s",
            exc,
            exc_info=True,
        )
        raise

    response_text = chat_completion.choices[0].message.content or ""
    logger.debug("Raw interviewer response length: %d characters", len(response_text))

    is_complete = "[INTERVIEW COMPLETE]" in response_text
    if is_complete:
        response_text = response_text.replace("[INTERVIEW COMPLETE]", "").strip()
        logger.info("Interviewer indicated interview completion token [INTERVIEW COMPLETE].")

    return response_text.strip(), is_complete


def generate_interview_report(
    topic: str,
    difficulty: str,
    conversation_history: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Generate a structured evaluation report from the interview conversation history.

    Parameters:
        topic (str): The subject of the interview.
        difficulty (str): The difficulty level (Easy, Medium, Hard).
        conversation_history (list of dicts): Past conversation messages.

    Returns:
        dict: Parsed and validated evaluation report containing score, strengths,
              weaknesses, revision_areas, verdict, and recommendation.
    """
    if not topic or not topic.strip():
        raise ValueError("Interview topic cannot be empty.")
    if not difficulty or not difficulty.strip():
        raise ValueError("Interview difficulty cannot be empty.")

    logger.debug(
        "Generating interview report for Topic: '%s', Difficulty: '%s' with %d history turns",
        topic,
        difficulty,
        len(conversation_history),
    )

    client = get_groq_client()

    # Build transcript string from conversation history
    transcript_lines: List[str] = [
        f"Topic: {topic.strip()}",
        f"Difficulty: {difficulty.strip()}",
        "\n--- Interview Transcript ---",
    ]
    for msg in conversation_history:
        role = str(msg.get("role", "unknown")).capitalize()
        content = str(msg.get("content", ""))
        transcript_lines.append(f"{role}: {content}")
    transcript = "\n".join(transcript_lines)

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": REPORT_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Evaluate the following interview transcript:\n\n{transcript}",
        },
    ]

    model_to_use = resolve_chat_model(client)
    try:
        chat_completion = client.chat.completions.create(
            model=model_to_use,
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        logger.error(
            "Groq API call failed during generate_interview_report: %s",
            exc,
            exc_info=True,
        )
        raise

    raw_response = chat_completion.choices[0].message.content or ""
    logger.debug("Raw evaluation report response: %s", raw_response)

    # Parse JSON response with regex fallback handling
    report: Dict[str, Any]
    try:
        report = json.loads(raw_response)
    except json.JSONDecodeError:
        logger.warning("Direct JSON decode failed. Attempting regex extraction.")
        match = re.search(r"\{.*\}", raw_response, re.DOTALL)
        if match:
            try:
                report = json.loads(match.group(0))
            except json.JSONDecodeError as err:
                logger.error("Regex extracted string is also not valid JSON: %s", raw_response)
                raise ValueError(
                    f"Failed to parse extracted JSON from model response: {raw_response}"
                ) from err
        else:
            logger.error("No JSON block detected in model response: %s", raw_response)
            raise ValueError(
                f"No valid JSON object found in model response: {raw_response}"
            )

    # Schema verification & normalization for report keys
    required_keys = ["score", "strengths", "weaknesses", "revision_areas", "verdict", "recommendation"]
    missing_keys = [k for k in required_keys if k not in report]
    if missing_keys:
        logger.error("Report missing required schema keys: %s", missing_keys)
        raise ValueError(f"Report is missing required keys: {', '.join(missing_keys)}")

    # Ensure score is an integer
    try:
        report["score"] = int(report["score"])
    except (ValueError, TypeError) as exc:
        logger.warning("Score '%s' could not be cast directly to int; defaulting to 50", report.get("score"))
        report["score"] = 50

    # Ensure string fields are strings (handles cases where model returns list of strings)
    for str_key in ["strengths", "weaknesses", "revision_areas", "verdict", "recommendation"]:
        val = report.get(str_key, "")
        if isinstance(val, list):
            report[str_key] = ", ".join(str(item) for item in val)
        else:
            report[str_key] = str(val)

    # Validate recommendation
    rec = report["recommendation"].strip()
    if "pass" in rec.lower():
        report["recommendation"] = "Pass"
    else:
        report["recommendation"] = "Fail"

    logger.info("Successfully generated report with score %d (%s)", report["score"], report["recommendation"])
    return report
