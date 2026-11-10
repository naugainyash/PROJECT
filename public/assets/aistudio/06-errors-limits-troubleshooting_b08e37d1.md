# 06. Errors, limits and troubleshooting

## Limits
| Item | Limit |
|---|---|
| STT REST clip length | 30 seconds |
| STT audio formats | WAV, MP3, OGG, FLAC, AAC, M4A |
| Concurrency | some accounts: 1 active request at a time |
| `keyterms` | up to 200 |
| `bias_list` | 100 single words, letters only |
| `substitution_map` | 10 rules |
| TTS `speed` | 0.85-1.15 |

## Gateway errors (all APIs)
| HTTP | Code | Meaning | Fix |
|---|---|---|---|
| 401 | MISSING_API_KEY / INVALID_API_KEY | header missing or key wrong | check `X-API-Key-ID` |
| 402 | n/a | insufficient credit | top up or ask organisers |
| 403 | SCOPE_NOT_ALLOWED / FORBIDDEN | key lacks this service | enable STT/TTS scope |
| 429 | RATE_LIMITED | too many or concurrent requests | wait, retry with backoff, one request at a time |

## STT errors
| HTTP | Type | Fix |
|---|---|---|
| 422 | `detail` body | `language_code` or `audio_file` missing |
| 400 | INVALID_LANGUAGE_CODE | use exact codes like `hi-IN` (case matters) |
| 400 | MAX_AUDIO_DURATION_EXCEEDED | trim to 30 s |
| 400 | UNSUPPORTED_AUDIO_FORMAT / AUDIO_CONVERSION_ERROR | send WAV |
| 400 | INVALID_CONTEXT | a context field is out of range |
| 500 | TRANSCRIPTION_FAILED / INTERNAL_SERVER_ERROR | retry |
| 504 | UPSTREAM_TIMEOUT | retry with shorter audio |

## TTS errors
400 bad parameters or a voice from the wrong model; 429 rate limit; 500 retry with backoff; 503 temporarily unavailable.

## Common problems in our app
| Symptom | Likely cause | Fix |
|---|---|---|
| "Mic blocked" | not localhost/https, or permission denied | use localhost, allow mic |
| Empty transcript | too quiet or under 1 s | speak a full sentence closer to the mic |
| Wrong voice error 400 | voice from other model | match `TTS_MODEL` and `TTS_VOICE` |
| Numbers sound wrong | digits sent to TTS | write numbers as words |
| No sound | browser autoplay block | tap the page once |
| Reply language mismatch | auto-detect chose another language | pick the language manually |
| 429 | overlapping calls | already serialised by the UI; retry |
