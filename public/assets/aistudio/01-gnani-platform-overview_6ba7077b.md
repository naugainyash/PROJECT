# 01. Gnani platform overview

## The three layers
| Layer | What it is | Use it when |
|---|---|---|
| **Speech APIs** (this project) | STT, TTS, voice cloning over REST, streaming, batch | You build your own app and want full control |
| **Agent Builder** | Console to configure voice agents | You want a ready agent without writing the pipeline |
| **Agent Builder Platform API** | REST to manage agents, FAQs, conversations | You automate agent setup from code |

Base URL for the speech APIs: `https://api.vachana.ai`
Auth header on every request: `X-API-Key-ID: <your key>` (key from the Gnani API dashboard, https://app.gnani.ai/voice).

## Model families
| Job | Model | Notes |
|---|---|---|
| Speech to text | **Prisma v2.5** (default), **Prisma v3.0** (`model=prisma-v3.0`) | v3.0 adds language auto-detect and context hints |
| Text to speech | **Timbre v2.5**, **Timbre v3.0** | v3.0 voices speak all 10 languages and support audio tags |
| Voice cloning | `vachana-vc-v1` | Embedding from a 5-30 s sample |

## Languages (10 Indian languages)
Bengali bn-IN, English en-IN, Gujarati gu-IN, Hindi hi-IN, Kannada kn-IN, Malayalam ml-IN, Marathi mr-IN, Punjabi pa-IN, Tamil ta-IN, Telugu te-IN. TTS also accepts `auto` and `hi-en` (Hinglish).

## Ways to call each API
| API | REST | Streaming | Realtime WebSocket | Batch |
|---|---|---|---|---|
| STT | yes (<=30 s) | n/a | yes | yes |
| TTS | yes | SSE | yes | n/a |
| Cloning | yes | SSE | yes | n/a |

## SDK
`pip install gnani-vachana` (Python 3.10+). Clients: `GnaniSTTClient`, `GnaniSTTStreamClient`, `GnaniTTSClient`, `GnaniTTSStreamClient`, `GnaniTTSRealtimeClient`. Our project uses plain `requests`, so the SDK is optional.

## Gnani's enterprise use cases (context for your pitch)
Voice bots for banks, insurers and healthcare aggregators: collections, lapsed-policy revival, lead qualification, CSAT, agent assist, IVR. Figures come from Gnani's own material, so say "reported by Gnani". Enterprise products may not be available in a hackathon, so build on the speech APIs.
