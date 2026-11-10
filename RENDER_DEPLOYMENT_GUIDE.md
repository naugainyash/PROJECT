# Deploying AarogyaVani on Render (Zero-Error Step-by-Step Guide)

AarogyaVani is a full-stack Node.js + Express + React 19 application. Follow these instructions to deploy it to [Render](https://render.com) with 100% success.

---

## Method 1: Automatic Blueprint (Recommended - 1 Click)

Because the repository includes `render.yaml`, Render can configure everything automatically:

1. Push your repository to **GitHub** or **GitLab**.
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Blueprint**.
4. Select your `aarogyavani-hospital-voice-bot` repository.
5. Render reads `render.yaml` and sets:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Region**: Singapore (lowest latency for Indic speech STT/TTS)
6. Under **Environment Variables**, fill in your secrets:
   - `GNANI_API_KEY`: Your Gnani developer API key (`X-API-Key-ID`)
   - `GEMINI_API_KEY`: *(Optional)* Your Gemini API key for grounded neural reasoning
   - `STAFF_PIN`: *(Optional)* 6-digit PIN for Reception Desk access (e.g. `849201`)
7. Click **Apply**. Render will install, build the React frontend into `dist/`, and start the production Express server!

---

## Method 2: Manual Web Service Setup on Render

If you prefer to create a Web Service manually:

1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub/GitLab repository.
3. Configure the following fields:
   - **Name**: `aarogyavani-voice-receptionist` (or any name you prefer)
   - **Language / Runtime**: **Node** *(do not select Python)*
   - **Region**: **Singapore** (or Oregon/Frankfurt)
   - **Branch**: `main` (or `master`)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

4. Scroll down to **Environment Variables** and add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production caching and serves `dist/` |
   | `GNANI_BASE_URL` | `https://api.vachana.ai` | Gnani REST API Gateway |
   | `TTS_MODEL` | `timbre-v3.0` | Gnani Timbre neural speech model |
   | `TTS_VOICE` | `Shivani` | Recommended expressive female voice |
   | `TTS_SPEED` | `1.0` | Natural conversational speed |
   | `GNANI_API_KEY` | *(your key)* | Your Gnani speech API key |
   | `GEMINI_API_KEY` | *(optional)* | Optional neural indicator key |
   | `STAFF_PIN` | `748291` | Any secure 6-digit staff dashboard PIN |

5. Click **Create Web Service**.

---

## What We Fixed to Guarantee Smooth Deployment

1. **Moved `tsx` to Runtime Dependencies**:
   - Render skips `devDependencies` when `NODE_ENV=production`. Moving `tsx` into `dependencies` ensures `npm start` (`tsx server.ts`) never fails with `tsx: command not found`.
2. **Removed Conflicting Python Root Files**:
   - Relocated old standalone `app.py` and `requirements.txt` to `docs/python-reference/` so Render's auto-detector never misidentifies the project as a Python service.
3. **Render Reverse-Proxy & CORS Configured**:
   - `server.ts` enables `app.set("trust proxy", 1)` when running in production or on Render, so `req.ip` and HTTPS headers work correctly.
   - CORS origin rules now automatically allow `*.onrender.com` and same-origin host requests.
4. **Resilient Production Static Fallback**:
   - If `npm run build` is ever accidentally skipped, `server.ts` now warns and falls back to dynamic Vite middlewares rather than crashing the container with `process.exit(1)`.
5. **Dynamic `$PORT` Binding**:
   - `server.ts` binds to `0.0.0.0` and listens on Render's dynamic `process.env.PORT`.
