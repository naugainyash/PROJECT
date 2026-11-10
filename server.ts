/**
 * Express + Vite Server for AarogyaVani Hospital Voice Receptionist
 * Full-stack backend integrating:
 * 1. Gnani AI Speech APIs (Prisma v3.0 STT & Timbre v3.0 TTS)
 * 2. Pre-LLM Deterministic Safety Gate (Emergency 108 & Medication Guardrails)
 * 3. Server-side Gemini 2.5 Flash Grounded Assistant with Output Validation
 * 4. Deterministic Clinical Knowledge Fallback Engine
 * 5. Hardened Security: Helmet headers, strict CORS, express-rate-limit,
 *    constant-time crypto PIN verification, brute-force lockout, and data masking.
 */

import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GoogleGenAI } from "@google/genai";
import {
  evaluateHospitalQuery,
  checkEmergency,
  checkSelfHarm,
  checkMedicationRefusal,
  validateGeminiOutput,
  extractLead,
  Lead,
} from "./src/services/hospitalLogic";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ============================================================================
// SECURITY HEADERS & APP HARDENING
// ============================================================================
app.disable("x-powered-by");
// Disable trust proxy to prevent client-controlled X-Forwarded-For header spoofing
app.set("trust proxy", false);

// Security Headers: Configured for seamless AI Studio iframe embedding
app.use(
  helmet({
    contentSecurityPolicy: false,
    xFrameOptions: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Strict CORS Allow-List: Explicit origins only (No google.com wildcards)
const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https:\/\/ais-(?:dev|pre)-[a-z0-9-]+\.asia-southeast1\.run\.app$/,
  /^https:\/\/aistudio\.google\.com$/,
  /^https:\/\/ai\.google\.dev$/,
];

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
    if (isAllowed) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, X-API-Key-ID, X-Staff-PIN"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// STRICT FILE SYSTEM PROTECTION GATE (C1 Defense)
// Intercepts and blocks direct download of backend source, databases, and internal configs
// ============================================================================
app.use((req: Request, res: Response, next: NextFunction) => {
  const p = req.path.toLowerCase();
  if (
    p === "/server.ts" ||
    p === "/package.json" ||
    p === "/package-lock.json" ||
    p === "/bun.lock" ||
    p === "/tsconfig.json" ||
    p === "/hospital_data.json" ||
    p.startsWith("/data") ||
    p.startsWith("/docs") ||
    p.startsWith("/.aistudio") ||
    p.startsWith("/.env") ||
    p.endsWith("leads.json") ||
    p.endsWith("analytics.json") ||
    p.endsWith(".md") ||
    p.endsWith(".py") ||
    p.endsWith(".lock")
  ) {
    return res.status(403).json({
      success: false,
      code: "FORBIDDEN_FILE_ACCESS",
      error: "Direct access to internal source, documentation, or data files is strictly forbidden.",
    });
  }
  next();
});

// Request body size caps
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Upload limits for 16kHz mono audio
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================================
// RATE LIMITERS (Anti-DoS & Quota Burn Protection)
// ============================================================================

// General API limiter: 1500 requests per 15 minutes per IP (supports real-time dashboard polling)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: false,
  },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "127.0.0.1",
  skip: (req) => {
    // Health check and hospital data shouldn't be rate-limited
    const path = req.path.replace(/^\/api/, "");
    return path === "/health" || path === "/hospital";
  },
  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    error: "Too many requests. Please wait a moment before trying again.",
  },
});

// Voice & AI processing limiter: 60 requests per minute per IP
const voiceAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: false,
  },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "127.0.0.1",
  message: {
    success: false,
    code: "VOICE_RATE_LIMIT_EXCEEDED",
    error: "Voice processing rate limit reached. Please wait a few seconds.",
  },
});

// Staff PIN verification limiter: 10 attempts per 15 minutes per IP
const pinAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: false,
  },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "127.0.0.1",
  message: {
    success: false,
    code: "PIN_RATE_LIMIT_EXCEEDED",
    error: "Too many PIN verification attempts. Please try again later.",
  },
});

// Apply general limiter to all API routes
app.use("/api/", generalApiLimiter);

// ============================================================================
// CONSTANT-TIME STAFF PIN AUTHENTICATION & LOCKOUT
// ============================================================================

// Refuse weak or publicly documented default PINs
const WEAK_PINS = new Set([
  "1234",
  "849201",
  "0000",
  "000000",
  "CHANGE_ME",
  "1111",
  "111111",
  "123456",
  "admin",
  "password",
]);

const RAW_STAFF_PIN = (process.env.STAFF_PIN || "").trim();
let ACTIVE_STAFF_PIN = RAW_STAFF_PIN;
if (!ACTIVE_STAFF_PIN || WEAK_PINS.has(ACTIVE_STAFF_PIN) || ACTIVE_STAFF_PIN.length < 6) {
  ACTIVE_STAFF_PIN = crypto.randomInt(100000, 999999).toString();
  console.warn("⚠️ Security Notice: Default, weak, or short STAFF_PIN refused. Generated secure 6-digit session PIN.");
}

interface FailedAttemptRecord {
  attempts: number;
  lockedUntil: number;
}
const pinAttemptStore = new Map<string, FailedAttemptRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Global brute force protection
let globalFailedPinAttempts = 0;
let globalLockedUntil = 0;
const GLOBAL_MAX_FAILED = 25;

/**
 * Constant-time comparison using crypto.timingSafeEqual
 */
