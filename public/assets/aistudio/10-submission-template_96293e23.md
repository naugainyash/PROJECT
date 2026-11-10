# 10. Submission template

## Project
**Name:** Hospital Enquiry Bot (rename as you like)
**One line:** A multilingual voice receptionist that answers patient questions and captures callbacks for small hospitals and clinics.

## Problem
Patients in local languages struggle to get simple answers (doctor timings, fees, tests). Staff lose time answering the same calls, and callers who don't reach anyone are lost.

## Solution
Callers speak in their own language, the bot answers only from the hospital's data, speaks back in the same language, and gives reception a callback list.

## Gnani models and APIs used
| API | Model | How we use it |
|---|---|---|
| Speech-to-Text REST `/stt/v3` | Prisma v3.0 | Transcribes caller speech, auto-detects language, biased toward doctor names |
| Text-to-Speech REST `/api/v1/tts/inference` | Timbre v3.0 (voice Shivani) | Speaks the answer in the caller's language |
(Add rows for anything else you use: SSE, WebSocket, voice cloning, LiveKit or Pipecat plugin.)

## Other tech
FastAPI, Python, HTML/JS UI, an LLM for answer generation and lead extraction (optional).

## Member contributions
| Member | Contribution |
|---|---|
| Name 1 | Gnani STT/TTS integration, language handling |
| Name 2 | Prompt, hospital data, safety rules, lead capture |
| Name 3 | Frontend: mic recorder, UI, reception panel |
| Name 4 | Testing, demo script, documentation, pitch |

## What is unique
Voice-first for people who cannot type or read well; language auto-detect; rule-based emergency redirect; ready for outbound reminders.

## Impact claims (only what you measured)
- Answered X of 20 test questions correctly
- Languages tested: ...
- Time to first audio: ... seconds

## Context to cite
Gnani reports voice bots helping a US healthcare aggregator with 10K hospitals (30% more leads, 55% better CSAT, 30% lower OpEx). Label it "reported by Gnani".

## Limits and next steps
Prototype data only; no real EHR or booking integration yet; next: SSE/WebSocket streaming, phone integration, appointment booking, outbound reminders.

## Responsible AI
Consent notice; no diagnosis; emergency redirect; minimal data stored; deletion on request; no voice cloning without consent.
