# AI Interview Coach — Frontend Application

[![Next.js](https://img.shields.io/badge/Framework-Next.js%2014-black.svg?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/Library-React%2018-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tests-29%20Passing-success.svg)](https://vitest.dev/)

A modern, responsive, and accessible web interface built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and **Vitest**. The application provides an interactive technical mock interview experience powered by an AI interviewer with instant real-time feedback and structured scorecard evaluations.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Directory Structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [App Router Architecture & Pages](#app-router-architecture--pages)
  - [Landing Page (`/`)](#1-landing-page-)
  - [Interview Session (`/interview`)](#2-interview-session-interview)
  - [Evaluation Report Scorecard (`/report`)](#3-evaluation-report-scorecard-report)
- [API Client Layer](#api-client-layer)
- [Automated Testing Suite (Vitest)](#automated-testing-suite-vitest)
- [Design System & UI Components](#design-system--ui-components)
- [Production Deployment](#production-deployment)

---

## Features

- **Topic & Difficulty Selection**: Choose any software engineering topic (e.g., Python, System Design, React, SQL) and calibrate difficulty (*Easy*, *Medium*, *Hard*).
- **Backend Health Pre-Flight Check**: Real-time status badge indicating backend server connectivity.
- **Interactive Conversational UI**: Real-time chat bubbles with distinguished styles for AI interviewer and candidate messages.
- **Keyboard Shortcuts**: Send answers effortlessly using `Ctrl + Enter` (or `Cmd + Enter` on macOS).
- **Early / Natural Conclusion**: End the interview at any point or let the AI conclude when readiness has been evaluated.
- **Comprehensive Scorecard**: Detailed performance assessment including:
  - 0–100 integer score with dynamic color grading (Green `≥70`, Yellow `50–69`, Red `<50`).
  - Pass / Fail recommendation badge.
  - Qualitative evaluator verdict.
  - Categorized Strengths, Weaknesses, and Revision Areas.
- **Resilient Error Handling**: Automatic retry options and inline validation messages without page reload.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Next.js 14** | React Framework with App Router, server/client components, and static page optimization |
| **React 18** | Declarative component architecture and hooks |
| **TypeScript 5** | Strict static typing across components, props, and API payloads |
| **Tailwind CSS** | Utility-first CSS framework with custom dark theme palette |
| **shadcn/ui** | Accessible UI primitives (Card, Badge, Button, Input, Select, Textarea) |
| **Lucide React** | Clean, lightweight modern icons |
| **Vitest** | Blazing-fast Vite-native test runner with `@testing-library/react` and `jsdom` |

---

## Directory Structure

```
frontend/
├── .env.local                  # Environment configuration (NEXT_PUBLIC_API_URL)
├── .eslintrc.json              # ESLint configuration extending next/core-web-vitals
├── components.json             # shadcn/ui configuration
├── next.config.mjs             # Next.js runtime configuration
├── package.json                # Project dependencies and npm scripts
├── postcss.config.mjs          # PostCSS plugins configuration
├── tailwind.config.ts          # Tailwind tokens, animations, and color system
├── tsconfig.json               # TypeScript compiler configuration with @/* aliases
├── vitest.config.mts           # Vitest configuration with jsdom test environment
├── scripts/
│   └── check-backend.js        # Backend connectivity pre-flight script
└── src/
    ├── app/
    │   ├── layout.tsx          # Root HTML layout with dark theme & metadata
    │   ├── page.tsx            # Landing page with health check & interview launcher
    │   ├── interview/
    │   │   └── page.tsx        # Real-time multi-turn interview chat screen
    │   └── report/
    │       └── page.tsx        # Performance evaluation scorecard
    ├── components/
    │   └── ui/                 # Reusable shadcn/ui components
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── select.tsx
    │       └── textarea.tsx
    ├── lib/
    │   ├── api.ts              # Typed API client (startInterview, submitAnswer, generateReport)
    │   └── utils.ts            # Class merging utility (clsx + tailwind-merge)
    ├── test/
    │   └── setup.ts            # Test environment polyfills (matchMedia, ResizeObserver)
    └── __tests__/              # 29 automated Vitest test cases across 5 files
        ├── api.test.ts
        ├── layout.test.tsx
        ├── page.test.tsx
        ├── interview.test.tsx
        └── report.test.tsx
```

---

## Prerequisites

- **Node.js**: Version `18.17` or higher (compatible with Node.js 20 & 22)
- **FastAPI Backend**: Running at `http://localhost:8000` (see `../backend/README.md`)

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment Variables

Ensure `.env.local` exists in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Verify Backend Connectivity

Run the pre-flight verification script to ensure the backend is reachable:

```bash
npm run check-backend
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server at [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Compiles the optimized production build and validates TypeScript/ESLint |
| `npm run start` | Starts the Next.js production server using the built assets |
| `npm run lint` | Runs Next.js ESLint to detect syntax or formatting issues |
| `npm run check-backend` | Pings the FastAPI backend health endpoint (`/`) |
| `npm test` | Runs all 29 automated unit and component tests via Vitest |
| `npm run test:watch` | Runs Vitest in interactive watch mode for TDD workflows |

---

## App Router Architecture & Pages

### 1. Landing Page (`/`)
- **File**: `src/app/page.tsx`
- **Features**:
  - Live backend connectivity badge (`Operational` vs `Disconnected`).
  - Interview configuration form: topic input with popular suggestions, difficulty select dropdown.
  - Client-side validation: triggers inline error message when fields are empty.
  - Dynamic loading state: disables form and updates button text to *"Starting Interview..."*.
  - Dispatches `POST /api/interview/start` and navigates to `/interview` with URL-encoded parameters.

### 2. Interview Session (`/interview`)
- **File**: `src/app/interview/page.tsx`
- **Features**:
  - Displays interview metadata: topic badge, difficulty badge, and question counter.
  - Interactive conversation stream with automatic scrolling to latest message.
  - Multiline auto-resizing answer input with `Ctrl + Enter` submission support.
  - Progress indicator and "Conclude Interview & Get Report" button to wrap up early.
  - Automatic detection of `is_complete: true` from the backend to transition to the report.

### 3. Evaluation Report Scorecard (`/report`)
- **File**: `src/app/report/page.tsx`
- **Features**:
  - Fetches the evaluation scorecard via `POST /api/report/generate`.
  - Prominent circular/badge Score indicator (0–100) with calibrated color themes:
    - **Green** (`Score >= 70`): Passed with flying colors
    - **Amber / Yellow** (`50 <= Score < 70`): Needs minor improvement
    - **Red** (`Score < 50`): Significant gaps identified
  - Qualitative Evaluator Verdict card.
  - Side-by-side Strengths and Weaknesses breakdown.
  - Revision Topics tag cloud.
  - Action buttons: "Practice Another Topic" (returns to `/`) or "Retry Interview".

---

## API Client Layer

All backend communication is centralized in `src/lib/api.ts`:

- `startInterview(topic: string, difficulty: string)`: Calls `POST /api/interview/start`.
- `submitAnswer(topic: string, difficulty: string, answer: string, history: Message[])`: Calls `POST /api/interview/answer`.
- `generateReport(topic: string, difficulty: string, history: Message[])`: Calls `POST /api/report/generate`.

Each function implements uniform error handling, ensuring meaningful error messages are presented to the UI if a network failure occurs.

---

## Automated Testing Suite (Vitest)

Run the full frontend test suite:

```bash
npm test
```

### Test Coverage Breakdown (29 Tests across 5 Files)

- **`src/__tests__/layout.test.tsx` (1 test)**:
  - Validates HTML title, description metadata, and dark theme class injection.
- **`src/__tests__/api.test.ts` (5 tests)**:
  - Verifies payload formatting, HTTP headers (`application/json`), and error handling for all 3 API functions.
- **`src/__tests__/page.test.tsx` (8 tests)**:
  - Verifies landing page rendering, form inputs, validation error alerts, button loading states, API dispatch, and Next.js router transitions.
- **`src/__tests__/interview.test.tsx` (9 tests)**:
  - Verifies conversation message bubble rendering, user message submission, `Ctrl+Enter` keyboard triggers, error recovery, and report navigation.
- **`src/__tests__/report.test.tsx` (6 tests)**:
  - Verifies scorecard rendering, Pass/Fail recommendation badge styling, dynamic score coloring rules, error retry button, and topic restart.

---

## Design System & UI Components

- **Dark Professional Palette**: Slate/Zinc dark theme optimized for readability and reduced eye strain.
- **Component Primitives**: Located in `src/components/ui/` and styled with Tailwind utility classes.
- **Micro-Interactions**: Smooth hover effects, loading spinners, and focus outlines on all interactive elements.

---

## Production Deployment

### Building for Production

```bash
npm run build
```

This compiles optimized static HTML/JavaScript bundles into `.next/`.

### Starting the Production Server

```bash
npm start
```

The application will be served at [http://localhost:3000](http://localhost:3000).