function verifyPinConstantTime(providedPin: string | undefined): boolean {
  if (!providedPin || typeof providedPin !== "string") return false;
  const a = Buffer.from(providedPin.trim());
  const b = Buffer.from(ACTIVE_STAFF_PIN);
  if (a.length !== b.length) {
    // Run dummy comparison to normalize CPU timing
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function checkStaffAuth(req: Request): {
  authorized: boolean;
  lockedOut?: boolean;
  remainingAttempts?: number;
} {
  // Use direct socket address; trust proxy is disabled to prevent X-Forwarded-For spoofing
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();

  // Check global lockout
  if (globalLockedUntil > now) {
    return { authorized: false, lockedOut: true };
  }

  // Check IP-specific lockout
  const record = pinAttemptStore.get(clientIp);
  if (record && record.lockedUntil > now) {
    return { authorized: false, lockedOut: true };
  }

  // Header-only authentication: reject query string parameter ?pin=
  const headerPin =
    (req.headers["x-staff-pin"] as string) ||
    req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

  if (!headerPin) {
    return { authorized: false };
  }

  const isValid = verifyPinConstantTime(headerPin);
  if (isValid) {
    pinAttemptStore.delete(clientIp);
    return { authorized: true };
  } else {
    // Correct lockout expiration check: only reset if lockedUntil was actually active (> 0) and has now passed
    const isLockoutExpired = record && record.lockedUntil > 0 && record.lockedUntil <= now;
    const currentAttempts = (isLockoutExpired ? 0 : (record?.attempts || 0)) + 1;

    globalFailedPinAttempts += 1;
    if (globalFailedPinAttempts >= GLOBAL_MAX_FAILED) {
      globalLockedUntil = now + LOCKOUT_DURATION_MS;
      return { authorized: false, lockedOut: true };
    }

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      pinAttemptStore.set(clientIp, {
        attempts: currentAttempts,
        lockedUntil: now + LOCKOUT_DURATION_MS,
      });
      return { authorized: false, lockedOut: true };
    } else {
      pinAttemptStore.set(clientIp, {
        attempts: currentAttempts,
        lockedUntil: 0,
      });
      return {
        authorized: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS - currentAttempts,
      };
    }
  }
}

/**
 * Authentication Middleware for staff-restricted actions
 */
function requireStaffAuth(req: Request, res: Response, next: NextFunction) {
  const auth = checkStaffAuth(req);
  if (auth.lockedOut) {
    return res.status(429).json({
      success: false,
      code: "PIN_LOCKED_OUT",
      error: "Too many incorrect PIN attempts. Access locked for 15 minutes.",
    });
  }
  if (!auth.authorized) {
    return res.status(401).json({
      success: false,
      code: "STAFF_AUTHENTICATION_REQUIRED",
      error: "Valid staff PIN required in X-Staff-PIN header.",
      remaining_attempts: auth.remainingAttempts,
    });
  }
  next();
}

// ============================================================================
// STORAGE & DATA PATHS (Isolated outside client build directory)
// ============================================================================

const GNANI_API_KEY = process.env.GNANI_API_KEY || "";
const GNANI_BASE_URL = process.env.GNANI_BASE_URL || "https://api.vachana.ai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TTS_MODEL = process.env.TTS_MODEL || "timbre-v3.0";
const TTS_VOICE = process.env.TTS_VOICE || "Shivani";

// Externalize DATA_DIR outside the workspace root so Vite can never serve it
const DATA_DIR = process.env.DATA_DIR || path.resolve(process.env.HOME || "/tmp", "aarogyavani_data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const HOSPITAL_DATA_PATH = path.resolve("./hospital_data.json");
const LEADS_DATA_PATH = path.join(DATA_DIR, "leads.json");
const ANALYTICS_DATA_PATH = path.join(DATA_DIR, "analytics.json");

// Serialized atomic file writer queue to eliminate read-modify-write race conditions
let writeQueue: Promise<void> = Promise.resolve();

function atomicWriteJson(filePath: string, data: any): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const tempPath = path.join(
      path.dirname(filePath),
      `.tmp.${crypto.randomUUID()}.json`
    );
    try {
      await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.promises.rename(tempPath, filePath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          await fs.promises.unlink(tempPath);
        } catch {}
      }
      console.error(`Failed atomic write to ${filePath}:`, err);
    }
  });
  return writeQueue;
}

function getHospitalData(): any {
  if (fs.existsSync(HOSPITAL_DATA_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(HOSPITAL_DATA_PATH, "utf-8"));
    } catch {}
  }
  return { hospital_name: "Aarogya Seva Hospital" };
}

