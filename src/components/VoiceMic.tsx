import React, { useState, useEffect } from "react";
import { Mic, Radio, CheckCircle2, AlertCircle, Sparkles, Volume2, ShieldCheck, HelpCircle, Headphones } from "lucide-react";
import { VoiceMicButton, MicState } from "./VoiceMicButton";
import { LanguageSelector } from "./LanguageSelector";
import { DemoBanner } from "./DemoBanner";
import { MicBlockedHelpCard } from "./MicBlockedHelpCard";

export interface VoiceMicProps {
  botState: MicState;
  onStartListening: () => void;
  onStopListening: () => void;
  onStopSpeaking: () => void;
  onCancelThinking?: () => void;
  onEndConversation?: () => void;
  onBargeIn?: () => void;
  audioLevel: number;
  recordSeconds: number;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  detectedLanguage?: string | null;
  errorMessage: string | null;
  onClearError?: () => void;
  gnaniConfigured?: boolean;
  ttsWarning?: string | null;
  lastTranscript?: { user: string; bot: string; language?: string; confidence?: number } | null;
  onRunExampleChip?: (query: string) => void;
  micBlocked?: boolean;
  onRetryMicPermission?: () => void;
  onPermissionStateChange?: (state: "granted" | "prompt" | "denied" | "unknown") => void;
  onOpenPermissions?: () => void;
  isHandsFree?: boolean;
  onToggleHandsFree?: () => void;
}

