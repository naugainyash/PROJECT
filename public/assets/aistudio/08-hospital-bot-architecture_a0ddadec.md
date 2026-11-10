# 08. Hospital Enquiry Bot: architecture

## Flow
```
Browser mic (16 kHz WAV) -> POST /api/voice
  -> Gnani Prisma v3.0 STT (indic-auto, keyterms = doctor names)
  -> emergency regex check (fixed 108 reply, no LLM)
  -> LLM answers ONLY from hospital_data.json, returns {reply, lead}
  -> lead saved to leads.json if name + phone present
  -> Gnani Timbre TTS -> base64 WAV -> browser plays it
Reception panel polls GET /api/leads every 5 s.
```

## Files
| File | Role |
|---|---|
| app.py | FastAPI backend: stt(), tts(), llm(), fallback(), respond(), save_lead() |
| index.html | Tap-to-talk UI, typed fallback, reception panel |
| hospital_data.json | The only source of truth the bot may use |
| leads.json | Created at runtime |

## Endpoints
| Route | Purpose |
|---|---|
| POST /api/voice | audio, session, language to transcript, reply, audio |
| POST /api/text | same flow from typed text |
| GET /api/leads | callbacks list |
| POST /api/leads/{id}/done | mark called |

## Design decisions
- REST over WebSocket for the MVP: simpler and reliable.
- `indic-auto` so the reply matches the caller's language.
- Emergency check is rule-based, never left to the LLM.
- The prompt forbids diagnosis and unknown facts; it offers a staff callback.
- LLM is optional: without a key a keyword fallback keeps the demo alive.

## Extension ideas
1. Outbound reminder calls: scheduler plus TTS, same code.
2. SSE TTS for faster first audio.
3. WhatsApp or phone via LiveKit/Pipecat.
4. Appointment slots table with real booking.
5. Analytics: top questions, language split, callback conversion.
6. Multi-hospital templates (clinic, pharmacy, lab) from one config.

## Safety and privacy
No diagnosis; emergency redirect; consent banner; store only name, phone, reason; delete leads on request; never log raw audio.
