/**
 * Barge-In Speech Detector
 * Continuously listens via microphone during assistant audio playback.
 * If the patient begins speaking, it detects speech and invokes onBargeIn,
 * allowing instant cutoff of the assistant audio and seamless transition to recording.
 */

export class BargeInDetector {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private isListening = false;
  private speechFrames = 0;
  private readonly SPEECH_THRESHOLD = 0.05; // Normalized speech threshold above background room noise

  public async start(onBargeIn: () => void): Promise<void> {
    if (this.isListening) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true, // Crucial: echo cancellation prevents the bot's own speaker audio from false triggering
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyzer = this.audioContext.createAnalyser();
      this.analyzer.fftSize = 256;
      source.connect(this.analyzer);

      this.isListening = true;
      this.speechFrames = 0;

      const dataArray = new Uint8Array(this.analyzer.frequencyBinCount);
      const checkVoice = () => {
        if (!this.isListening || !this.analyzer) return;

        this.analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);

        // Require at least 3 consecutive frames (~50ms) of human speech to avoid random noise clicks
        if (normalized >= this.SPEECH_THRESHOLD) {
          this.speechFrames++;
          if (this.speechFrames >= 3) {
            this.stop();
            onBargeIn();
            return;
          }
        } else {
          this.speechFrames = Math.max(0, this.speechFrames - 1);
        }

        this.animFrameId = requestAnimationFrame(checkVoice);
      };

      checkVoice();
    } catch {
      this.stop();
    }
  }

  public stop(): void {
    this.isListening = false;
    this.speechFrames = 0;

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

    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
  }

  public get isActive(): boolean {
    return this.isListening;
  }
}