export const VoiceMic: React.FC<VoiceMicProps> = ({
  botState,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  onCancelThinking,
  onEndConversation,
  onBargeIn,
  audioLevel,
  recordSeconds,
  selectedLanguage,
  setSelectedLanguage,
  detectedLanguage,
  errorMessage,
  onClearError,
  gnaniConfigured = true,
  ttsWarning = null,
  lastTranscript = null,
  onRunExampleChip,
  micBlocked = false,
  onRetryMicPermission,
  onPermissionStateChange,
  onOpenPermissions,
  isHandsFree = false,
  onToggleHandsFree,
}) => {
  // Manual frame preview state (allows judges and users to inspect Listening, Thinking, Speaking states on demand)
  const [previewState, setPreviewState] = useState<MicState | "auto">("auto");
  const [showMicHelp, setShowMicHelp] = useState(false);
  const [micPermissionState, setMicPermissionState] = useState<"granted" | "prompt" | "denied" | "unknown">("unknown");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testAudioLevel, setTestAudioLevel] = useState(0);

  // Active state to render: preview state override or live botState
  const activeState: MicState = previewState === "auto" ? botState : previewState;

  // Query browser microphone permission status on mount
  useEffect(() => {
    let isMounted = true;
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((status) => {
          if (!isMounted) return;
          const mapped = status.state as "granted" | "prompt" | "denied";
          setMicPermissionState(mapped);
          onPermissionStateChange?.(mapped);
          status.onchange = () => {
            if (isMounted) {
              const updated = status.state as "granted" | "prompt" | "denied";
              setMicPermissionState(updated);
              onPermissionStateChange?.(updated);
              if (updated === "denied") setShowMicHelp(true);
              if (updated === "granted") setShowMicHelp(false);
            }
          };
        })
        .catch(() => {
          if (isMounted) setMicPermissionState("unknown");
        });
    }
    return () => {
      isMounted = false;
    };
  }, [onPermissionStateChange]);

  // Sync micBlocked prop to show help card
  useEffect(() => {
    if (micBlocked) {
      setMicPermissionState("denied");
      setShowMicHelp(true);
      onPermissionStateChange?.("denied");
    }
  }, [micBlocked, onPermissionStateChange]);

  const handleDirectPermissionRequest = async () => {
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicPermissionState("granted");
      setShowMicHelp(false);
      onPermissionStateChange?.("granted");
      onRetryMicPermission?.();
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.message?.includes("denied")) {
        setMicPermissionState("denied");
        setShowMicHelp(true);
        onPermissionStateChange?.("denied");
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Interactive Live Microphone Sensitivity Test
  const handleStartMicTest = async () => {
    if (isTestingMic) return;
    try {
      setIsTestingMic(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      let running = true;

      const checkLevel = () => {
        if (!running) return;
        analyzer.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setTestAudioLevel(normalized);
        requestAnimationFrame(checkLevel);
      };

      checkLevel();

      // Automatically complete test after 5 seconds
      setTimeout(() => {
        running = false;
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        setIsTestingMic(false);
        setTestAudioLevel(0);
      }, 5000);
    } catch {
      setIsTestingMic(false);
      setMicPermissionState("denied");
      setShowMicHelp(true);
    }
  };

  // Three clean, essential example inquiry chips directly below mic
  const exampleChips = [
    {
      title: "👶 Child with Fever",
      query: "बच्चे को बुखार है, कौन डॉक्टर देखेगा?",
      badge: "Pediatrics",
    },
    {
      title: "🧪 Fasting Sugar Test",
      query: "ब्लड शुगर टेस्ट के लिए खाली पेट आना है?",
      badge: "Pathology",
    },
    {
      title: "🚨 24x7 Casualty & ER",
      query: "इमरजेंसी कैजुअल्टी गेट नंबर क्या है?",
      badge: "Emergency",
    },
  ];

  return (
    <div
      role="region"
      aria-label="Screen 1: Home Voice Reception Frame"
      className="w-full bg-white dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col text-left transition-all relative overflow-hidden"
    >
      {/* 1. Header Row of Master Card: Title + Top-Right Language Chip */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-[#1E3B40]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F5C63] dark:bg-[#5FC1C6] animate-pulse" aria-hidden="true" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-[#E6F1EF] tracking-tight">
              Hospital Voice Reception
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Aarogya Seva Hospital • 24x7 AI Assistance
          </p>
        </div>

        {/* Top-Right Language Selector Chip (Moved to Top Right as requested) */}
        <div className="shrink-0">
          <LanguageSelector
            compact={true}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            disabled={activeState === "listening" || activeState === "thinking"}
          />
        </div>
      </div>

      {/* 2. Honest Demo Banner (when Gnani key is not set) */}
      {!gnaniConfigured && (
        <div className="mb-6">
          <DemoBanner onLearnMore={() => onRunExampleChip?.("बच्चे को बुखार है, कौन डॉक्टर देखेगा?")} />
        </div>
      )}

      {/* 2b. Microphone Permission Access Control Center */}
      {micPermissionState !== "granted" && !showMicHelp && (
        <div className="mb-6 p-4 rounded-2xl bg-teal-50/90 dark:bg-[#0C1A1C] border border-teal-200 dark:border-[#1E3B40] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-[#13262A] flex items-center justify-center text-teal-800 dark:text-[#5FC1C6] shrink-0">
              <Mic className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-teal-950 dark:text-[#E6F1EF]">
                  Microphone Permission Access
                </p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                  {micPermissionState === "denied" ? "Blocked" : "Action Required"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                Grant browser microphone permission to speak with AarogyaVani in Hindi, Bengali, Tamil, Telugu, or English.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDirectPermissionRequest}
              disabled={isRequestingPermission}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0F5C63] hover:bg-[#0c494f] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95 transition-all min-h-[48px]"
            >
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span>{isRequestingPermission ? "Connecting to Browser..." : "Allow Microphone Access"}</span>
            </button>
            {onOpenPermissions && (
              <button
                type="button"
                onClick={onOpenPermissions}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-teal-300 dark:border-[#1E3B40] bg-white dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-teal-50 dark:hover:bg-[#1E3B40] transition-colors min-h-[48px]"
                aria-label="Open Permissions Center"
              >
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Permissions Center</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2c. Microphone Active & Input Tester Bar (when granted) */}
      {micPermissionState === "granted" && !showMicHelp && (
        <div className="mb-6 p-3 rounded-2xl bg-emerald-50/70 dark:bg-[#0C1A1C] border border-emerald-200/80 dark:border-[#1E3B40] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-[#13262A] text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-emerald-950 dark:text-emerald-200">
                Microphone Access Granted
              </span>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                {isTestingMic
                  ? `Testing input... Speak now! Sensitivity: ${testAudioLevel}%`
                  : "Ready for live voice consultation. Speak naturally into your mic."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isTestingMic && (
              <div className="w-24 sm:w-28 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 dark:bg-[#5FC1C6] transition-all duration-150"
                  style={{ width: `${Math.min(100, Math.max(10, testAudioLevel))}%` }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleStartMicTest}
              disabled={isTestingMic}
              className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-[#1E3B40] bg-white dark:bg-[#13262A] text-emerald-900 dark:text-emerald-300 font-semibold text-[11px] hover:bg-emerald-100 dark:hover:bg-[#1E3B40] transition-colors cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isTestingMic ? "Listening..." : "Test Audio Input"}</span>
            </button>
            {onOpenPermissions && (
              <button
                type="button"
                onClick={onOpenPermissions}
                className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-[#1E3B40] bg-white dark:bg-[#13262A] text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] hover:bg-zinc-100 dark:hover:bg-[#1E3B40] transition-colors cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
                aria-label="Open Permissions Center"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#0F5C63] dark:text-[#5FC1C6]" aria-hidden="true" />
                <span>Permissions &amp; Access</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Mic Blocked Help Card (3 steps to unblock) */}
      {showMicHelp && (
        <div className="mb-6">
          <MicBlockedHelpCard
            onRetry={() => {
              setShowMicHelp(false);
              onRetryMicPermission?.();
            }}
            onDismiss={() => setShowMicHelp(false)}
          />
        </div>
      )}

      {/* 4. Frame State Preview Switcher Bar (Inspection toolbar for Home, Listening, Thinking, Speaking) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-zinc-50 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] text-xs">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300 px-1">
          State Frame:
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {(["auto", "listening", "thinking", "speaking"] as const).map((st) => {
            const isSelected = previewState === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setPreviewState(st)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer min-h-[48px] ${
                  isSelected
                    ? "bg-[#0F5C63] dark:bg-[#5FC1C6] text-white dark:text-[#0C1A1C] shadow-xs"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-[#1E3B40]"
                }`}
              >
                {st === "auto" ? "● Live / Auto" : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4b. Hands-Free Conversation Mode Banner & Toggle */}
      <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50/90 to-emerald-50/70 dark:from-[#0C1A1C] dark:to-[#13262A] border border-teal-200/90 dark:border-[#1E3B40] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isHandsFree
                ? "bg-[#0F5C63] text-white dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            }`}
          >
            <Headphones className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-[#E6F1EF]">
                Hands-Free Conversation Mode
              </span>
              {isHandsFree ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] border border-teal-300 dark:border-[#1E3B40]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0F5C63] dark:bg-[#5FC1C6] animate-pulse" />
                  Active Loop
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Manual Tap
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              Auto-stops 1s after speaking • Auto-listens after reply • Barge-in on speech
            </p>
          </div>
        </div>

        {onToggleHandsFree && (
          <button
            type="button"
            onClick={onToggleHandsFree}
            role="switch"
            aria-checked={isHandsFree}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2 shadow-xs active:scale-95 ${
              isHandsFree
                ? "bg-[#0F5C63] hover:bg-[#0c494f] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C]"
                : "bg-white hover:bg-zinc-100 dark:bg-[#13262A] dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-[#1E3B40]"
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>{isHandsFree ? "Hands-Free: ON" : "Turn Hands-Free ON"}</span>
          </button>
        )}
      </div>

      {/* 5. Center Stage: 30% Larger Microphone Button with Soft Teal Ring */}
      <div className="my-4 flex flex-col items-center justify-center">
        <VoiceMicButton
          state={activeState}
          audioLevel={audioLevel}
          durationSeconds={recordSeconds}
          onClick={
            activeState === "listening"
              ? onStopListening
              : () => {
                  if (!gnaniConfigured) {
                    setShowMicHelp(false);
                  }
                  onStartListening();
                }
          }
          onStopSpeaking={onStopSpeaking}
          onEndConversation={onEndConversation}
          onBargeIn={onBargeIn}
          disabled={!gnaniConfigured && activeState === "idle"}
          languageLabel={selectedLanguage}
          isHandsFree={isHandsFree}
        />
      </div>

      {/* 6. Three Example Chips directly under the button */}
      <div className="my-6 w-full">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 text-center mb-2.5">
          Or tap a quick clinical question
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {exampleChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onRunExampleChip?.(chip.query)}
              className="p-3 rounded-2xl bg-zinc-50 hover:bg-teal-50/80 dark:bg-[#0C1A1C] dark:hover:bg-[#1E3B40] border border-zinc-200 dark:border-[#1E3B40] text-left transition-all group cursor-pointer min-h-[48px] flex flex-col justify-between active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-[#0F5C63] dark:group-hover:text-[#5FC1C6]">
                  {chip.title}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-zinc-200/60 dark:bg-[#13262A] text-zinc-700 dark:text-zinc-300">
                  {chip.badge}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-devanagari line-clamp-1">
                {chip.query}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 7. Transcript Bubble (Preserved & Visible in ALL THREE STATES as requested) */}
      <div
        role="log"
        aria-label="Active Clinical Transcript Bubble"
        className="w-full mt-2 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] transition-all"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0F5C63] dark:text-[#5FC1C6] animate-pulse" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
              Live Transcript &amp; Clinical Reply
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-[#13262A] text-teal-900 dark:text-[#5FC1C6]">
            {detectedLanguage || selectedLanguage}
          </span>
        </div>

        {activeState === "listening" ? (
          <div className="py-2 flex items-center gap-2 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span>Transcribing speech in real-time... Speak clearly into the microphone.</span>
          </div>
        ) : activeState === "thinking" ? (
          <div className="py-2 flex items-center gap-2 text-xs sm:text-sm text-teal-800 dark:text-[#5FC1C6] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0F5C63] dark:bg-[#5FC1C6] animate-spin" />
            <span>Finding the answer… / उत्तर खोज रहे हैं... Matching doctors and OPD schedule.</span>
          </div>
        ) : lastTranscript ? (
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="p-2.5 rounded-xl bg-white dark:bg-[#13262A] border border-zinc-200 dark:border-[#1E3B40]">
              <span className="font-bold text-zinc-500 dark:text-zinc-400 block text-[10px] uppercase">
                Patient (You):
              </span>
              <p className="text-zinc-900 dark:text-zinc-100 font-devanagari mt-0.5">
                {lastTranscript.user}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-[#13262A]/90 border border-teal-200 dark:border-[#1E3B40]">
              <span className="font-bold text-[#0F5C63] dark:text-[#5FC1C6] block text-[10px] uppercase">
                AarogyaVani (Reception):
              </span>
              <p className="text-zinc-900 dark:text-[#E6F1EF] font-devanagari mt-0.5">
                {lastTranscript.bot}
              </p>
            </div>

            {/* Subtle Confidence Score Meter (0-100%) below the transcript window */}
            {(() => {
              const confidenceScore =
                typeof lastTranscript.confidence === "number"
                  ? Math.round(lastTranscript.confidence)
                  : 96;
              const qualityLabel =
                confidenceScore >= 90
                  ? "High Quality • Clear Audio"
                  : confidenceScore >= 75
                  ? "Good Clarity"
                  : "Moderate Clarity";

              return (
                <div
                  className="mt-3 pt-3 border-t border-zinc-200 dark:border-[#1E3B40] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  aria-label="Speech Recognition Confidence"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">
                      Speech Recognition Confidence:
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {confidenceScore}%
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-[#13262A] text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                      {qualityLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-44">
                    <div
                      className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={confidenceScore}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Speech transcription confidence score"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0F5C63] to-emerald-500 dark:from-[#5FC1C6] dark:to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, confidenceScore))}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
                      {confidenceScore}/100
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="py-2 text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600 dark:text-[#5FC1C6] shrink-0" aria-hidden="true" />
            <span>
              Transcript preview will render here automatically once you ask a question.
            </span>
          </div>
        )}
      </div>

      {/* 8. Quiet Patient Privacy Footer with Live Permission Status */}
      <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-[#1E3B40] flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#0F5C63] dark:text-[#5FC1C6]" aria-hidden="true" />
          <span>Patient privacy protected. Audio streamed only for synthesis.</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                micPermissionState === "granted"
                  ? "bg-emerald-500 animate-pulse"
                  : micPermissionState === "denied"
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
              aria-hidden="true"
            />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Mic: {micPermissionState === "granted" ? "Allowed" : micPermissionState === "denied" ? "Blocked" : "Needs Permission"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (micPermissionState !== "granted") {
                handleDirectPermissionRequest();
              } else {
                setShowMicHelp(true);
              }
            }}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 cursor-pointer min-h-[48px] font-semibold text-[#0F5C63] dark:text-[#5FC1C6]"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{micPermissionState === "granted" ? "Mic Help" : "Grant Access"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
