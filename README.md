# AI Interview Coach

An AI-powered technical interview preparation platform that simulates realistic technical interviews, asks calibrated questions based on chosen topics and difficulty levels, and generates comprehensive evaluation scorecards.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Vitest
- **Backend**: FastAPI (Python 3.10+), Pydantic v2, Uvicorn, Pytest
- **AI / LLM Integration**: Groq Cloud API (`openai/gpt-oss-120b`)
- **Package Managers**: npm (Node.js) & pip (Python virtual environment)

---

## Environment Configuration

The repository includes a root [`.env.example`](./.env.example) template with placeholders for all required environment variables.

### 1. Backend Configuration
Create `backend/.env` from `.env.example`:

```bash
# Required
GROQ_API_KEY=

# Optional defaults
GROQ_MODEL=openai/gpt-oss-120b
ALLOWED_ORIGINS=http://localhost:3000
```

> **Note**: Obtain a Groq API key from the [Groq Console](https://console.groq.com/).

### 2. Frontend Configuration
Create `frontend/.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Local Setup & Dependency Installation

### 1. Prerequisites
- **Python**: Version `3.10` or higher
- **Node.js**: Version `18.17` or higher

### 2. Backend Setup
Navigate to the `backend/` directory, set up a virtual environment, and install dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```
*(On macOS / Linux: `source .venv/bin/activate && pip install -r requirements.txt`)*

### 3. Frontend Setup
Navigate to the `frontend/` directory and install dependencies:

```bash
cd frontend
npm install
```

---

## Running Locally

Run both the backend and frontend servers concurrently in separate terminals:

### 1. Start Backend Server (Terminal 1)
```powershell
cd backend
.\.venv\Scripts\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*(On macOS / Linux: `./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload`)*

- **API Root**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Start Frontend Application (Terminal 2)
```bash
cd frontend
npm run dev
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)

---

## Deployment Documentation

For future deployment instructions on running the FastAPI backend on **Render** and the Next.js frontend on **Vercel**, refer to [`DEPLOYMENT.md`](./DEPLOYMENT.md).
