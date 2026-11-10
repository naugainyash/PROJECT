# AarogyaVani - Hospital Voice Receptionist (Gnani AI)

> **A multilingual voice receptionist for Indian hospitals and clinics.**  
> Built for the Gnani AI Voice Hackathon — Target Categories: **"Most Useful Real-World Problem Solved"** & **"Most Creative Use of Gnani Models"**.

---

## 🏥 1. Problem Solved

In Indian tier-2 and tier-3 healthcare facilities, reception desks are inundated with the same recurring telephone questions:
- *"Is the child doctor sitting today and what is the fee?"*
- *"How much does a fasting blood sugar test cost, and do I need to starve?"*
- *"Are OPD doctors available on Sunday?"*

Patients speaking vernacular languages (Hindi, Tamil, Telugu, Kannada, Gujarati, Bengali, Marathi) or Hinglish face language barriers and busy reception lines. AarogyaVani bridges this gap: visitors tap a mic, ask in their native tongue, and receive an immediate spoken voice answer synthesized in the exact same language from verified hospital records.

---

## ⚡ 2. Gnani Models & Speech APIs Used

| API | Endpoint | Model | How AarogyaVani Uses It |
|---|---|---|---|
| **Speech-to-Text REST** | `POST https://api.vachana.ai/stt/v3` | **Prisma v3.0** | Transcribes caller speech, auto-detects language (`indic-auto`), normalizes digits (`format="transcribe"`), and dynamically boosts doctor names via `keyterms` extracted from hospital data. |
| **Text-to-Speech REST** | `POST https://api.vachana.ai/api/v1/tts/inference` | **Timbre v3.0** (voice **Shivani**) | Synthesizes 24 kHz WAV voice replies in the caller's detected language. Numbers/money/times are written as spoken words for natural cadence. |
| **Outbound Voice Audio Preview** | `/api/outbound-reminder` | **Timbre v3.0** | Generates synthetic appointment reminder audio previews with spelled-out contact digits. |

---

## 🛡️ 3. Safety & Clinical Guardrails (3-Layer Hybrid Architecture)

1. **Pre-LLM Emergency Triage Gate (< 5 ms regex benchmark):**
   Rule-based regex catches critical keywords (*"chest pain", "सीने में दर्द", "நெஞ்சு வலி", "bleeding", "खून बह रहा", "unconscious", "बेहोश", "accident"*) and immediately commands the patient to call **108** and proceed to the 24x7 Casualty Ward at Gate 1, eliminating any model latency or hallucination risk.
2. **Zero Medical Hallucination & Prescription Refusal:**
   Refuses to suggest medicines or diagnose symptoms (*"What medicine should I take for fever?"* -> *"I am an AI assistant and cannot prescribe medicines. Please consult Dr. Rajesh Sharma."*).
3. **Grounded Reasoning Layer:**
   When `GEMINI_API_KEY` is configured, Gemini 2.5 Flash handles natural conversational phrasing strictly grounded in `hospital_data.json`. If no LLM key is present, the deterministic clinical rule engine answers 100% offline.
4. **Lead & Callback Capture with Privacy Safeguards:**
   Extracts 10-digit Indian phone numbers and caller names, confirms the digits back to the caller in spoken words, and registers them on the staff **Reception Callback Desk**. Raw voice transcripts are never stored in lead notes.
5. **Staff Access Control:**
   Patient phone numbers on the Reception Desk are masked by default (`98290XXXXX`) until clinic staff authenticates with the configured `STAFF_PIN` via header verification (with brute-force lockout, timing-safe evaluation, and inactivity auto-lock).
6. **Honest Demo Mode:**
   If `GNANI_API_KEY` is not present, speech recognition is cleanly paused with a clear banner instead of returning faked transcripts. Users can test all workflows via typed queries.

---

## 🚀 4. How to Run

### Option A: Full-Stack Interactive Web Applet (Recommended)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Enter your GNANI_API_KEY (and optional GEMINI_API_KEY)

# 3. Start development server
npm run dev
```
Open `http://localhost:3000` in your browser.

### Option B: Standalone Python FastAPI Reference Script
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Open `http://localhost:8000/docs` for the Swagger API documentation.

---

## 🧪 5. How to Test (First 3 Steps)

1. **Doctor Timings in Hindi:**
   Ask in Hindi:
   `"बच्चों के डॉक्टर कब बैठते हैं?"`
   *Expected:* Identifies Hindi (`hi-IN`), states Dr. Arvind Rao sits Mon/Wed/Fri 10 AM to 4 PM, fee ₹500 (पाँच सौ रुपये), and speaks the answer in Hindi via Timbre.
2. **Colloquial Hinglish Phrasing:**
   Ask: `"bacche ko bukhar hai, kaun dekhega?"`
   *Expected:* Correctly maps to pediatrician Dr. Arvind Rao with OPD schedule and consultation fee.
3. **Lead & Callback Capture in English:**
   Say: `"Book me with the gynaecologist, I'm Anita, 9876543210"`
   *Expected:* Bot registers Anita with phone `9876543210`, suggests an available slot (`11:30 AM - 12:00 PM`), and posts Anita to the **Reception Desk** tab with masked digits.
4. **Emergency Casualty Check:**
   Say: `"सीने में बहुत तेज दर्द है"`
   *Expected:* Instant emergency alert instructing the caller to dial 108 and rush to Gate 1 Casualty.
