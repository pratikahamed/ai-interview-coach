# Production Deployment Guide: AI Interview Coach

This document outlines the end-to-end deployment procedure for running the **FastAPI backend** on **Render** and the **Next.js frontend** on **Vercel**.

---

## Architecture Overview

```
                                 Client Browser
                                       │
                   ┌───────────────────┴───────────────────┐
                   │                                       │
        Next.js Frontend (Vercel)                 Direct REST Calls
     https://ai-interview-coach.vercel.app                 │
                   │                                       │
                   │ HTTPS JSON                            │
                   ▼                                       │
        FastAPI Backend (Render) ◄─────────────────────────┘
     https://ai-interview-coach-backend.onrender.com
                   │
                   │ HTTPS API
                   ▼
             Groq Cloud API
          (openai/gpt-oss-120b)
```

---

## Prerequisites

Before starting deployment, ensure you have:
1. A **[GitHub](https://github.com/)** account with this repository pushed.
2. A **[Groq Cloud](https://console.groq.com/)** account and active API key (`gsk_...`).
3. A **[Render](https://render.com/)** account (for FastAPI backend).
4. A **[Vercel](https://vercel.com/)** account (for Next.js frontend).

---

## Step 1: Deploy Backend to Render

Deploy the FastAPI backend first so you have its live URL ready for the frontend.

### Option A: Using Render Blueprint (`render.yaml`)
1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect `render.yaml` at the root.
5. In the environment configuration step, enter your secret:
   - `GROQ_API_KEY`: Paste your Groq API key (`gsk_...`).
6. Click **Apply**. Render will build and deploy the service.

### Option B: Manual Web Service Setup
1. In the Render Dashboard, click **New +** &rarr; **Web Service**.
2. Connect your repository.
3. Configure the following settings:
   - **Name**: `ai-interview-coach-backend`
   - **Region**: Nearest to your users (e.g., Oregon, Frankfurt)
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:
   | Key | Value | Description |
   |---|---|---|
   | `PYTHON_VERSION` | `3.11.9` | Python runtime version |
   | `GROQ_API_KEY` | `gsk_your_actual_key_here` | Secret Groq API key |
   | `GROQ_MODEL` | `openai/gpt-oss-120b` | Target LLM model |
   | `ALLOWED_ORIGINS` | `*` *(or your Vercel URL once deployed)* | Permitted CORS origins |
5. Click **Create Web Service**.
6. Once deployed, copy your service URL (e.g., `https://ai-interview-coach-backend.onrender.com`).

---

## Step 2: Deploy Frontend to Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/).
2. Click **Add New...** &rarr; **Project**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Project Name**: `ai-interview-coach`
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select **`frontend`**.
   - **Build and Output Settings**: Keep default (`next build`, output `.next`).
5. Expand the **Environment Variables** section and add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://ai-interview-coach-backend.onrender.com` *(your Render URL from Step 1)* |
6. Click **Deploy**.
7. Vercel will build and deploy your application. Copy the production URL (e.g., `https://ai-interview-coach.vercel.app`).

---

## Step 3: Connect Services & Harden CORS

Once both services are deployed, update the backend CORS settings to only allow your official Vercel domain:

1. In the Render Dashboard, open your backend service &rarr; **Environment**.
2. Update `ALLOWED_ORIGINS`:
   ```env
   ALLOWED_ORIGINS=https://ai-interview-coach.vercel.app
   ```
3. Save changes. Render will automatically redeploy with the restricted CORS whitelist.

---

## Step 4: End-to-End Verification Checklist

Perform these verification checks on your live production URLs:

- [ ] **Backend Health Check**:
  - Open `https://your-backend.onrender.com/health` in your browser.
  - Expected response (`200 OK`): `{"message": "AI Interview Coach API is running"}`
- [ ] **Backend Swagger UI**:
  - Open `https://your-backend.onrender.com/docs` to verify OpenAPI schema.
- [ ] **Frontend Landing Page**:
  - Open `https://your-frontend.vercel.app`.
  - Verify the status badge displays **`Backend Operational`**.
- [ ] **Form Validation**:
  - Click **Start Interview** without input &rarr; confirm inline validation error appears.
- [ ] **Live Interview Flow**:
  - Enter topic `Python Basics`, select `Easy`, and click **Start Interview**.
  - Verify the AI interviewer generates an opening question within 1–3 seconds.
  - Enter an answer and submit via `Ctrl + Enter`.
  - Verify the AI interviewer responds with follow-up feedback.
- [ ] **Scorecard Generation**:
  - Click **Conclude Interview & Get Report**.
  - Verify the scorecard loads with integer score (0–100), verdict, strengths, weaknesses, and revision areas.

---

## Troubleshooting & Operational Notes

### 1. Render Free Tier Spin-Down (Cold Starts)
- On Render's free tier, inactive web services spin down after 15 minutes of inactivity.
- The first request after spin-down may take 30–50 seconds to boot up.
- The frontend includes a health check pre-flight indicator to inform users if the backend is warming up.

### 2. CORS Errors in Browser Console
- If the browser console shows `Access to fetch at ... has been blocked by CORS policy`:
  - Check `ALLOWED_ORIGINS` in Render environment variables.
  - Ensure the URL matches your exact Vercel domain including `https://` without a trailing slash.

### 3. Vercel Build Failures
- Ensure **Root Directory** in Vercel is set to `frontend`.
- Run `npm test` and `npm run build` locally in `frontend/` prior to pushing to catch any type errors.
