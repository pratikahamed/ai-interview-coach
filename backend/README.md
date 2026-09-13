# AI Interview Coach — Backend API Service

[![FastAPI](https://img.shields.io/badge/Framework-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Pydantic v2](https://img.shields.io/badge/Validation-Pydantic%20v2-E92063.svg?logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
[![Groq LLM](https://img.shields.io/badge/Inference-Groq%20Cloud-F55036.svg)](https://groq.com/)
[![Pytest](https://img.shields.io/badge/Tests-35%20Passing-success.svg)](https://docs.pytest.org/)

A production-ready, asynchronous RESTful API built with **FastAPI**, **Pydantic v2**, and **Groq Cloud LLM** (`openai/gpt-oss-120b`). This service powers the AI interviewer persona, conducts adaptive technical interviews, and generates structured evaluation reports.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Running the Server](#running-the-server)
- [API Reference](#api-reference)
  - [Health Checks](#1-health-checks)
  - [Start Interview](#2-start-interview)
  - [Submit Answer & Next Question](#3-submit-answer--next-question)
  - [Generate Evaluation Report](#4-generate-evaluation-report)
- [Automated Testing Suite](#automated-testing-suite)
  - [Unit Tests (Offline, Mocked)](#1-unit-tests-30-tests)
  - [Integration Tests (Live Groq API)](#2-live-integration-tests-5-tests)
  - [Diagnostic Verification Script](#3-groq-api-diagnostic-script)
- [Model Resolution & Fault Tolerance](#model-resolution--fault-tolerance)
- [Error Handling Strategy](#error-handling-strategy)

---

## Architecture Overview

```
                          ┌────────────────────────┐
                          │   Next.js Frontend     │
                          │ (http://localhost:3000)│
                          └───────────┬────────────┘
                                      │ HTTP / JSON
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Application (Port 8000)                 │
│                                                                        │
│   ┌────────────────────┐     ┌─────────────────────────────────────┐  │
│   │  CORS Middleware   │ ──► │     Global Exception Handlers       │  │
│   └────────────────────┘     └──────────────────┬──────────────────┘  │
│                                                 │                      │
│                                                 ▼                      │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                        API Routers                             │  │
│   │  • /api/interview/start    • /api/interview/answer             │  │
│   │  • /api/report/generate    • /health                           │  │
│   └──────────────────────────────┬─────────────────────────────────┘  │
│                                  │                                     │
│                                  ▼                                     │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                      LLM Service Layer                         │  │
│   │  • Dynamic Model Resolver (Target + Auto Fallbacks)            │  │
│   │  • Prompt Calibrator (Easy / Medium / Hard)                    │  │
│   │  • JSON Sanitizer & Regex Extraction Fallbacks                 │  │
│   └──────────────────────────────┬─────────────────────────────────┘  │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ HTTPS / REST
                                   ▼
                       ┌───────────────────────┐
                       │     Groq Cloud API    │
                       │ (openai/gpt-oss-120b) │
                       └───────────────────────┘
```

---

## Directory Structure

```
backend/
├── .env                        # Local secret configuration (GROQ_API_KEY)
├── .env.example                # Example environment variables template
├── main.py                     # FastAPI application factory, CORS & routers
├── pytest.ini                  # Pytest configuration and path mappings
├── requirements.txt            # Locked Python dependencies
├── schemas.py                  # Pydantic v2 request & response schemas
├── routers/
│   ├── __init__.py
│   ├── interview.py            # POST /api/interview/start & /api/interview/answer
│   └── report.py               # POST /api/report/generate
├── services/
│   ├── __init__.py
│   └── llm_service.py          # Groq client, model resolver, prompts & parsers
└── tests/
    ├── __init__.py
    ├── conftest.py             # Reusable pytest fixtures & mock payloads
    ├── test_groq_api.py        # Diagnostic 5-step connectivity script
    ├── unit/                   # 30 offline, mocked unit tests
    │   ├── test_llm_service_unit.py
    │   └── test_routers_unit.py
    └── integration/            # 5 live integration tests with Groq API
        └── test_api_integration.py
```

---

## Prerequisites

- **Python**: Version `3.10` or higher (tested with Python 3.13)
- **Groq API Key**: Free tier or paid key from [Groq Console](https://console.groq.com)

---

## Installation & Setup

### 1. Create Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Environment Configuration

Create a `.env` file in the `backend/` root directory:

```env
# Required: Groq Cloud API Key
GROQ_API_KEY=gsk_your_actual_groq_api_key_here

# Optional: Preferred model identifier (defaults to openai/gpt-oss-120b)
GROQ_MODEL=openai/gpt-oss-120b
```

> [!NOTE]
> The service automatically detects if the configured model is accessible. If unavailable, it dynamically falls back to an active chat model on your account without throwing 500 errors.

---

## Running the Server

### Development Mode (with Hot Reload)

```powershell
.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

- **Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Interactive ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## API Reference

### 1. Health Checks

#### `GET /` or `GET /health`
Returns service status.

**Response (`200 OK`):**
```json
{
  "message": "AI Interview Coach API is running"
}
```

---

### 2. Start Interview

#### `POST /api/interview/start`
Initializes a new interview session and generates the first calibrated question.

**Request Body:**
```json
{
  "topic": "Python Data Structures",
  "difficulty": "Easy"
}
```

**Response (`200 OK`):**
```json
{
  "first_message": "What is the primary difference between a list and a tuple in Python in terms of mutability?",
  "conversation_history": [
    {
      "role": "assistant",
      "content": "What is the primary difference between a list and a tuple in Python in terms of mutability?"
    }
  ]
}
```

---

### 3. Submit Answer & Next Question

#### `POST /api/interview/answer`
Submits candidate answer, receives interviewer feedback/next question, and monitors completion state.

**Request Body:**
```json
{
  "topic": "Python Data Structures",
  "difficulty": "Easy",
  "user_answer": "Lists are mutable and defined with square brackets, while tuples are immutable and defined with parentheses.",
  "conversation_history": [
    {
      "role": "assistant",
      "content": "What is the primary difference between a list and a tuple in Python in terms of mutability?"
    }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "ai_message": "That is correct. How does Python handle memory allocation differently for tuples compared to lists?",
  "is_complete": false,
  "conversation_history": [
    {
      "role": "assistant",
      "content": "What is the primary difference between a list and a tuple in Python in terms of mutability?"
    },
    {
      "role": "user",
      "content": "Lists are mutable and defined with square brackets, while tuples are immutable and defined with parentheses."
    },
    {
      "role": "assistant",
      "content": "That is correct. How does Python handle memory allocation differently for tuples compared to lists?"
    }
  ]
}
```

---

### 4. Generate Evaluation Report

#### `POST /api/report/generate`
Analyzes the entire conversation transcript and generates a structured scorecard.

**Request Body:**
```json
{
  "topic": "Python Data Structures",
  "difficulty": "Easy",
  "conversation_history": [
    { "role": "assistant", "content": "What is a list in Python?" },
    { "role": "user", "content": "A list is an ordered mutable sequence." }
  ]
}
```

**Response (`200 OK`):**
```json
{
  "score": 85,
  "recommendation": "Pass",
  "verdict": "The candidate demonstrates strong foundational understanding of basic data structures.",
  "strengths": "Accurate definitions, concise phrasing, and immediate grasp of mutability rules.",
  "weaknesses": "Could provide concrete code snippets and discuss internal amortized O(1) appending.",
  "revision_areas": "Dynamic array resizing, shallow vs deep copying, dictionary hash tables"
}
```

---

## Automated Testing Suite

The backend provides three tiers of automated tests:

### 1. Unit Tests (30 Tests)
Isolated, offline tests using mocked Groq clients and FastAPI `TestClient`.

```powershell
.\.venv\Scripts\python -m pytest tests/unit -v --tb=short
```

**What it verifies:**
- API key validation (empty, whitespace, missing)
- Model resolution and fallback mechanisms
- Prompt construction for Easy, Medium, and Hard tiers
- JSON parsing and markdown-wrapped regex recovery
- Router status codes (`200`, `400`, `422`, `500`)

---

### 2. Live Integration Tests (5 Tests)
Live end-to-end tests exercising real API calls against the configured Groq model.

```powershell
.\.venv\Scripts\python -m pytest tests/integration -v -s --tb=short
```

**What it verifies:**
- Live health check ping
- Live `POST /api/interview/start` opening question generation
- Live `POST /api/interview/answer` follow-up turn
- Live `POST /api/report/generate` full evaluation scorecard
- Schema validation rejections (`HTTP 422`) on empty payloads

---

### 3. Groq API Diagnostic Script
Standalone diagnostic tool for checking latency, token counts, and connectivity.

```powershell
.\.venv\Scripts\python tests/test_groq_api.py
```

---

## Model Resolution & Fault Tolerance

The `resolve_chat_model` utility ensures zero downtime even if Groq deprecates or changes access to specific models:
1. Queries the Groq account model list.
2. Checks if `GROQ_MODEL` (or `openai/gpt-oss-120b`) is available.
3. If not found, automatically resolves to the first available chat-capable model (filtering out whisper/safeguard non-chat models).
4. Caches the resolved model name for subsequent requests.

---

## Error Handling Strategy

- **Validation Errors (`422 Unprocessable Entity`)**: Automatically generated by Pydantic with explicit field pointers.
- **Client Configuration Errors (`400 Bad Request`)**: Thrown when required interview context is missing or invalid.
- **Upstream / Internal Errors (`500 Internal Server Error`)**: Caught by FastAPI global exception handlers with sanitized client messages and detailed server logs.
