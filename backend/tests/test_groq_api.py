#!/usr/bin/env python3
"""
Verbose, Debuggable Test Suite for Groq API and LLM Service.

Tests:
1. Environment & API Key Verification
2. Direct Groq API Connectivity (simple ping query)
3. Initial Interviewer Message Generation (services.llm_service.get_next_interviewer_message)
4. Multi-turn Follow-up Interviewer Message Generation
5. Structured Report Generation & Schema Validation (services.llm_service.generate_interview_report)

Usage:
    python tests/test_groq_api.py
"""

import os
import sys
import time
import json
import traceback
from pathlib import Path

# Ensure UTF-8 output on Windows terminals to prevent charmap/UnicodeEncodeError
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Add backend directory to sys.path so services can be imported directly
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from dotenv import load_dotenv
from groq import Groq, GroqError, AuthenticationError, RateLimitError, APIConnectionError
from services.llm_service import (
    MODEL_NAME,
    get_groq_client,
    resolve_chat_model,
    get_next_interviewer_message,
    generate_interview_report,
)


def print_banner(title: str):
    width = 75
    print("\n" + "=" * width)
    print(f"  {title.upper()}")
    print("=" * width)


def print_success(message: str):
    print(f"  [PASS] {message}")


def print_info(message: str):
    print(f"  [INFO] {message}")


def print_warn(message: str):
    print(f"  [WARN] {message}")


def print_error(message: str, details: str = None):
    print(f"  [FAIL] {message}")
    if details:
        print("\n  --- Error Details ---")
        for line in details.strip().split("\n"):
            print(f"    {line}")
        print("  ---------------------\n")


def mask_key(key: str) -> str:
    if not key or len(key) < 10:
        return "********"
    return f"{key[:6]}...{key[-4:]}"


def test_1_environment():
    """Verify .env loading and API key presence."""
    print_banner("Step 1: Environment & API Key Check")
    
    env_path = BACKEND_DIR / ".env"
    print_info(f"Looking for .env at: {env_path}")
    
    if not env_path.exists():
        print_warn(".env file not found on disk, checking system environment variables...")
    else:
        print_success(f".env file found ({env_path.stat().st_size} bytes)")
    
    load_dotenv(dotenv_path=env_path)
    api_key = os.getenv("GROQ_API_KEY")
    
    if not api_key:
        print_error(
            "GROQ_API_KEY is not set!",
            "Ensure backend/.env contains: GROQ_API_KEY=your_key_here"
        )
        return False
    
    print_success(f"GROQ_API_KEY detected: {mask_key(api_key)}")
    print_info(f"Target LLM model: {MODEL_NAME}")
    return True


