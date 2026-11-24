# CollabScore AI

Group-project accountability for Google Workspace and Google Classroom. Turns verified Google Docs/Slides revision telemetry and structured peer check-ins into fair, auditable individual student scores using **Gemini 3.8 Flash** (`@google/genai`).

---

## Architecture Overview

- **`/backend`** — Node.js + Express (ES Modules), `mysql2/promise` (Laragon MySQL + automatic demo memory fallback), `googleapis` (OAuth 2.0 + Drive v3 `revisions.list` + Classroom API), `@google/genai` (`gemini-3.8-flash` with `thinkingLevel: "medium"` and strict JSON `responseSchema`), AES-256-GCM token encryption, and JWT auth.
- **`/frontend`** — React 19 (Vite) + Tailwind CSS v4 + Recharts + Lucide icons + Google Picker API (`drive.file` scope).

---

## 1. Local Laragon MySQL Setup

1. Start **Laragon** and click **Start All** so MySQL is listening on `127.0.0.1:3306` (`user: root`, empty password).
2. Copy environment templates:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   *(In `frontend/.env`, you can leave `VITE_API_URL=` empty during local development to use Vite's `/api` proxy, or set `VITE_API_URL=http://localhost:5000`.)*
3. Install dependencies and run the database migration & seed scripts from the repo root:
   ```bash
   npm --prefix backend install
   npm --prefix frontend install
   npm run db:migrate
   npm run db:seed
   ```
   > **Offline Demo Fallback:** If local MySQL is stopped, the backend automatically starts in `memory-demo` mode with the same seeded 4-student Capstone project (`44% / 28% / 23% / 5%`) so live demos always work.

---

## 2. Google Cloud Console Setup (`drive.file` — No Restricted Scopes)

1. Open [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable these APIs under **APIs & Services → Library**:
   - **Google Drive API**
   - **Google Picker API**
   - **Google Classroom API**
3. Configure **OAuth Consent Screen** (External or Internal) and add only non-sensitive / Classroom read scopes:
   - `openid`, `email`, `profile`
   - `https://www.googleapis.com/auth/drive.file` *(do NOT add `drive.readonly`)*
   - `https://www.googleapis.com/auth/classroom.courses.readonly`
   - `https://www.googleapis.com/auth/classroom.coursework.me.readonly`
   - `https://www.googleapis.com/auth/classroom.rosters.readonly`
4. Create an **OAuth 2.0 Client ID (Web application)**:
   - **Authorized JavaScript origins:** `http://localhost:5173`, `http://localhost:5000`
   - **Authorized redirect URIs:** `http://localhost:5000/api/auth/google/callback`
5. Create an **API Key** (for Google Picker) restricted to the **Google Picker API** and your frontend origin.
6. Copy `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` into `backend/.env`, and `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`, and `VITE_GOOGLE_APP_ID` (your numeric Cloud Project Number) into `frontend/.env`.

---

## 3. Google AI Studio Setup (`gemini-3.8-flash`)

1. Generate a free-tier API key at [Google AI Studio](https://aistudio.google.com/).
2. Set `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.8-flash` inside `backend/.env`.
3. `POST /api/projects/:id/analyze` caches results in the `ai_evaluations` table to avoid burning quota on repeated views; click **Re-run Live AI Audit** when you want a fresh live evaluation.

---

## 4. Running Locally

Run backend and frontend in two terminals from `c:\Collabscore_ai`:

```bash
# Terminal 1 (API on http://localhost:5000)
npm run dev:backend

# Terminal 2 (Vite UI on http://localhost:5173)
npm run dev:frontend
```

Open `http://localhost:5173` and click **"Load Interactive Demo Workspace"** (or sign in with Google). Use the **Student Leader View / Instructor View** toggle in the header to demonstrate both workflows without logging out.

---

## 5. Render Deployment (`render.yaml`)

1. Push the repository to GitHub and connect it as a **Blueprint** in Render using `render.yaml`.
2. In Render Dashboard:
   - On `collabscore-ai-api`: set `FRONTEND_URL` (your deployed static site URL), `DATABASE_URL` (managed MySQL / PlanetScale / RDS URL), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (`https://<your-api>.onrender.com/api/auth/google/callback`), and `GEMINI_API_KEY`.
   - On `collabscore-ai-web`: set `VITE_API_URL` (`https://<your-api>.onrender.com`) and your `VITE_GOOGLE_*` Picker keys.
3. Add your Render URLs to Google Cloud Console's Authorized Origins and Redirect URIs.

---

## 6. Railway Deployment (`Dockerfile` + `railway.json`)

1. Push your latest commits to GitHub and create a **New Project → Deploy from GitHub Repo** in Railway.
2. Railway automatically builds via [Dockerfile](file:///c:/Collabscore_ai/Dockerfile) and [railway.json](file:///c:/Collabscore_ai/railway.json), serving both the React SPA and the Express API from one service (`GET /api/health` healthcheck).
3. Add a **MySQL** service in the same Railway project, then on your app service reference its connection variables (Railway injects `MYSQL_URL` / `MYSQLHOST` / `MYSQLUSER` / `MYSQLPASSWORD` / `MYSQLDATABASE`, or you can set `DATABASE_URL=${{MySQL.MYSQL_URL}}`).
4. Set optional/production environment variables on your Railway app service:
   - `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY` (strong random strings)
   - `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.8-flash`
   - *(Optional for live Google Login)* `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI=https://<your-domain>.up.railway.app/api/auth/google/callback`
5. Under **Settings → Networking**, click **Generate Domain** (or set `PORT` if overridden). Railway automatically injects `RAILWAY_PUBLIC_DOMAIN`, which CollabScore AI uses for CORS and redirects.
