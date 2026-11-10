# 03. Text-to-speech: Gnani Timbre

## Models
| Model | `model` value | Voices | Extras |
|---|---|---|---|
| Timbre v3.0 | `timbre-v3.0` | 13, each speaks all 10 languages | audio tags in text, `language`, `speed` |
| Timbre v2.5 | `timbre-v2.5` | 42 voices, each with a preferred language | `language`, `speed` |

A voice only works with its own model. The intro docs recommend v2.5 as the production default while v3.0 adds tags: pick one and test.

v3.0 voices: Avinash, Shivani, Lakshmi, Kalpana, Shubham, Prakash, Devansh, Yashraj, Chetana, Vasudha, Riyaa, Tarika, Harshad.
v2.5 examples: Nalini (Hindi), Kaveri (English), Deepak (Hindi), Poorvi (Hinglish). Full list: Voice Catalog page in the docs.

## REST endpoint
`POST https://api.vachana.ai/api/v1/tts/inference` (JSON, returns audio bytes)

```json
{"text": "नमस्ते, आप कैसे हैं?", "voice": "Shivani", "model": "timbre-v3.0",
 "language": "hi-IN", "speed": 1.0,
 "audio_config": {"sample_rate": 24000, "num_channels": 1, "sample_width": 2,
                  "encoding": "linear_pcm", "container": "wav"}}
```

| Field | Values |
|---|---|
| `language` | `auto`, hi-IN, en-IN, ta-IN, te-IN, kn-IN, ml-IN, mr-IN, pa-IN, bn-IN, gu-IN, `hi-en` (Hinglish) |
| `speed` | 0.85 to 1.15, or "slow", "medium", "fast" |
| `container` | wav, raw, mp3, ogg (Opus), mulaw, alaw |
| `sample_rate` | 8000, 16000, 22050, 24000, 44100, 48000 |
| `bitrate` | mp3 only: 32k to 192k |
| telephony | `mulaw` or `alaw` forces 8000 Hz |

## Audio tags (v3.0 only)
Put tags inline in the text: `<pauses>`, `<whispers>`, `<laugh>`, `<sigh>`, `<slow>`, `<excited>`, `<clears throat>` and others. On v2.5 tags are stripped, and text made only of tags is rejected (400).

## Input formatting: the number rule
Raw digits are mispronounced. Convert before sending:
- "₹500" to "five hundred rupees"
- "9 AM" to "nine in the morning"
- phone numbers and IDs: follow the Input Formatting Guide in the docs
Our system prompt already tells the LLM to write numbers as words.

## Streaming
- SSE: `/api/v1/tts/sse`, audio arrives as base64 chunks in `data:` lines.
- WebSocket (realtime): lowest latency, stream text in and receive PCM chunks.
Use streaming for long replies or live calls; REST is fine for short answers.