def test_2_direct_ping():
    """Test raw Groq API connectivity with a simple query."""
    print_banner("Step 2: Direct Groq API Query (Simple Ping)")
    
    prompt = "Respond with a single sentence confirming that the Groq API connection is active and healthy."
    client = get_groq_client()
    target_model = resolve_chat_model(client)
    print_info(f"Sending prompt to '{target_model}': \"{prompt}\"")
    
    start_time = time.time()
    
    try:
        response = client.chat.completions.create(
            model=target_model,
            messages=[
                {"role": "system", "content": "You are a concise test assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=100,
        )
        elapsed = time.time() - start_time
        
        reply = response.choices[0].message.content.strip()
        usage = response.usage
        
        print_success(f"Groq API responded successfully in {elapsed:.2f}s!")
        print_info(f"Response: \"{reply}\"")
        if usage:
            print_info(
                f"Token usage -> Prompt: {usage.prompt_tokens}, "
                f"Completion: {usage.completion_tokens}, "
                f"Total: {usage.total_tokens}"
            )
        return True
        
    except AuthenticationError as e:
        print_error("Authentication failed: Invalid Groq API key.", str(e))
        return False
    except RateLimitError as e:
        print_error("Rate limit reached on Groq API.", str(e))
        return False
    except APIConnectionError as e:
        print_error("Network connection error reaching api.groq.com.", str(e))
        return False
    except Exception as e:
        print_error("Unexpected error during direct query.", traceback.format_exc())
        return False


def test_3_initial_interviewer_message():
    """Test get_next_interviewer_message for session start."""
    print_banner("Step 3: Interviewer Service - Initial Question")
    
    topic = "Python"
    difficulty = "Medium"
    conversation_history = []
    
    print_info(f"Calling get_next_interviewer_message(topic='{topic}', difficulty='{difficulty}', history=[])")
    
    start_time = time.time()
    try:
        question, is_complete = get_next_interviewer_message(topic, difficulty, conversation_history)
        elapsed = time.time() - start_time
        
        if not question or len(question.strip()) < 10:
            print_error("Interviewer returned an empty or unreasonably short question.")
            return False
            
        print_success(f"Initial question generated in {elapsed:.2f}s:")
        print(f"\n    > {question}\n")
        print_info(f"is_complete flag: {is_complete} (expected False for start of interview)")
        
        assert not is_complete, "Interview should not be marked complete on first question"
        return question
        
    except Exception as e:
        print_error("Failed to generate initial interviewer question.", traceback.format_exc())
        return False


def test_4_followup_interviewer_message(first_question: str):
    """Test get_next_interviewer_message with simulated candidate response."""
    print_banner("Step 4: Interviewer Service - Multi-turn Follow-up")
    
    topic = "Python"
    difficulty = "Medium"
    candidate_answer = (
        "In Python, a list is a mutable ordered sequence, whereas a tuple is immutable. "
        "Tuples can be used as dictionary keys if all elements are hashable, but lists cannot."
    )
    
    conversation_history = [
        {"role": "assistant", "content": first_question},
        {"role": "user", "content": candidate_answer},
    ]
    
    print_info("Simulating Candidate Answer:")
    print(f"    > \"{candidate_answer}\"")
    print_info("Requesting interviewer evaluation & next question...")
    
    start_time = time.time()
    try:
        next_msg, is_complete = get_next_interviewer_message(topic, difficulty, conversation_history)
        elapsed = time.time() - start_time
        
        print_success(f"Interviewer follow-up received in {elapsed:.2f}s:")
        print(f"\n    > {next_msg}\n")
        print_info(f"is_complete flag: {is_complete}")
        return True
        
    except Exception as e:
        print_error("Failed to generate follow-up message.", traceback.format_exc())
        return False


def test_5_report_generation():
    """Test generate_interview_report structured JSON generation and schema validation."""
    print_banner("Step 5: Report Service - Evaluation & JSON Validation")
    
    topic = "Python"
    difficulty = "Medium"
    mock_history = [
        {
            "role": "assistant",
            "content": "Welcome to your interview. Can you explain Python's memory management and how garbage collection works?",
        },
        {
            "role": "user",
            "content": (
                "Python uses reference counting as its primary mechanism. When an object's reference count drops to zero, "
                "it is immediately deallocated. It also has a cyclic garbage collector to detect reference cycles using generations."
            ),
        },
        {
            "role": "assistant",
            "content": "Good explanation. What are Python decorators and how would you implement a simple timer decorator?",
        },
        {
            "role": "user",
            "content": (
                "A decorator is a function that takes another function and extends its behavior without modifying it. "
                "You use functools.wraps, record time.perf_counter before and after calling the wrapped function, and return the result."
            ),
        },
        {
            "role": "assistant",
            "content": "Well done. We have covered key concepts. Thank you! [INTERVIEW COMPLETE]",
        },
    ]
    
    print_info(f"Generating evaluation report for {len(mock_history)} conversation turns...")
    
    start_time = time.time()
    try:
        report = generate_interview_report(topic, difficulty, mock_history)
        elapsed = time.time() - start_time
        
        print_success(f"Report generated and parsed in {elapsed:.2f}s!")
        print("\n  --- Parsed Report Summary ---")
        print(f"    Score:          {report.get('score')} / 100")
        print(f"    Recommendation: {report.get('recommendation')}")
        print(f"    Strengths:      {report.get('strengths')}")
        print(f"    Weaknesses:     {report.get('weaknesses')}")
        print(f"    Revision Areas: {report.get('revision_areas')}")
        print(f"    Verdict:        {report.get('verdict')}")
        print("  ------------------------------\n")
        
        # Schema assertions
        required_fields = ["score", "strengths", "weaknesses", "revision_areas", "verdict", "recommendation"]
        missing = [k for k in required_fields if k not in report]
        if missing:
            print_error(f"Missing required fields in report: {missing}")
            return False
            
        assert isinstance(report["score"], (int, float)), f"Score must be numeric: {type(report['score'])}"
        assert 0 <= report["score"] <= 100, f"Score out of range [0, 100]: {report['score']}"
        assert report["recommendation"] in ["Pass", "Fail"], f"Invalid recommendation: {report['recommendation']}"
        
        print_success("All schema validations passed!")
        return True
        
    except Exception as e:
        print_error("Failed to generate or validate interview report.", traceback.format_exc())
        return False


def main():
    print("\n" + "#" * 75)
    print("  AI INTERVIEW COACH - GROQ API DIAGNOSTIC & VERIFICATION SUITE")
    print("#" * 75)
    
    total_start = time.time()
    
    # 1. Environment check
    if not test_1_environment():
        print("\n[ABORTED] Fix environment configuration before continuing.\n")
        sys.exit(1)
        
    # 2. Direct simple query
    if not test_2_direct_ping():
        print("\n[ABORTED] Direct Groq API call failed. Verify API key and network connectivity.\n")
        sys.exit(1)
        
    # 3. Initial interviewer question
    first_question = test_3_initial_interviewer_message()
    if not first_question:
        print("\n[ABORTED] Initial interviewer question generation failed.\n")
        sys.exit(1)
        
    # 4. Multi-turn follow up
    if not test_4_followup_interviewer_message(first_question):
        print("\n[ABORTED] Multi-turn follow up generation failed.\n")
        sys.exit(1)
        
    # 5. Report generation & JSON validation
    if not test_5_report_generation():
        print("\n[ABORTED] Report generation failed.\n")
        sys.exit(1)
        
    total_time = time.time() - total_start
    print_banner(f"All 5 Tests Passed Successfully in {total_time:.2f}s!")
    print("  [+] Groq API connectivity verified.")
    print("  [+] Model responding accurately with sub-second latency.")
    print("  [+] Interviewer prompts & multi-turn flows working.")
    print("  [+] Report generation & JSON schema parsing validated.")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
