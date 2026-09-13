# AI Interview Coach — Manual End-to-End Testing Guide

This guide provides a comprehensive, step-by-step procedure for manually running and verifying the AI Interview Coach application end-to-end across both the **FastAPI backend** (Port `8000`) and the **Next.js frontend** (Port `3000`).

---

## Table of Contents

- [Pre-Flight Checklist](#pre-flight-checklist)
- [1. Start the Backend Server (Terminal 1)](#1-start-the-backend-server-terminal-1)
- [2. Start the Frontend Application (Terminal 2)](#2-start-the-frontend-application-terminal-2)
- [3. Manual Browser Verification Scenarios](#3-manual-browser-verification-scenarios)
  - [Test Case 1: Landing Page & Live Health Check](#test-case-1-landing-page--live-health-check)
  - [Test Case 2: Client-Side Form Validation Guardrails](#test-case-2-client-side-form-validation-guardrails)
  - [Test Case 3: Session Initialization & Question Calibration](#test-case-3-session-initialization--question-calibration)
  - [Test Case 4: Real-time Multi-Turn Interview & Shortcuts](#test-case-4-real-time-multi-turn-interview--shortcuts)
  - [Test Case 5: Performance Evaluation Report & Scorecard](#test-case-5-performance-evaluation-report--scorecard)
- [Port Management & Cleanup](#port-management--cleanup)
- [Automated Regression Test Reference](#automated-regression-test-reference)

---

## Pre-Flight Checklist

Before launching the servers, ensure the following configuration files exist:

1. **`backend/.env`**:
   ```env
   GROQ_API_KEY=gsk_your_actual_groq_api_key_here
   GROQ_MODEL=openai/gpt-oss-120b
   ```
2. **`frontend/.env.local`**:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. **Port Availability**:
   - Verify that ports `8000` and `3000` are free (see [Port Management](#port-management--cleanup) if needed).

---

## 1. Start the Backend Server (Terminal 1)

Open your first terminal in the repository root and navigate to `backend/`:

### Windows (PowerShell):
```powershell
cd backend
.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Linux / macOS:
```bash
cd backend
./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### Expected Startup Output:
```text
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     AI Interview Coach API started successfully
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

> [!TIP]
> **Swagger API Verification**: Visit [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to test `/health` or any endpoint interactively.

---

## 2. Start the Frontend Application (Terminal 2)

Open a second terminal in the repository root and navigate to `frontend/`:

```powershell
cd frontend
npm run dev
```

### Expected Startup Output:
```text
  ▲ Next.js 14.2.35
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Starting...
 ✓ Ready in 1.5s
```

---

## 3. Manual Browser Verification Scenarios

Open your web browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

### Test Case 1: Landing Page & Live Health Check
- **Objective**: Verify that the Next.js frontend renders properly and detects the running backend service.
- **Action**: Load `http://localhost:3000`.
- **Expected Outcome**:
  - The dark professional theme loads cleanly with the title **AI Interview Coach**.
  - A green status badge displays: **`Backend Operational`** (confirming successful pre-flight ping to `http://localhost:8000/health`).

---

### Test Case 2: Client-Side Form Validation Guardrails
- **Objective**: Ensure the form prevents submission when required inputs are missing.
- **Action**:
  1. Leave the **Interview Topic** input field completely empty.
  2. Do not select a difficulty level.
  3. Click the **Start Interview** button.
- **Expected Outcome**:
  - An inline red error banner appears immediately:
    > *"Please enter an interview topic and select a difficulty level."*
  - The browser remains on `/` without reloading or sending an API request.

---

### Test Case 3: Session Initialization & Question Calibration
- **Objective**: Verify that the backend and Groq LLM calibrate and generate the first technical question based on selected topic and difficulty.
- **Action**:
  1. In **Interview Topic**, enter a subject (e.g., `Python Data Structures`, `React State Management`, or `SQL Indexes`).
  2. In **Difficulty Level**, select `Easy` (or `Medium` / `Hard`).
  3. Click **Start Interview**.
- **Expected Outcome**:
  - The button disables and shows **`Starting Interview...`**.
  - The browser transitions to `/interview?topic=...&difficulty=...`.
  - The chat view displays the AI Interviewer's first calibrated question.

---

### Test Case 4: Real-time Multi-Turn Interview & Shortcuts
- **Objective**: Verify conversational turn taking, user message display, and keyboard shortcut handling.
- **Action**:
  1. Click into the answer textarea.
  2. Type a response to the question.
     - *Example*: `"A list is mutable and defined with square brackets, while a tuple is immutable and defined with parentheses."`
  3. Submit using the keyboard shortcut: **`Ctrl + Enter`** (or `Cmd + Enter` on macOS), or click the **Send** button.
- **Expected Outcome**:
  - Your message appears in a right-aligned candidate message bubble labeled **You**.
  - The input field clears and an AI typing/loading state appears.
  - The AI interviewer responds with brief feedback and an intelligent follow-up question.

---

### Test Case 5: Performance Evaluation Report & Scorecard
- **Objective**: Verify evaluation report synthesis, score rules, and scorecard visual presentation.
- **Action**:
  1. Answer 1–2 questions or click **`Conclude Interview & Get Report`** in the top navigation bar.
  2. Wait a moment while the backend synthesizes the conversation transcript into a structured report.
- **Expected Outcome**:
  - The page navigates to `/report`.
  - The **Performance Scorecard** renders with:
    - **Overall Score Badge**: 0–100 score with dynamic color grading:
      - 🟢 **Green** (`Score ≥ 70`): Pass
      - 🟡 **Amber** (`50 ≤ Score < 70`): Borderline
      - 🔴 **Red** (`Score < 50`): Needs work
    - **Recommendation**: Pass or Fail badge.
    - **Evaluator Verdict**: Qualitative paragraph evaluating candidate competence.
    - **Key Strengths**: Specific bullet points of observed strengths.
    - **Areas for Improvement**: Specific knowledge gaps identified.
    - **Recommended Revision Topics**: Tag cloud of study subjects.
  3. Click **`Practice Another Topic`**:
     - Navigates cleanly back to `/` to start a new mock interview session.

---

## Port Management & Cleanup

If you ever see an error such as `Port 8000 or 3000 already in use`:

### Find and Free Port 8000 (Windows PowerShell):
```powershell
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Find and Free Port 3000 (Windows PowerShell):
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

## Automated Regression Test Reference

Run the test suites at any time to verify code integrity:

### Backend Tests (35 Tests):
```powershell
cd backend
# 30 Offline Unit Tests
.\.venv\Scripts\python -m pytest tests/unit -v --tb=short

# 5 Live Integration Tests (calls Groq API)
.\.venv\Scripts\python -m pytest tests/integration -v -s --tb=short

# Diagnostic Script
.\.venv\Scripts\python tests/test_groq_api.py
```

### Frontend Tests (29 Tests & Build):
```powershell
cd frontend
# 29 Vitest Unit & Component Tests
npm test

# Production Build & TypeScript Verification
npm run build
```
