#!/usr/bin/env node

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Try reading NEXT_PUBLIC_API_URL from .env.local if not set in process.env
let apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) {
  try {
    const envPath = path.resolve(__dirname, "..", ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/NEXT_PUBLIC_API_URL\s*=\s*(.+)/);
      if (match && match[1]) {
        apiUrl = match[1].trim();
      }
    }
  } catch {
    // Ignore error reading env
  }
}

apiUrl = apiUrl || "http://localhost:8000";

async function checkHealth() {
  console.log(`Checking backend health at ${apiUrl}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: "GET",
      signal: controller.signal,
    }).catch(async () => {
      // Fallback to root endpoint
      return await fetch(`${apiUrl}/`, {
        method: "GET",
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);

    if (response && response.ok) {
      console.log(`\x1b[32m✔ [SUCCESS] Backend server is running and healthy at ${apiUrl}\x1b[0m\n`);
      process.exit(0);
    } else {
      throw new Error(`Backend returned non-OK status: ${response ? response.status : "unknown"}`);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`
\x1b[31m╔══════════════════════════════════════════════════════════════════════════════╗
║ [ERROR] BACKEND SERVER IS NOT RUNNING OR UNREACHABLE!                        ║
╚══════════════════════════════════════════════════════════════════════════════╝\x1b[0m

Target URL: \x1b[33m${apiUrl}\x1b[0m
Details:    ${err.message}

The AI Interview Coach requires the FastAPI backend to generate questions
and evaluations. Please start the backend in a separate terminal:

  \x1b[36mcd backend\x1b[0m
  \x1b[36m.\\.venv\\Scripts\\python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload\x1b[0m

Then restart or refresh the frontend.
`);
    process.exit(1);
  }
}

checkHealth();
