/**
 * 16 kHz Mono WAV Audio Recorder for Gnani Prisma STT
 * Chrome WebM is not accepted by Gnani STT REST. This records clean 16-bit 16kHz mono WAV in browser.
 * Includes Voice Activity Detection (VAD) / Silence Auto-Stop when user pauses after speaking.
 */

export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private pcmBuffers: Float32Array[] = [];
  private recordingLength = 0;
  private isRecording = false;
  private isStarting = false;
  private stopRequested = false;
  private autoStopTimeout: any = null;
  private analyzer: AnalyserNode | null = null;
  private onLevelCallback: ((level: number) => void) | null = null;
  private animFrameId: number | null = null;

  // Voice Activity Detection (VAD)
  private hasSpoken = false;
  private speechFrames = 0;
  private silenceStart: number | null = null;
  private onSilenceCallback: (() => void) | null = null;
  private readonly SPEECH_THRESHOLD = 0.035; // normalized level threshold for human voice
  private silenceDurationMs = 1000; // Default 1.0 second pause after speaking triggers auto-stop

  public async start(
    onLevel?: (level: number) => void,
    onAutoStop?: () => void,
    onSilence?: () => void,
    customSilenceMs?: number
  ): Promise<void> {
    if (this.isRecording) return;
    this.isStarting = true;
    this.stopRequested = false;
    this.pcmBuffers = [];
    this.recordingLength = 0;
    this.hasSpoken = false;
    this.speechFrames = 0;
    this.silenceStart = null;
    this.silenceDurationMs = customSilenceMs || 1000;
    this.onLevelCallback = onLevel || null;
    this.onSilenceCallback = onSilence || onAutoStop || null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (this.stopRequested) {
        this.cleanupMedia();
        this.isStarting = false;
        return;
      }

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 256;
      this.source.connect(this.analyzer);

      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const input = e.inputBuffer.getChannelData(0);
        this.pcmBuffers.push(new Float32Array(input));
        this.recordingLength += input.length;
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.isRecording = true;
      this.isStarting = false;

      // Start volume meter and VAD silence detection
      if (this.analyzer) {
        const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
        const updateMeter = () => {
          if (!this.isRecording || !this.analyzer) return;
          this.analyzer.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(1, avg / 128);
          this.onLevelCallback?.(normalized);

          // VAD silence checking
          const now = Date.now();
          if (normalized >= this.SPEECH_THRESHOLD) {
            this.speechFrames++;
            if (this.speechFrames >= 2) {
              this.hasSpoken = true;
            }
            this.silenceStart = null;
          } else {
            // Below threshold
            if (this.silenceStart === null) {
              this.silenceStart = now;
            } else {
              const silentMs = now - this.silenceStart;
              // If user spoke and then paused for >= silenceDurationMs (~1 second)
              if (this.hasSpoken && silentMs >= this.silenceDurationMs) {
                if (this.onSilenceCallback) {
                  const cb = this.onSilenceCallback;
                  this.onSilenceCallback = null;
                  cb();
                  return;
                }
              }
            }
          }

          this.animFrameId = requestAnimationFrame(updateMeter);
        };
        updateMeter();
      }

      // Hard auto-stop limit at 28 seconds (Gnani REST limit is 30s)
      this.autoStopTimeout = setTimeout(() => {
        if (this.isRecording && onAutoStop) {
          onAutoStop();
        }
      }, 28000);
    } catch (err: any) {
      this.isStarting = false;
      this.cleanupMedia();
      throw new Error(`Microphone access denied: ${err.message || "Permission not granted"}`);
    }
  }

  public async stop(): Promise<Blob> {
    if (this.isStarting) {
      this.stopRequested = true;
      this.isStarting = false;
    }

    this.isRecording = false;

    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.source && this.processor) {
      try {
        this.source.disconnect();
        this.processor.disconnect();
      } catch {}
    }

    this.cleanupMedia();

    // Flatten buffers
    const merged = new Float32Array(this.recordingLength);
    let offset = 0;
    for (const buf of this.pcmBuffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    // Downsample / resample to exactly 16000 Hz if audioContext sampleRate was different
    const targetSampleRate = 16000;
    const currentSampleRate = this.audioContext?.sampleRate || 16000;
    const resampled = this.resample(merged, currentSampleRate, targetSampleRate);

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    return this.encodeWAV(resampled, targetSampleRate);
  }

  public abort(): void {
    this.stopRequested = true;
    this.isRecording = false;
    this.isStarting = false;
    this.cleanupMedia();
  }

  private cleanupMedia(): void {
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.mediaStream = null;
    }
  }

  private resample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return buffer;
    const ratio = fromRate / toRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const indexFloor = Math.floor(srcIndex);
      const indexCeil = Math.min(buffer.length - 1, Math.ceil(srcIndex));
      const t = srcIndex - indexFloor;
      result[i] = (1 - t) * buffer[indexFloor] + t * buffer[indexCeil];
    }
    return result;
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = samples.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF identifier
    this.writeString(view, 0, "RIFF");
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    this.writeString(view, 8, "WAVE");
    // format chunk identifier
    this.writeString(view, 12, "fmt ");
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate
    view.setUint32(28, byteRate, true);
    // block align
    view.setUint16(32, blockAlign, true);
    // bits per sample
    view.setUint16(34, 16, true);
    // data chunk identifier
    this.writeString(view, 36, "data");
    // data chunk length
    view.setUint32(40, dataSize, true);

    // Write 16-bit signed PCM samples
    let index = 44;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(index, s, true);
      index += 2;
    }

    return new Blob([view], { type: "audio/wav" });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
