# Hackathon Submission Template

## 1. Project Overview
- **Project Name:** AarogyaVani - Hospital Voice Receptionist
- **One-line Pitch:** A multilingual voice receptionist for Indian hospitals and clinics that answers patient inquiries in their native language and captures callback appointments on a live staff dashboard.
- **Target Judging Categories:**
  1. *Most Useful Real-World Problem Solved*
  2. *Most Creative or Unexpected Use of Gnani's Models*

---

## 2. Gnani Models & APIs Used

| API | Endpoint | Model Family | Role in AarogyaVani |
|---|---|---|---|
| **Speech-to-Text REST** | `POST https://api.vachana.ai/stt/v3` | **Prisma v3.0** | Transcribes 16 kHz WAV audio; `indic-auto` detects Hindi/English/Tamil/etc.; `format="transcribe"` normalizes digits and currency; `keyterms` prioritizes doctor & test vocabulary. |
| **Text-to-Speech REST** | `POST https://api.vachana.ai/api/v1/tts/inference` | **Timbre v3.0** | Synthesizes 24 kHz linear PCM WAV voice using voice **Shivani**; matches caller's native language; numbers/fees formatted as spoken words. |
| **Outbound Voice Reminder** | Audio preview synthesis | **Timbre v3.0** | Generates proactive outpatient appointment reminder audio in Hindi, English, and Tamil with individual digit enunciation. |

---

## 3. Team Member Contributions

| Member Name | Role | Specific Contributions |
|---|---|---|
| **Yash Naugain** | Lead Full-Stack & Voice AI | Gnani Prisma STT and Timbre TTS API integrations, client 16 kHz mono WAV recording, Gemini 2.5 Flash hybrid pipeline, and spoken number formatting engine. |
| **Clinical Protocol Lead** | Clinical Safety & Triage | Pre-LLM emergency regex (108 casualty routing), medication prescription refusal rules, hospital_data.json grounding. |
| **Speech & Indic Lead** | Multilingual NLP & Audio | Tamil, Telugu, Hindi and Hinglish intent parsing, spoken number text normalizer for Gnani TTS, dynamic keyterms biasing. |
| **Reception UX Lead** | Staff Dashboard & QA | Reception Desk with Staff PIN privacy control, test matrix verification, voice reminder preview generator. |

---

## 4. Why AarogyaVani Wins

1. **Most Useful Real-World Problem Solved:**
   India has over 1.4 billion people speaking 22 official languages, but the vast majority of hospital receptionists only speak one regional language. In community clinics and polyclinics, telephone lines are constantly jammed with routine enquiries about OPD hours and fasting test rules. AarogyaVani resolves repetitive receptionist phone congestion and allows patients who cannot read or write to enquire in their spoken mother tongue.

2. **Most Creative Use of Gnani's Models:**
   Beyond standard voice Q&A, AarogyaVani utilizes Gnani's `format="transcribe"` to reliably capture and normalize 10-digit phone numbers from conversational speech, feeds them into a live staff callback dashboard, and flips the pipeline into an **Outbound Voice Reminder Agent** that synthesizes proactive appointment reminders with Gnani Timbre.

3. **Responsible AI & Clinical Safety:**
   - Pre-LLM deterministic emergency check (< 5 ms regex benchmark) for chest pain, bleeding, or unconsciousness.
   - Zero medical hallucinations: strictly answers from `hospital_data.json` and refuses prescription advice.
   - Staff PIN authentication protects patient phone numbers on the reception screen.
   - Transparent consent notice displayed on-screen.
