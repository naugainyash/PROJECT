# AarogyaVani: System Architecture & Data Pipeline

## 1. High-Level Flow Diagram

```
+-----------------------------------------------------------------------------------+
|                                Browser Frontend                                   |
|  - Web Audio 16 kHz Mono PCM WAV Recorder                                         |
|  - Live Audio Level Meter & 28-second Auto-Stop Timer                             |
|  - Multi-tab UI: Voice Bot, Reception Desk, Analytics, Hospital Directory, Docs |
+-----------------------------------------------------------------------------------+
                                         │
                   POST /api/voice (multipart/form-data)
                                         ▼
+-----------------------------------------------------------------------------------+
|                             Gnani Prisma v3.0 STT                                 |
|  Endpoint: POST https://api.vachana.ai/stt/v3                                     |
|  Headers: X-API-Key-ID: <GNANI_API_KEY>                                           |
|  Params: model="prisma-v3.0", language_code="indic-auto", format="transcribe"    |
|  Keyterms: ["Dr. Arvind Rao", "Dr. Sunita Mehra", "Blood Sugar", "OPD", "108"]     |
|  Output: transcript, detected_language_code ("hi-IN", "en-IN", "ta-IN", etc.)     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                     Safety & Triage Evaluation Pipeline                           |
|                                                                                   |
|  [GATE 1] Rule-Based Emergency Regex (< 5 ms measured benchmark)                    |
|    - Matches: chest pain, सीने में दर्द, bleeding, बेहोश, accident, head injury   |
|    - Triggered? -> Returns fixed Emergency 108 Casualty notice (Zero LLM delay)   |
|                                                                                   |
|  [GATE 2] Clinical Prescription & Diagnosis Safety Refusal                        |
|    - Matches: "what medicine for fever", "दवा बताओ", "which tablet"               |
|    - Triggered? -> Refuses clinical advice, recommends consulting Dr. Sharma      |
|                                                                                   |
|  [GATE 3] Lead & Appointment Slot Extraction Engine (Privacy-Safe)                |
|    - Matches: 10-digit Indian phone (regex: [6-9]\d{9}) + patient name + slot     |
|    - Action: Saves to leads.json & spells out digits (no raw transcripts stored)  |
|                                                                                   |
|  [GATE 4] Hybrid Clinical Knowledge: Gemini 2.5 Flash + Grounded Rules Base      |
|    - When GEMINI_API_KEY present: Grounded conversational reasoning               |
|    - Fallback: 100% deterministic rules (Hindi, English, Tamil, Telugu)           |
|    - Out of scope surgery (e.g. bypass) -> Clarifies not done, offers callback    |
|    - Unknown -> Transparently admits missing data & requests caller contact       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                             Gnani Timbre v3.0 TTS                                 |
|  Endpoint: POST https://api.vachana.ai/api/v1/tts/inference                       |
|  Payload:                                                                         |
|    - text: Spoken-word formatted reply (e.g. "five hundred rupees", spoken digits) |
|    - model: "timbre-v3.0", voice: "Shivani", speed: 1.0, language: detected_lang  |
|    - audio_config: 24 kHz linear_pcm mono WAV container                           |
|  Output: 24 kHz WAV audio bytes                                                   |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                              Response Delivery                                    |
|  - JSON payload: { transcript, reply, audio_base64, lead, category }             |
|  - Web Audio player synthesizes speech in caller's ear                            |
|  - Real-time Receptionist Desk auto-updates callback card                         |
|  - Analytics panel records demographic and triage counters                        |
+-----------------------------------------------------------------------------------+
```

## 2. Key Architectural Decisions

1. **REST over WebSocket for the Core MVP:**
   REST provides deterministic, stateless processing with zero persistent socket reconnection overhead on mobile networks.
2. **Pre-LLM Emergency Gate:**
   Emergency triage never relies on an LLM. Rule-based regex runs in less than 15 milliseconds, guaranteeing that a visitor in cardiac distress receives the 108 emergency instruction immediately.
3. **Spoken Number Conversion:**
   Gnani Timbre mispronounces raw currency symbols and strings of digits. AarogyaVani transforms `₹500` into `"five hundred rupees"` / `"पाँच सौ रुपये"` and mobile numbers into individual words (`"nine eight seven..."`), ensuring crystal-clear pronunciation for rural callers.
