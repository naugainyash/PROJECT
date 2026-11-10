# 02. Speech-to-text: Gnani Prisma

## Pick a model
| | Prisma v2.5 (default) | Prisma v3.0 |
|---|---|---|
| Select | omit `model` | `model=prisma-v3.0` |
| Language | exactly one `language_code` | `indic-auto`, or 1-4 comma-separated codes |
| Detect language | no | yes, returns `detected_language_code` |
| Output styles | verbatim, transcribe | verbatim, transcribe, codemix, transliterate |
| Context hints | `bias_list` + `bias_score` | `keyterms`, `topic`, `previous_text`, `speaker_names` |

Our hospital bot uses v3.0 with `indic-auto` so it can reply in whatever language the caller spoke.

## REST endpoint
`POST https://api.vachana.ai/stt/v3` (multipart/form-data)
Audio: WAV, MP3, OGG, FLAC, AAC, M4A. Max 30 seconds. Converted to 16 kHz mono internally.
Browser note: Chrome records WebM, which is not on the list. Our UI records WAV directly.

### Key fields
| Field | Meaning |
|---|---|
| `audio_file` (required) | the clip |
| `language_code` (required) | e.g. `hi-IN`; `indic-auto` on v3.0 |
| `model` | `prisma-v3.0` or omit |
| `format` | `verbatim` raw words; `transcribe` digits, currency, dates; `codemix` English stays Latin; `transliterate` all Latin letters |
| `keyterms` | v3.0: up to 200 words/phrases to favour, JSON array |
| `topic`, `previous_text`, `speaker_names` | v3.0 context (can lower accuracy; test with and without) |
| `bias_list`, `bias_score` | v2.5 word boosting: up to 100 single letter-only words, score 0.0-2.0, start at 1.0 |
| `enable_substitution`, `substitution_map` | find-and-replace after recognition, max 10 rules |

### Response
```json
{"success": true, "request_id": "...", "transcript": "मेरा खाता नंबर 12345 है",
 "model": "prisma-v3.0", "detected_language_code": "hi-IN",
 "processing_time": 0.62, "end_to_end_latency": 0.71}
```
- Empty transcript is not an error (silence or clips under 0.1 s).
- `truncated: true` appears only if the transcript was cut short: send shorter audio.

## Number and phone handling (ITN)
With `format=transcribe`, spoken numbers become written forms: "पाँच सौ रुपये" gives ₹500, ten spoken digits give a phone number, six digits give a PIN code. Useful for capturing callback numbers.

## Python example
```python
import requests
with open("clip.wav","rb") as f:
    r = requests.post("https://api.vachana.ai/stt/v3",
        headers={"X-API-Key-ID": KEY},
        files={"audio_file": ("clip.wav", f, "audio/wav")},
        data={"model":"prisma-v3.0","language_code":"indic-auto","format":"transcribe"}, timeout=60)
print(r.json()["transcript"])
```

## Tips
- Very short utterances (about 1 s) are least reliable: prompt users to speak a full sentence.
- Identical audio can differ by a borderline word: cache results if you need stable output.
- Realtime streaming expects PCM 16-bit mono at 8 or 16 kHz and returns segments with a `latency` value.
