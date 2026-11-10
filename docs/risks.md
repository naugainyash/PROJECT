# Risks, Constraints & Engineering Honesty Checklist

In accordance with strict hackathon engineering standards, here is the transparent breakdown of technical risks, environmental constraints, and verified mitigations.

---

## 1. What Could NOT Be Fully Verified Locally Without Credentials

1. **Live Gnani API Production Calls Without User Key:**
   Live calls to `https://api.vachana.ai/stt/v3` and `https://api.vachana.ai/api/v1/tts/inference` require an active Gnani API key (`GNANI_API_KEY`) provisioned with STT and TTS permissions and available credits.  
   *Honest Mitigation:* In no-key mode, the server cleanly reports `NO_GNANI_KEY` and the frontend pauses the microphone with an honest banner. It never returns canned or faked audio transcripts. Users can test all clinical routing, triage, and booking workflows via the typed enquiry box.

2. **Gnani Hackathon Account Concurrency Limits (HTTP 429):**
   Certain Gnani participant tiers enforce a strict concurrency limit of 1 active concurrent request. If two visitors speak simultaneously, the secondary request may return HTTP 429 (`RATE_LIMITED`).  
   *Mitigation:* Both frontend and backend explicitly handle HTTP 429: the server returns an informative error message and the frontend shows a rate-limit retry notification instead of silently failing.

3. **Background Acoustic Noise Variance in Hackathon Hall:**
   High ambient background noise in a crowded convention hall can degrade STT word error rates.  
   *Mitigation:* We supply Gnani Prisma v3.0 with dynamic `keyterms` extracted from `hospital_data.json` boosting the 6 doctor names and common diagnostic procedures.

4. **Outbound Telephony Dialing:**
   The outbound reminder feature synthesizes 24 kHz WAV audio using Gnani Timbre TTS as a realistic audio preview. Placing actual telephone calls to carrier mobile phones requires connecting a commercial SIP/telephony trunk (e.g. Twilio / Exotel).

---

## 2. Key Technical Risks & Solutions

| Risk | Impact | AarogyaVani Engineering Solution |
|---|---|---|
| **Mispronounced Currency & Numbers in TTS** | "₹500" spoken awkwardly or mispronounced | Spoken number normalization pre-processor converts all monetary and time expressions into natural words ("five hundred rupees" / "पाँच सौ रुपये"). |
| **Emergency Triage Delays from LLM Generation** | A patient with chest pain waiting 3 seconds for LLM output | Bypassed entirely: rule-based regex triggers the 108 Emergency Casualty notification in &lt; 5 ms before any LLM processing. |
| **Medical Prescription Liability** | Bot advising drugs or diagnosing diseases | Hard safety gate: explicitly refuses diagnosis and prescription requests, directing patients to the licensed physician. |
| **Browser WebM Incompatibility** | Chrome default WebM format rejected by Gnani REST STT | Custom client-side `WavRecorder` encodes 16 kHz 16-bit linear PCM mono WAV directly in browser memory. |
| **Patient Phone Number Exposure** | Reception screen open in hospital lobby | Hardened 6-digit staff PIN access control with per-IP rate limiting, 15-minute exponential lockout, global brute-force threshold, and strict logged-out field masking (only ID, status, and timestamp are visible without PIN). |
