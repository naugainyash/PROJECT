# 07. Setup checklist: what we need

## Accounts and keys
- [ ] Gnani API key from the dashboard (https://app.gnani.ai/voice), with STT and TTS scopes and credit
- [ ] Optional LLM key (`ANTHROPIC_API_KEY`) for full conversations and lead capture
- [ ] Confirm with organisers: free credits, rate limits, whether Agent Builder access exists

## Software
- [ ] Python 3.10+
- [ ] `pip install -r requirements.txt` (fastapi, uvicorn, requests, python-multipart)
- [ ] Chrome or Edge, microphone, speakers or headphones
- [ ] Git (one shared repo, key in `.env`, never committed)

## Environment variables
```
GNANI_API_KEY=...
ANTHROPIC_API_KEY=...   # optional
LLM_MODEL=claude-sonnet-5-5   # optional override
TTS_MODEL=timbre-v3.0
TTS_VOICE=Shivani
```

## Data we must prepare
- [ ] `hospital_data.json`: real doctors, timings, fees, tests for one clinic
- [ ] 10 test questions per language (Hindi, English, one more)
- [ ] Consent line shown on screen: "This is an AI assistant. Your voice is processed to answer you."

## First 30 minutes
1. Run one curl for STT and one for TTS to prove the key works.
2. Start the app, ask one question by typing, then one by voice.
3. Fix the voice you like, then freeze it.

## Team roles
| Role | Owns |
|---|---|
| Speech engineer | STT/TTS calls, languages, audio quality |
| AI/backend | prompt, data, lead capture, safety rules |
| Frontend | mic UI, reception panel |
| Pitch/QA | test cases, demo, submission |
