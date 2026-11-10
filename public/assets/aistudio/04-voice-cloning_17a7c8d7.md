# 04. Voice cloning

Two steps.

## Step 1: create a speaker embedding (once per voice)
`POST https://api.vachana.ai/api/v1/tts/voice-clone/embeddings`
Header `X-API-Key-ID`, multipart field `audio_file` with 5-30 seconds of clean speech (WAV or MP3).
Response contains `embedding`, `shape` and `dtype`. Cache it.

## Step 2: synthesize with the embedding
`POST https://api.vachana.ai/api/v1/tts/inference`
```json
{"text": "...", "model": "vachana-vc-v1",
 "audio_config": {"sample_rate": 44100, "encoding": "linear_pcm", "container": "wav"},
 "speaker_embedding": <object from step 1>}
```
SSE streaming (`/api/v1/tts/sse`) and WebSocket variants also exist.

## Quality tips
- One speaker, no music, no echo, steady volume.
- Speak naturally for the full 5-30 seconds.
- Re-record if the clone sounds muffled.

## Consent and safety (non-negotiable)
- Clone only your own voice or a person who clearly agreed.
- Tell listeners it is an AI voice.
- Never impersonate a real person or use it for deception.
- Store embeddings securely and offer deletion.
- Confirm cloning is enabled for your key before depending on it in a demo.
