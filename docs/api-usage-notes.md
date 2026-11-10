# Gnani AI Speech API Usage Notes

All requests require the authentication header:
`X-API-Key-ID: <GNANI_API_KEY>`  
Base URL: `https://api.vachana.ai`

---

## 1. Speech-to-Text: Gnani Prisma v3.0

- **Endpoint:** `POST https://api.vachana.ai/stt/v3`
- **Content-Type:** `multipart/form-data`
- **Audio constraints:** Max 30 seconds (AarogyaVani automatically limits clips to 28s). Format: 16 kHz linear PCM WAV.

### Form Fields:
| Field | Value | Purpose |
|---|---|---|
| `audio_file` | Binary WAV blob | The 16 kHz mono audio recording |
| `model` | `prisma-v3.0` | Enables Indic language auto-detection & context hints |
| `language_code` | `indic-auto` | Automatically detects the Indian language spoken |
| `format` | `transcribe` | Converts spoken numbers to digits (critical for phone number extraction) |
| `keyterms` | JSON array of strings | Word-boosting for 6 doctor names, OPD, and test names |

### Response Schema:
```json
{
  "success": true,
  "request_id": "req-98214309",
  "transcript": "बच्चों के डॉक्टर कब बैठते हैं?",
  "model": "prisma-v3.0",
  "detected_language_code": "hi-IN",
  "processing_time": 0.62,
  "end_to_end_latency": 0.71
}
```

---

## 2. Text-to-Speech: Gnani Timbre v3.0

- **Endpoint:** `POST https://api.vachana.ai/api/v1/tts/inference`
- **Content-Type:** `application/json`

### JSON Payload:
```json
{
  "text": "बच्चों के विशेषज्ञ डॉक्टर अरविंद राव हैं। वे सोमवार, बुधवार और शुक्रवार को सुबह दस बजे से शाम चार बजे तक बैठते हैं। परामर्श शुल्क पाँच सौ रुपये है।",
  "model": "timbre-v3.0",
  "voice": "Shivani",
  "language": "hi-IN",
  "speed": 1.0,
  "audio_config": {
    "sample_rate": 24000,
    "num_channels": 1,
    "sample_width": 2,
    "encoding": "linear_pcm",
    "container": "wav"
  }
}
```

### Important Rule for Numbers & Money:
Raw digits (e.g. `₹500` or `10:00 AM`) are mispronounced by neural TTS. AarogyaVani formats all figures as natural spoken language before dispatching to Timbre.

---

## 3. Error Codes & Recovery Strategies

| HTTP Status | Error Type | Cause | AarogyaVani Handling |
|---|---|---|---|
| **401** | `INVALID_API_KEY` | Header missing or expired key | Emits configuration alert; falls back gracefully to interactive simulation. |
| **403** | `SCOPE_NOT_ALLOWED` | Key lacks STT/TTS permissions | Informs user to enable speech scopes on the Gnani console. |
| **429** | `RATE_LIMITED` | Concurrency limit exceeded (1 active req) | Displays friendly notice; UI disables recording until previous query completes. |
| **422** | Bad form parameters | Missing language or audio | Client validates audio size (>1KB) and valid headers before dispatch. |