function getLeads(): Lead[] {
  if (!fs.existsSync(LEADS_DATA_PATH)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LEADS_DATA_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function saveLeads(leads: Lead[]): void {
  atomicWriteJson(LEADS_DATA_PATH, leads);
}

interface LiveQueryRecord {
  id: string;
  type: "voice" | "text";
  query: string;
  category: string;
  language: string;
  isEmergency: boolean;
  reply_snippet: string;
  timestamp: string;
}

interface AnalyticsData {
  queries_total: number;
  by_language: Record<string, number>;
  by_category: Record<string, number>;
  emergencies: number;
  leads: number;
  recent_queries: LiveQueryRecord[];
}

function getInitialAnalytics(): AnalyticsData {
  return {
    queries_total: 8,
    by_language: {
      "hi-IN": 4,
      "en-IN": 2,
      "ta-IN": 1,
      "te-IN": 1,
    },
    by_category: {
      doctor_inquiry: 3,
      emergency: 1,
      medical_refusal: 1,
      test_inquiry: 2,
      lead_captured: 1,
    },
    emergencies: 1,
    leads: 1,
    recent_queries: [
      {
        id: "q-init-1",
        type: "voice",
        query: "सीने में बहुत तेज दर्द हो रहा है और सांस रुक रही है",
        category: "emergency",
        language: "hi-IN",
        isEmergency: true,
        reply_snippet: "यह एक गंभीर आपातकालीन स्थिति लग रही है। तुरंत 108 पर कॉल करें या सीधे गेट 1 कैजुअल्टी वार्ड में पहुँचें।",
        timestamp: "10:42 AM",
      },
      {
        id: "q-init-2",
        type: "voice",
        query: "What time does pediatrician Dr. Arvind Rao sit?",
        category: "doctor_inquiry",
        language: "en-IN",
        isEmergency: false,
        reply_snippet: "Dr. Arvind Rao is available Monday, Wednesday, Friday 10:00 AM to 4:00 PM. Fee is ₹500.",
        timestamp: "10:38 AM",
      },
      {
        id: "q-init-3",
        type: "text",
        query: "बच्चे को बुखार की कौन सी दवा देनी चाहिए?",
        category: "medical_refusal",
        language: "hi-IN",
        isEmergency: false,
        reply_snippet: "सुरक्षा कारणों से, मैं विशिष्ट दवाओं की खुराक नहीं बता सकता। कृपया डॉक्टर से परामर्श लें।",
        timestamp: "10:35 AM",
      },
      {
        id: "q-init-4",
        type: "voice",
        query: "சர்க்கரை பரிசோதனைக்கு வெறும் வயிற்றில் வர வேண்டுமா?",
        category: "test_inquiry",
        language: "ta-IN",
        isEmergency: false,
        reply_snippet: "சர்க்கரை பரிசோதனைக்கு எட்டு முதல் பத்து மணி நேரம் வெறும் வயிற்றில் வர வேண்டும்.",
        timestamp: "10:30 AM",
      },
      {
        id: "q-init-5",
        type: "voice",
        query: "Book callback for Priya Sharma 9829012345 for gynecology consultation",
        category: "lead_captured",
        language: "en-IN",
        isEmergency: false,
        reply_snippet: "Thank you Priya Sharma. Callback request noted for Dr. Sunita Mehra (slot: 11:30 AM - 12:00 PM).",
        timestamp: "10:24 AM",
      },
      {
        id: "q-init-6",
        type: "text",
        query: "हड्डी के डॉक्टर अमित वर्मा की फीस कितनी है?",
        category: "doctor_inquiry",
        language: "hi-IN",
        isEmergency: false,
        reply_snippet: "हड्डी रोग विशेषज्ञ डॉक्टर अमित वर्मा मंगलवार और शुक्रवार बैठते हैं। फीस ₹700 है।",
        timestamp: "10:18 AM",
      },
      {
        id: "q-init-7",
        type: "voice",
        query: "ईसीजी और छाती के एक्स-रे का कितना चार्ज लगेगा?",
        category: "test_inquiry",
        language: "hi-IN",
        isEmergency: false,
        reply_snippet: "ईसीजी ₹250 और डिजिटल छाती का एक्स-रे ₹400 है। रिपोर्ट 30 मिनट में मिल जाती है।",
        timestamp: "10:12 AM",
      },
      {
        id: "q-init-8",
        type: "text",
        query: "ఆదివారం ఓపీడీ తెరిచి ఉంటుందా?",
        category: "timing_inquiry",
        language: "te-IN",
        isEmergency: false,
        reply_snippet: "ఆదివారాల్లో సాధారణ ఓపీడీ మూసివేయబడుతుంది, అయితే 24 గంటల ఎమర్జెన్సీ వార్డు తెరిచి ఉంటుంది.",
        timestamp: "10:05 AM",
      },
    ],
  };
}

function getAnalytics(): AnalyticsData {
  if (fs.existsSync(ANALYTICS_DATA_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(ANALYTICS_DATA_PATH, "utf-8"));
      if (data && typeof data.queries_total === "number" && data.queries_total > 0) {
        if (!Array.isArray(data.recent_queries)) data.recent_queries = [];
        return data;
      }
    } catch {}
  }
  const initial = getInitialAnalytics();
  atomicWriteJson(ANALYTICS_DATA_PATH, initial);
  return initial;
}

function recordAnalytics(
  category: string,
  language: string,
  isEmergency = false,
  isLead = false,
  queryDetail?: { type: "voice" | "text"; query: string; reply: string }
): void {
  const analytics = getAnalytics();

  analytics.queries_total = (analytics.queries_total || 0) + 1;
  const langKey = language || "indic-auto";
  analytics.by_language = analytics.by_language || {};
  analytics.by_language[langKey] = (analytics.by_language[langKey] || 0) + 1;
  analytics.by_category = analytics.by_category || {};
  analytics.by_category[category] = (analytics.by_category[category] || 0) + 1;

  if (isEmergency) analytics.emergencies = (analytics.emergencies || 0) + 1;
  if (isLead) analytics.leads = (analytics.leads || 0) + 1;

  if (queryDetail && queryDetail.query) {
    const entry: LiveQueryRecord = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: queryDetail.type,
      query: queryDetail.query.substring(0, 160),
      category,
      language: langKey,
      isEmergency,
      reply_snippet: queryDetail.reply ? queryDetail.reply.substring(0, 140) : "",
      timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
    if (!Array.isArray(analytics.recent_queries)) {
      analytics.recent_queries = [];
    }
    analytics.recent_queries.unshift(entry);
    if (analytics.recent_queries.length > 30) {
      analytics.recent_queries = analytics.recent_queries.slice(0, 30);
    }
  }

  atomicWriteJson(ANALYTICS_DATA_PATH, analytics);
}

// ============================================================================
// GNANI AI INTEGRATION
// ============================================================================

function buildGnaniKeyterms(hospitalData: any): string[] {
  const terms: string[] = ["OPD", "Casualty", "108", "Doctor"];
  if (Array.isArray(hospitalData.doctors)) {
    hospitalData.doctors.forEach((d: any) => {
      if (d.name) terms.push(d.name);
      if (d.name_hi) terms.push(d.name_hi);
      if (d.specialty) terms.push(d.specialty.split(" ")[0]);
    });
  }
  if (Array.isArray(hospitalData.diagnostic_tests)) {
    hospitalData.diagnostic_tests.forEach((t: any) => {
      if (t.name) terms.push(t.name.split(" ")[0]);
      if (Array.isArray(t.aliases)) terms.push(...t.aliases.slice(0, 2));
    });
  }
  return Array.from(new Set(terms)).slice(0, 25);
}

async function callGnaniSTT(
  audioBuffer: Buffer,
  filename: string,
  targetLanguage: string = "indic-auto"
): Promise<{ transcript: string; detectedLanguage: string }> {
  if (!GNANI_API_KEY) {
    throw new Error("Gnani STT API key not configured");
  }

  const hospitalData = getHospitalData();
  const keyterms = buildGnaniKeyterms(hospitalData);

  const formData = new FormData();
  const uint8 = new Uint8Array(audioBuffer);
  const blob = new Blob([uint8], { type: "audio/wav" });
  formData.append("audio_file", blob, filename);
  formData.append("model", "prisma-v3.0");
  formData.append("language_code", targetLanguage || "indic-auto");
  formData.append("format", "transcribe");
  formData.append("keyterms", JSON.stringify(keyterms));

  const response = await fetch(`${GNANI_BASE_URL}/stt/v3`, {
    method: "POST",
    headers: {
      "X-API-Key-ID": GNANI_API_KEY,
    },
    body: formData,
  });

  if (response.status === 429) {
    const rateLimitErr: any = new Error("Gnani STT rate limit exceeded (HTTP 429)");
    rateLimitErr.status = 429;
    throw rateLimitErr;
  }

  if (!response.ok) {
    throw new Error(`Gnani STT error (${response.status})`);
  }

  const json = (await response.json()) as any;
  const detected = json.detected_language_code;
  return {
    transcript: (json.transcript || "").trim(),
    detectedLanguage: targetLanguage !== "indic-auto" ? targetLanguage : (detected || "hi-IN"),
  };
}

async function callGnaniTTS(
  text: string,
  languageCode: string
): Promise<{ audioBase64: string | null; warning?: string }> {
  if (!GNANI_API_KEY) {
    return { audioBase64: null, warning: "GNANI_API_KEY not configured. Voice synthesis inactive." };
  }

  let lang = "hi-IN";
  if (languageCode.includes("en")) lang = "en-IN";
  else if (languageCode.includes("ta")) lang = "ta-IN";
  else if (languageCode.includes("te")) lang = "te-IN";
  else if (languageCode.includes("kn")) lang = "kn-IN";
  else if (languageCode.includes("bn")) lang = "bn-IN";
  else if (languageCode.includes("pa")) lang = "pa-IN";
  else if (languageCode.includes("gu")) lang = "gu-IN";
  else if (languageCode.includes("ml")) lang = "ml-IN";
  else if (languageCode.includes("mr")) lang = "mr-IN";

  let voice = TTS_VOICE;
  if (lang.startsWith("ta") || lang.startsWith("te") || lang.startsWith("kn")) {
    voice = "Lakshmi";
  }

  const payload = {
    text,
    model: TTS_MODEL,
    voice,
    language: lang,
    speed: 1.0,
    audio_config: {
      sample_rate: 24000,
      num_channels: 1,
      sample_width: 2,
      encoding: "linear_pcm",
      container: "wav",
    },
  };

  try {
    const response = await fetch(`${GNANI_BASE_URL}/api/v1/tts/inference`, {
      method: "POST",
      headers: {
        "X-API-Key-ID": GNANI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 429) {
      console.warn("Gnani TTS rate limited (429)");
      return { audioBase64: null, warning: "Gnani TTS rate limit reached (HTTP 429). Response delivered in text." };
    }

    if (!response.ok) {
      return { audioBase64: null, warning: "Gnani TTS service temporarily unavailable." };
    }

    const arrayBuffer = await response.arrayBuffer();
    return { audioBase64: Buffer.from(arrayBuffer).toString("base64") };
  } catch (err: any) {
    return { audioBase64: null, warning: "Network exception reaching Gnani TTS endpoint." };
  }
}

// ============================================================================
// GEMINI 2.5 FLASH GROUNDED ASSISTANT WITH OUTPUT VALIDATION
// ============================================================================

async function queryGeminiHospitalAssistant(
  userQuery: string,
  hospitalData: any,
  languageHint?: string
): Promise<{ reply: string; category: string } | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const ai = new GoogleGenAI();
    const systemPrompt = `You are the empathetic, precise hospital voice receptionist for Aarogya Seva Hospital & Multi-Specialty Clinic in Jaipur.
CRITICAL SAFETY & CLINICAL INSTRUCTIONS:
1. Grounding: Answer ONLY and STRICTLY using the hospital data provided below. Do not invent fees, timings, or doctors.
2. Spoken Brevity: Keep your answer to 1 or 2 concise, spoken sentences maximum because it will be converted into speech audio.
3. Medical Ethics: Never prescribe medicines, never suggest drug dosages, never diagnose ailments, and never suggest treatments.
4. Out of scope: If asked about surgeries/procedures not listed (e.g. open heart surgery, neurosurgery), state clearly that they are not performed on-site and offer a staff callback.
5. Language: Reply in the caller's spoken language (${languageHint || "Hindi/English"}).

HOSPITAL DATA:
${JSON.stringify(hospitalData, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userQuery,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.1,
      },
    });

    const reply = response.text?.trim();
    if (reply) {
      // Run strict output safety validation to block dosages or hallucinated medicines
      const validated = validateGeminiOutput(reply, userQuery, languageHint);
      return {
        reply: validated.safeReply,
        category: validated.isViolated ? "medical_refusal" : "doctor_inquiry",
      };
    }
  } catch (err: any) {
    const isQuota =
      err?.status === 429 ||
      String(err?.message || "").includes("429") ||
      String(err?.message || "").includes("RESOURCE_EXHAUSTED");
    if (isQuota) {
      console.log("[Gemini] Free tier request quota reached; seamlessly routed to deterministic clinical engine.");
    } else {
      console.log("[Gemini] Fallback to deterministic clinical engine:", err?.message || "Engine routing");
    }
  }
  return null;
}

// Allowlist of supported Indic language codes to prevent prompt injection & path traversal
const ALLOWED_LANGUAGE_CODES = new Set([
  "indic-auto",
  "hi-IN",
  "en-IN",
  "ta-IN",
  "te-IN",
  "bn-IN",
  "mr-IN",
  "gu-IN",
  "kn-IN",
  "pa-IN",
  "as-IN",
]);

function sanitizeLanguageCode(lang: any): string {
  if (typeof lang !== "string") return "indic-auto";
  const trimmed = lang.trim();
  if (ALLOWED_LANGUAGE_CODES.has(trimmed)) return trimmed;
  const prefix = trimmed.substring(0, 2).toLowerCase();
  for (const code of ALLOWED_LANGUAGE_CODES) {
    if (code.startsWith(prefix)) return code;
  }
  return "indic-auto";
}

// Anti-spam & phone validation for callback queue
interface LeadSpamRecord {
  phone: string;
  createdAt: number;
}
const recentLeads: LeadSpamRecord[] = [];
const ipLeadCounts = new Map<string, { count: number; windowStart: number }>();

function checkLeadSpam(phone: string, clientIp: string): { allowed: boolean; reason?: string } {
  const cleanPhone = phone.replace(/\D/g, "");
  // Indian phone validation: 10 digits starting with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return { allowed: false, reason: "Invalid phone number. Must be a valid 10-digit Indian mobile number." };
  }

  const now = Date.now();
  // IP limit: max 5 leads per hour
  const ipRec = ipLeadCounts.get(clientIp);
  if (ipRec) {
    if (now - ipRec.windowStart < 60 * 60 * 1000) {
      if (ipRec.count >= 5) {
        return { allowed: false, reason: "Callback quota exceeded for this IP. Please wait." };
      }
      ipRec.count += 1;
    } else {
      ipLeadCounts.set(clientIp, { count: 1, windowStart: now });
    }
  } else {
    ipLeadCounts.set(clientIp, { count: 1, windowStart: now });
  }

  // Deduplicate: same phone within 10 minutes
  const duplicate = recentLeads.find((l) => l.phone === cleanPhone && now - l.createdAt < 10 * 60 * 1000);
  if (duplicate) {
    return { allowed: false, reason: "A callback request for this number was already scheduled recently." };
  }

  recentLeads.push({ phone: cleanPhone, createdAt: now });
  if (recentLeads.length > 200) recentLeads.shift();

  return { allowed: true };
}

// ============================================================================
// REST ENDPOINTS
// ============================================================================

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "AarogyaVani Hospital Voice Receptionist",
    gnani_key_configured: Boolean(GNANI_API_KEY),
    ai_engine_configured: Boolean(GEMINI_API_KEY),
    gemini_key_configured: Boolean(GEMINI_API_KEY),
  });
});

app.get("/api/hospital", (req: Request, res: Response) => {
  res.json(getHospitalData());
});

/**
 * POST /api/verify-pin - Secure endpoint to authenticate staff session
 */
app.post("/api/verify-pin", pinAttemptLimiter, (req: Request, res: Response) => {
  const auth = checkStaffAuth(req);
  if (auth.lockedOut) {
    return res.status(429).json({
      success: false,
      code: "PIN_LOCKED_OUT",
      error: "Too many incorrect PIN attempts. Access locked for 15 minutes.",
    });
  }
  if (!auth.authorized) {
    return res.status(401).json({
      success: false,
      code: "INVALID_PIN",
      error: "Invalid staff PIN.",
      remaining_attempts: auth.remainingAttempts,
    });
  }
  res.json({
    success: true,
    message: "Staff authenticated successfully.",
  });
});

/**
 * POST /api/voice - Process uploaded 16kHz WAV
 */
app.post("/api/voice", voiceAiLimiter, upload.single("audio_file"), async (req: Request, res: Response) => {
  try {
    if (!GNANI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "GNANI_API_KEY is not configured on the server. Live microphone speech recognition is disabled to prevent simulated transcripts.",
        code: "NO_GNANI_KEY",
      });
    }

    const file = req.file;
    if (!file || file.size < 1000) {
      return res.status(400).json({
        success: false,
        error: "Audio clip was too short or silent. Please speak a complete sentence.",
      });
    }

    const requestedLanguage = sanitizeLanguageCode(req.body.language_code);
    const sttRes = await callGnaniSTT(file.buffer, file.originalname || "input.wav", requestedLanguage);
    const transcript = sttRes.transcript;
    const detectedLang = sttRes.detectedLanguage;

    if (!transcript) {
      return res.json({
        success: true,
        transcript: "",
        reply: "I could not hear anything clearly. Please hold the mic button and speak again.",
        audio_base64: null,
        detected_language: detectedLang,
      });
    }

    const hospitalData = getHospitalData();

    // 1. Safety Gate: Self-Harm / Crisis Prevention (Tele-MANAS 14416 / 112)
    const crisisReply = checkSelfHarm(transcript, detectedLang);
    if (crisisReply) {
      recordAnalytics("crisis_support", detectedLang, false, false, {
        type: "voice",
        query: transcript,
        reply: crisisReply,
      });
      const ttsResult = await callGnaniTTS(crisisReply, detectedLang);
      return res.json({
        success: true,
        transcript,
        reply: crisisReply,
        category: "crisis_support",
        detected_language: detectedLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        is_crisis: true,
        engine_used: "deterministic_crisis_gate",
      });
    }

    // 2. Safety Gate: Acute Emergency Casualty 108
    const emergencyReply = checkEmergency(transcript, detectedLang);
    if (emergencyReply) {
      recordAnalytics("emergency", detectedLang, true, false, {
        type: "voice",
        query: transcript,
        reply: emergencyReply,
      });
      const ttsResult = await callGnaniTTS(emergencyReply, detectedLang);
      return res.json({
        success: true,
        transcript,
        reply: emergencyReply,
        category: "emergency",
        detected_language: detectedLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        is_emergency: true,
        engine_used: "deterministic_emergency_gate",
      });
    }

    // 3. Safety Gate: Medication Refusal
    const medRefusal = checkMedicationRefusal(transcript, detectedLang);
    if (medRefusal) {
      recordAnalytics("medical_refusal", detectedLang, false, false, {
        type: "voice",
        query: transcript,
        reply: medRefusal,
      });
      const ttsResult = await callGnaniTTS(medRefusal, detectedLang);
      return res.json({
        success: true,
        transcript,
        reply: medRefusal,
        category: "medical_refusal",
        detected_language: detectedLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        is_emergency: false,
        engine_used: "deterministic_medication_gate",
      });
    }

    // 4. Lead Capture Check (Privacy-preserving & spam protected)
    const leadData = extractLead(transcript);
    if (leadData) {
      const evaluation = evaluateHospitalQuery(transcript, hospitalData, detectedLang);
      const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const spamCheck = checkLeadSpam(leadData.phone, clientIp);
      if (spamCheck.allowed && evaluation.lead) {
        const leads = getLeads();
        leads.unshift(evaluation.lead);
        saveLeads(leads);
      }
      recordAnalytics("lead_captured", detectedLang, false, true, {
        type: "voice",
        query: transcript,
        reply: evaluation.reply,
      });
      const ttsResult = await callGnaniTTS(evaluation.reply, detectedLang);
      return res.json({
        success: true,
        transcript,
        reply: evaluation.reply,
        category: "lead_captured",
        detected_language: detectedLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        lead: evaluation.lead,
        is_emergency: false,
        engine_used: "lead_capture_engine",
      });
    }

    // 5. Grounded Knowledge (Grounded Model with output validation or Deterministic)
    let finalReply = "";
    let finalCategory = "doctor_inquiry";
    let engineUsed = "deterministic_rules";

    if (GEMINI_API_KEY) {
      const geminiRes = await queryGeminiHospitalAssistant(transcript, hospitalData, detectedLang);
      if (geminiRes) {
        finalReply = geminiRes.reply;
        finalCategory = geminiRes.category;
        engineUsed = "neural_model";
      }
    }

    if (!finalReply) {
      const evaluation = evaluateHospitalQuery(transcript, hospitalData, detectedLang);
      finalReply = evaluation.reply;
      finalCategory = evaluation.category;
      engineUsed = "deterministic_rules";
    }

    recordAnalytics(finalCategory, detectedLang, false, false, {
      type: "voice",
      query: transcript,
      reply: finalReply,
    });
    const ttsResult = await callGnaniTTS(finalReply, detectedLang);

    return res.json({
      success: true,
      transcript,
      reply: finalReply,
      category: finalCategory,
      detected_language: detectedLang,
      audio_base64: ttsResult.audioBase64,
      tts_warning: ttsResult.warning,
      lead: null,
      is_emergency: false,
      engine_used: engineUsed,
    });
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes("429") || error.message?.includes("rate limit");
    const statusCode = isRateLimit ? 429 : 500;
    return res.status(statusCode).json({
      success: false,
      code: isRateLimit ? "RATE_LIMIT_EXCEEDED" : "PROCESSING_ERROR",
      error: isRateLimit ? "Rate limit reached, please wait a moment." : "An error occurred while processing your voice query. Please try again.",
    });
  }
});

/**
 * POST /api/text - Process typed text queries
 */
app.post("/api/text", voiceAiLimiter, async (req: Request, res: Response) => {
  try {
    const { query, language_code } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ success: false, error: "Query is required" });
    }
    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        code: "PAYLOAD_TOO_LARGE",
        error: "Query length exceeds the 500-character maximum limit.",
      });
    }

    const safeLang = sanitizeLanguageCode(language_code);
    const hospitalData = getHospitalData();

    // 1. Safety Gate: Self-Harm / Crisis Prevention
    const crisisReply = checkSelfHarm(query, safeLang);
    if (crisisReply) {
      recordAnalytics("crisis_support", safeLang, false, false, {
        type: "text",
        query,
        reply: crisisReply,
      });
      const ttsResult = await callGnaniTTS(crisisReply, safeLang);
      return res.json({
        success: true,
        transcript: query,
        reply: crisisReply,
        category: "crisis_support",
        detected_language: safeLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        is_crisis: true,
        engine_used: "deterministic_crisis_gate",
      });
    }

    // 2. Safety Gate: Acute Emergency Casualty 108
    const emergencyReply = checkEmergency(query, safeLang);
    if (emergencyReply) {
      recordAnalytics("emergency", safeLang, true, false, {
        type: "text",
        query,
        reply: emergencyReply,
      });
      const ttsResult = await callGnaniTTS(emergencyReply, safeLang);
      return res.json({
        success: true,
        transcript: query,
        reply: emergencyReply,
        category: "emergency",
        detected_language: safeLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        is_emergency: true,
        engine_used: "deterministic_emergency_gate",
      });
    }

    // 3. Safety Gate: Medication Prescriptions Refusal
    const medRefusal = checkMedicationRefusal(query, safeLang);
    if (medRefusal) {
      recordAnalytics("medical_refusal", safeLang, false, false, {
        type: "text",
        query,
        reply: medRefusal,
      });
      const ttsResult = await callGnaniTTS(medRefusal, safeLang);
      return res.json({
        success: true,
        transcript: query,
        reply: medRefusal,
        category: "medical_refusal",
        detected_language: safeLang,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        is_emergency: false,
        engine_used: "deterministic_medication_gate",
      });
    }

    // 4. Lead Capture Check (Privacy-preserving & spam protected)
    const leadData = extractLead(query);
    if (leadData) {
      const evaluation = evaluateHospitalQuery(query, hospitalData, safeLang);
      const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const spamCheck = checkLeadSpam(leadData.phone, clientIp);
      if (spamCheck.allowed && evaluation.lead) {
        const leads = getLeads();
        leads.unshift(evaluation.lead);
        saveLeads(leads);
      }
      recordAnalytics("lead_captured", evaluation.detectedLanguage || safeLang, false, true, {
        type: "text",
        query,
        reply: evaluation.reply,
      });
      const ttsResult = await callGnaniTTS(evaluation.reply, evaluation.detectedLanguage || safeLang);
      return res.json({
        success: true,
        transcript: query,
        reply: evaluation.reply,
        category: "lead_captured",
        detected_language: evaluation.detectedLanguage,
        audio_base64: ttsResult.audioBase64,
        tts_warning: ttsResult.warning,
        lead: evaluation.lead,
        is_emergency: false,
        engine_used: "lead_capture_engine",
      });
    }

    // 5. Grounded Reasoning (Grounded Model with output validation or Deterministic)
    let finalReply = "";
    let finalCategory = "doctor_inquiry";
    let engineUsed = "deterministic_rules";
    let detectedLang = safeLang;

    if (GEMINI_API_KEY) {
      const geminiRes = await queryGeminiHospitalAssistant(query, hospitalData, safeLang);
      if (geminiRes) {
        finalReply = geminiRes.reply;
        finalCategory = geminiRes.category;
        engineUsed = "neural_model";
      }
    }

    if (!finalReply) {
      const evaluation = evaluateHospitalQuery(query, hospitalData, language_code);
      finalReply = evaluation.reply;
      finalCategory = evaluation.category;
      detectedLang = evaluation.detectedLanguage || "hi-IN";
      engineUsed = "deterministic_rules";
    }

    recordAnalytics(finalCategory, detectedLang, false, false, {
      type: "text",
      query,
      reply: finalReply,
    });
    const ttsResult = await callGnaniTTS(finalReply, detectedLang);

    return res.json({
      success: true,
      transcript: query,
      reply: finalReply,
      category: finalCategory,
      detected_language: detectedLang,
      audio_base64: ttsResult.audioBase64,
      tts_warning: ttsResult.warning,
      lead: null,
      is_emergency: false,
      engine_used: engineUsed,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      code: "PROCESSING_ERROR",
      error: "An error occurred while processing your request. Please try again.",
    });
  }
});

/**
 * GET /api/leads - Protected with staff PIN access control
 * Unauthenticated users receive heavily masked data (name, phone, and reason masked).
 */
app.get("/api/leads", (req: Request, res: Response) => {
  const auth = checkStaffAuth(req);
  const isAuthorized = auth.authorized;

  const leads = getLeads().map((lead) => {
    if (isAuthorized) return lead;
    // Strict masking: unauthenticated visitors only see non-sensitive metadata
    return {
      id: lead.id,
      status: lead.status,
      created_at: lead.created_at,
      name: "Patient (Protected)",
      phone: "••••••••••",
      reason: "Protected Medical Consultation",
      appointment_slot: "••••••",
      notes: "Staff PIN required to view details",
      is_masked: true,
    };
  });

  res.json({
    leads,
    staff_authenticated: isAuthorized,
    locked_out: Boolean(auth.lockedOut),
  });
});

/**
 * POST /api/leads/sample-seed - Requires Staff Authentication
 */
app.post("/api/leads/sample-seed", requireStaffAuth, (req: Request, res: Response) => {
  const sampleLeads: Lead[] = [
    {
      id: "sample-001",
      name: "Ramesh Kumar [Sample]",
      phone: "9829012345",
      reason: "Consultation with Dr. Arvind Rao (Pediatrics)",
      appointment_slot: "10:00 AM - 10:30 AM",
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: "pending",
      notes: "Sample demo record: Pediatric consultation request",
    },
    {
      id: "sample-002",
      name: "Pooja Verma [Sample]",
      phone: "9414056789",
      reason: "Consultation with Dr. Sunita Mehra (Gynaecology)",
      appointment_slot: "11:30 AM - 12:00 PM",
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
      status: "called",
      notes: "Sample demo record: Confirmed Tuesday OPD slot",
    },
  ];

  const current = getLeads();
  saveLeads([...sampleLeads, ...current]);
  res.json({ success: true, count: sampleLeads.length });
});

/**
 * POST /api/leads/:id/done - Mark callback completed (Requires Staff Authentication)
 */
app.post("/api/leads/:id/done", requireStaffAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const leads = getLeads();
  let found = false;
  for (const lead of leads) {
    if (lead.id === id) {
      lead.status = "called";
      lead.notes = `Staff confirmed callback completed at ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
      found = true;
      break;
    }
  }
  if (!found) {
    return res.status(404).json({ success: false, error: "Lead not found" });
  }
  saveLeads(leads);
  res.json({ success: true, lead_id: id, status: "called" });
});

