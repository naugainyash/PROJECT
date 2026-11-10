# 05. Realtime, streaming and integrations

## When to use which mode
| Need | Use |
|---|---|
| Short recorded question, simple build | STT REST + TTS REST (our current app) |
| Live conversation that feels like a phone call | STT Realtime (WebSocket) + TTS Realtime (WebSocket) |
| Long recordings, many files | STT Batch |
| Fast first sound on long replies | TTS SSE streaming |

## STT Realtime (WebSocket)
Send raw PCM 16-bit mono at 8 or 16 kHz. You receive segments such as
`{"type":"transcript","text":"...","segment_id":"...","latency":320}`.
SDK: `GnaniSTTStreamClient(language_code="hi-IN", sample_rate=16000)`.

## TTS Realtime (WebSocket)
Stream text in, receive PCM audio chunks. SDK: `GnaniTTSRealtimeClient`.

## Voice-agent frameworks
| Plugin | Use |
|---|---|
| **LiveKit Agents** (`livekit-plugins-gnani` on PyPI) | Real-time voice agents over WebRTC |
| **Pipecat** | Voice pipeline framework with Gnani STT and TTS services |
Both wrap the speech APIs so turn-taking and interruption handling come built in. Follow the setup pages at docs.gnani.ai/livekit and docs.gnani.ai/pipecat.

## Agent Builder and Platform API
- Agent Builder: configure agents in the console.
- Platform API: manage agents, FAQs and conversations over REST.
Check with the organisers whether these are available to participants.

## Official use-case guides (read for ideas)
Podcast transcription (speaker-separated batch), call analytics (batch STT plus an LLM), real-time compliance (live WebSocket monitoring).

## Upgrade path for our hospital bot
1. Now: tap, record, REST STT, LLM, REST TTS.
2. Next: switch TTS to SSE so audio starts sooner.
3. Later: WebSocket STT with LiveKit or Pipecat for hands-free conversation and phone calls.
