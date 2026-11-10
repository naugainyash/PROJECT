/**
 * Accessible Audio Earcon Synthesizer
 * Provides subtle, non-intrusive auditory cues (earcons) using Web Audio API.
 * 
 * Works 100% offline with zero external audio assets, zero latency,
 * and calibrated low-gain envelopes to prevent harsh clicks or startling users.
 */

let sharedAudioContext: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === "suspended") {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (err) {
    return null;
  }
}

export type EarconType =
  | "listenStart"     // When user taps mic / recording starts
  | "listenStop"      // When recording stops and processing begins
  | "completed"       // When query reply / STT analysis is ready
  | "actionSuccess"   // When a button action (lead marked called, reminder sent) completes
  | "alertNotice";    // Emergency triage alert cue

/**
 * Toggle earcon sounds on/off
 */
export function setEarconSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export function isEarconSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * Play a non-intrusive synthesized earcon cue
 */
export function playEarcon(type: EarconType, volume = 0.08) {
  if (!soundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    switch (type) {
      case "listenStart": {
        // Subtle upward chirp: 480 Hz -> 680 Hz
        // Indicates mic has opened and is actively capturing speech
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";

        // Tone 1: 480 Hz for 0.06s
        osc1.frequency.setValueAtTime(480, now);
        osc1.frequency.exponentialRampToValueAtTime(540, now + 0.05);

        // Tone 2: 680 Hz for 0.08s
        osc2.frequency.setValueAtTime(680, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(760, now + 0.12);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.02);
        gain.gain.setValueAtTime(volume * 0.9, now + 0.05);
        gain.gain.linearRampToValueAtTime(volume * 1.1, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.06);

        osc2.start(now + 0.05);
        osc2.stop(now + 0.16);
        break;
      }

      case "listenStop": {
        // Soft descending tone: 560 Hz -> 420 Hz
        // Indicates mic closed and request is in transit
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.10);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      case "completed": {
        // Gentle warm major triad arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
        // Indicates operation / reply completed successfully
        const notes = [523.25, 659.25, 783.99];
        const stepDuration = 0.055;

        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * stepDuration);

          const startTime = now + idx * stepDuration;
          const endTime = startTime + 0.14;

          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.linearRampToValueAtTime(volume * 0.75, startTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(endTime);
        });
        break;
      }

      case "actionSuccess": {
        // Crisp single bell ping: G5 (784Hz) with gentle sustain
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(784, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.85, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.23);
        break;
      }

      case "alertNotice": {
        // Two-tone warning earcon for emergency triage: 660 Hz -> 520 Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(520, now + 0.08);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.21);
        break;
      }
    }
  } catch (err) {
    // Fail silently without interrupting UI
  }
}
