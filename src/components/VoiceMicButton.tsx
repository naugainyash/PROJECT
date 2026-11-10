import React from "react";
import { Mic, Square, Loader2, Volume2, PhoneOff, MicOff, MessageSquare } from "lucide-react";

export type MicState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceMicButtonProps {
  state: MicState;
  audioLevel?: number; // 0 to 1
  durationSeconds?: number;
  onClick: () => void;
  onStopSpeaking?: () => void;
  onEndConversation?: () => void;
  onBargeIn?: () => void;
  disabled?: boolean;
  languageLabel?: string;
  isHandsFree?: boolean;
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  state,
  audioLevel = 0,
  durationSeconds = 0,
  onClick,
  onStopSpeaking,
  onEndConversation,
  onBargeIn,
  disabled = false,
  languageLabel,
  isHandsFree = false,
}) => {
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";
  const isActiveConversation = isListening || isThinking || isSpeaking;

  // Dynamic scale for audio reactivity
  const scale = isListening ? 1 + Math.min(audioLevel * 0.28, 0.3) : 1;
  const pulseOpacity = isListening ? 0.3 + Math.min(audioLevel * 0.7, 0.6) : 0;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleEndConversation = () => {
    if (onEndConversation) {
      onEndConversation();
    } else if (isSpeaking && onStopSpeaking) {
      onStopSpeaking();
    } else if (isListening) {
      onClick();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center relative select-none w-full max-w-md mx-auto">
      {/* Screen Reader Accessible Live Status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isListening
          ? "Status: Listening to your voice. Audio capturing active. Speak now. Will auto-stop on 1 second of silence."
          : isThinking
          ? "Status: Processing question with hospital directory. Please wait."
          : isSpeaking
          ? "Status: Playing clinical response. Speak or tap Stop to interrupt."
          : "Status: Hospital Voice Reception ready. Tap microphone to speak."}
      </div>

      {/* Outer Ambient Glow / Rings */}
      <div className="relative flex items-center justify-center">
        {/* Animated concentric pulse rings during listening */}
        {isListening && (
          <>
            <div
              className="absolute rounded-full bg-amber-400/25 dark:bg-amber-400/20 animate-ping pointer-events-none"
              style={{
                width: "210px",
                height: "210px",
                animationDuration: "1.8s",
                opacity: pulseOpacity,
              }}
            />
            <div
              className="absolute rounded-full border-2 border-amber-400/50 dark:border-amber-400/40 pointer-events-none transition-transform duration-75"
              style={{
                width: "180px",
                height: "180px",
                transform: `scale(${1 + audioLevel * 0.35})`,
              }}
            />
          </>
        )}

        {/* Soft Teal / Amber / Emerald Ambient Outer Ring */}
        <div
          className={`rounded-full p-3 transition-all duration-300 ${
            isListening
              ? "bg-amber-100/70 dark:bg-amber-950/40 ring-8 ring-amber-400/30 dark:ring-amber-400/20"
              : isThinking
              ? "bg-teal-100/60 dark:bg-[#13262A] ring-8 ring-teal-400/30 dark:ring-[#5FC1C6]/30"
              : isSpeaking
              ? "bg-emerald-100/60 dark:bg-emerald-950/40 ring-8 ring-emerald-400/30 dark:ring-emerald-400/20"
              : "bg-teal-100/50 dark:bg-[#13262A] ring-8 ring-[#0F5C63]/15 dark:ring-[#5FC1C6]/20 hover:ring-[#0F5C63]/25"
          }`}
        >
          {/* Main 144px Button */}
          <button
            type="button"
            onClick={
              isSpeaking
                ? onBargeIn || onStopSpeaking || onClick
                : isListening
                ? onClick
                : onClick
            }
            disabled={disabled && !isSpeaking}
            aria-label={
              isListening
                ? "Stop recording speech"
                : isThinking
                ? "Processing speech, please wait"
                : isSpeaking
                ? "Interrupt assistant and speak (Barge-in)"
                : "Tap to talk to hospital receptionist"
            }
            style={{ transform: `scale(${scale})` }}
            className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-xl cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-500 min-h-[48px] min-w-[48px] active:scale-95 ${
              isListening
                ? "bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400 text-stone-950 shadow-amber-500/40"
                : isThinking
                ? "bg-gradient-to-tr from-teal-700 via-teal-800 to-slate-900 text-teal-100 shadow-teal-900/30"
                : isSpeaking
                ? "bg-gradient-to-tr from-emerald-600 via-teal-700 to-teal-800 text-white shadow-emerald-500/30 ring-2 ring-emerald-400/50"
                : disabled
                ? "bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
                : "bg-gradient-to-tr from-[#0F5C63] via-[#0F5C63] to-[#167882] hover:from-[#0B464B] hover:to-[#0F5C63] dark:from-[#5FC1C6] dark:via-[#4EB3B8] dark:to-[#389BA0] text-white dark:text-[#0C1A1C] shadow-teal-900/25 dark:shadow-[#5FC1C6]/20"
            }`}
          >
            {/* Center Icon / Graphic based on State */}
            {isListening ? (
              <>
                <Mic className="w-12 h-12 animate-pulse text-stone-950" aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase tracking-widest mt-1 text-stone-950">
                  {formatDuration(durationSeconds)}
                </span>
              </>
            ) : isThinking ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-teal-200" aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-teal-200">
                  Thinking
                </span>
              </>
            ) : isSpeaking ? (
              <>
                {/* Waveform Bars */}
                <div className="flex items-center gap-1.5 h-10 mb-1" aria-hidden="true">
                  <span className="w-1.5 bg-white rounded-full animate-bounce h-6" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 bg-white rounded-full animate-bounce h-10" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 bg-white rounded-full animate-bounce h-7" style={{ animationDelay: "300ms" }} />
                  <span className="w-1.5 bg-white rounded-full animate-bounce h-9" style={{ animationDelay: "75ms" }} />
                  <span className="w-1.5 bg-white rounded-full animate-bounce h-5" style={{ animationDelay: "220ms" }} />
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                  <Mic className="w-3.5 h-3.5 animate-pulse" />
                  <span>Interrupt</span>
                </div>
              </>
            ) : (
              <>
                <Mic className="w-12 h-12 transition-transform group-hover:scale-110" aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase tracking-wider mt-1 opacity-90">
                  {isHandsFree ? "Start Hands-Free" : "Tap to Talk"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* State Caption & Clear Status Indicators */}
      <div className="mt-4 text-center w-full">
        {isListening ? (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs font-bold shadow-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>LISTENING • बोलिए, हम सुन रहे हैं</span>
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Auto-stops 1s after speaking, or tap the button when done.
            </p>

            {/* Prominent End Conversation Button */}
            <div className="mt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleEndConversation}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[48px] shadow-xs active:scale-95"
                aria-label="End conversation and stop listening"
              >
                <PhoneOff className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>End conversation</span>
              </button>
            </div>
          </div>
        ) : isThinking ? (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 dark:bg-[#13262A] border border-teal-300 dark:border-[#1E3B40] text-teal-950 dark:text-[#5FC1C6] text-xs font-bold shadow-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600 dark:text-[#5FC1C6]" />
              <span>THINKING • उत्तर खोज रहे हैं...</span>
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Querying OPD hours, doctors &amp; laboratory tests...
            </p>

            {/* Prominent End Conversation Button */}
            <div className="mt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleEndConversation}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-[48px] shadow-xs active:scale-95"
                aria-label="End conversation and cancel thinking"
              >
                <PhoneOff className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>End conversation</span>
              </button>
            </div>
          </div>
        ) : isSpeaking ? (
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 text-xs font-bold shadow-xs">
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
              <span>SPEAKING • उत्तर बोल रहे हैं</span>
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {isHandsFree
                ? "Barge-in active: speak into your mic to interrupt, or tap below."
                : "Tap Interrupt to ask another question immediately."}
            </p>

            {/* Barge-in and End Conversation Action Buttons */}
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onBargeIn || onStopSpeaking}
                className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[48px] shadow-xs active:scale-95"
                aria-label="Interrupt assistant and speak question"
              >
                <Mic className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-pulse" />
                <span>Interrupt &amp; Speak (Barge-in)</span>
              </button>

              <button
                type="button"
                onClick={handleEndConversation}
                className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/70 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[48px] shadow-xs active:scale-95"
                aria-label="End conversation and stop speaking"
              >
                <PhoneOff className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>End conversation</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Equalized Hindi and English label size for readability */}
            <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5 text-sm sm:text-base font-semibold text-zinc-900 dark:text-[#E6F1EF]">
              <span className="font-devanagari text-base sm:text-lg">बोलने के लिए टैप करें</span>
              <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">•</span>
              <span>Tap to Speak</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              Ask about doctors, OPD timings, test prices, or 24x7 emergency casualty.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