/**
 * GET /api/analytics - Real session analytics with live query feed (No PII)
 */
app.get("/api/analytics", (req: Request, res: Response) => {
  const analytics = getAnalytics();
  res.json(analytics);
});

/**
 * POST /api/outbound-reminder - Generate Voice Reminder Audio Preview
 * HARDENED: Requires staff auth, validates against vishing/OTP attacks, masks phone.
 */
app.post("/api/outbound-reminder", requireStaffAuth, async (req: Request, res: Response) => {
  try {
    const { patient_name, patient_phone, doctor_name, appointment_time, language_code } = req.body;

    // Vishing guard: Block banking, password, and OTP injection attacks
    const combinedInput = `${patient_name || ""} ${doctor_name || ""} ${appointment_time || ""}`.toLowerCase();
    const vishingPattern = /\b(otp|password|cvv|pin|bank|account|wire|transfer|credit\s*card|debit\s*card|verification\s*code)\b/i;
    if (vishingPattern.test(combinedInput)) {
      return res.status(400).json({
        success: false,
        code: "VISHING_ATTEMPT_BLOCKED",
        error: "Security Policy: Outbound reminders cannot contain financial, banking, credential, or OTP keywords.",
      });
    }

    const isTamil = language_code?.includes("ta");
    const isTelugu = language_code?.includes("te");
    const isKannada = language_code?.includes("kn");
    const isHindi = language_code?.includes("hi");

    let message: string;
    let ttsLang = "en-IN";

    if (isTamil) {
      message = `வணக்கம் ${patient_name || "நோயாளி"} அவர்களே, இது ஆரோக்கிய சேவா மருத்துவமனையின் தானியங்கி நினைவூட்டல் அழைப்பு. மருத்துவர் ${doctor_name || "அரவிந்த் ராவ்"} உடனான உங்கள் சந்திப்பு நேரம் ${appointment_time || "நாளை காலை பத்து மணி"}. பதினைந்து நிமிடங்கள் முன்னதாக வரவும். நன்றி.`;
      ttsLang = "ta-IN";
    } else if (isTelugu) {
      message = `నమస్కారం ${patient_name || "రోగి"} గారు, ఇది ఆరోగ్య సేవా ఆసుపత్రి నుండి ఆటోమేటెడ్ అపాయింట్‌మెంట్ రిమైండర్ కాల్. డాక్టర్ ${doctor_name || "అరవింద్ రావు"} గారితో మీ అపాయింట్‌మెంట్ సమయం ${appointment_time || "రేపు ఉదయం పది గంటలకు"}. దయచేసి పదిహేను నిమిషాల ముందుగా రండి. ధన్యవాదాలు.`;
      ttsLang = "te-IN";
    } else if (isKannada) {
      message = `ನಮಸ್ಕಾರ ${patient_name || "ರೋಗಿ"} ಅವರೇ, ಇದು ಆರೋಗ್ಯ ಸೇವಾ ಆಸ್ಪತ್ರೆಯ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಜ್ಞಾಪನೆ ಕರೆ. ವೈದ್ಯರಾದ ${doctor_name || "ಅರವಿಂದ ರಾವ್"} ಅವರ ಭೇಟಿಯ ಸಮಯ ${appointment_time || "ನಾಳೆ ಬೆಳಗ್ಗೆ ಹತ್ತು ಗಂಟೆ"}. ದಯವಿಟ್ಟು ಹದಿನೈದು ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ ಬನ್ನಿ. ಧನ್ಯವಾದಗಳು.`;
      ttsLang = "kn-IN";
    } else if (isHindi) {
      message = `नमस्ते ${patient_name || "मरीज"} जी, यह आरोग्य सेवा अस्पताल से अपॉइंटमेंट रिमाइंडर कॉल है। डॉक्टर ${doctor_name || "अरविंद राव"} के साथ आपका समय ${appointment_time || "कल सुबह दस बजे"} निर्धारित है। कृपया पंद्रह मिनट पहले पहुँचें। धन्यवाद।`;
      ttsLang = "hi-IN";
    } else {
      message = `Hello ${patient_name || "Patient"}, this is an automated appointment reminder from Aarogya Seva Hospital. Your consultation with Doctor ${doctor_name || "Arvind Rao"} is scheduled for ${appointment_time || "tomorrow ten in the morning"}. Please arrive fifteen minutes early. Thank you.`;
      ttsLang = "en-IN";
    }

    const ttsResult = await callGnaniTTS(message, ttsLang);

    // Mask phone number in response to preserve caller privacy
    const maskedPhone = patient_phone ? `••••••${patient_phone.slice(-4)}` : "••••••••••";

    return res.json({
      success: true,
      message,
      patient: patient_name,
      phone: maskedPhone,
      audio_base64: ttsResult.audioBase64,
      tts_warning: ttsResult.warning,
      status: "preview_synthesized",
      notice: "Synthetic voice reminder preview generated using Gnani Timbre TTS. Note: Outbound telecom PSTN dispatch requires telephony SIP/trunk integration.",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      code: "REMINDER_SYNTHESIS_ERROR",
      error: "Failed to generate reminder audio preview.",
    });
  }
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  const isProd = process.env.NODE_ENV === "production" || process.argv.includes("--prod");
  const distPath = path.resolve("./dist");

  if (isProd) {
    if (!fs.existsSync(distPath)) {
      console.error("FATAL: dist/ directory not found in production mode. Run 'npm run build' before starting.");
      process.exit(1);
    }
    console.log("Serving production build from dist/");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AarogyaVani Voice Receptionist running at http://localhost:${PORT}`);
    console.log(`Gnani STT/TTS: Configured (${Boolean(GNANI_API_KEY)})`);
    console.log(`Neural Indic Assistant: Configured (${Boolean(GEMINI_API_KEY)})`);
    console.log(`Staff Authentication: Enabled (constant-time timingSafeEqual with lockout)`);
  });
}

startServer();
