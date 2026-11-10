import React, { useState } from "react";
import {
  Mic,
  ShieldCheck,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCw,
  PhoneCall,
  KeyRound,
  Sparkles,
  Info
} from "lucide-react";
import { playEarcon } from "../utils/earcon";

export interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Microphone permission
  micPermissionState: "granted" | "prompt" | "denied" | "unknown";
  onRequestMicPermission: () => Promise<void>;
  // Staff PIN permission
  isStaffAuthenticated: boolean;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onLockStaff: () => void;
  // Audio playback permission
  soundEnabled: boolean;
  onToggleSound: () => void;
  // Open emergency frame
  onOpenEmergency: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  micPermissionState,
  onRequestMicPermission,
  isStaffAuthenticated,
  onVerifyPin,
  onLockStaff,
  soundEnabled,
  onToggleSound,
  onOpenEmergency,
}) => {
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testAudioLevel, setTestAudioLevel] = useState(0);

  if (!isOpen) return null;

  const handleMicTest = async () => {
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

      setTimeout(() => {
        running = false;
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        setIsTestingMic(false);
        setTestAudioLevel(0);
      }, 4000);
    } catch {
      setIsTestingMic(false);
      setTestAudioLevel(0);
    }
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) return;
    setIsVerifyingPin(true);
    setPinError(null);
    try {
      const ok = await onVerifyPin(pinInput.trim());
      if (ok) {
        setPinInput("");
        playEarcon("actionSuccess");
      } else {
        setPinError("Invalid staff PIN or lockout active. Maximum 5 attempts allowed.");
        playEarcon("alertNotice");
      }
    } catch {
      setPinError("Verification error. Please retry.");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="permissions-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto relative text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-[#1E3B40]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-[#0C1A1C] border border-teal-200 dark:border-[#1E3B40] flex items-center justify-center text-[#0F5C63] dark:text-[#5FC1C6]">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="permissions-modal-title"
                className="text-lg font-bold text-zinc-900 dark:text-[#E6F1EF] tracking-tight"
              >
                Access &amp; Permissions Center
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Hospital Security, Audio Capture &amp; Clinical Data Access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#1E3B40] transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Close permissions modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* 1. Microphone Hardware Permission */}
        <div className="mt-6 p-4 rounded-2xl bg-zinc-50 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  micPermissionState === "granted"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                    : micPermissionState === "denied"
                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                }`}
              >
                <Mic className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E6F1EF]">
                    Microphone Audio Permission
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      micPermissionState === "granted"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                        : micPermissionState === "denied"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                    }`}
                  >
                    {micPermissionState === "granted"
                      ? "Granted & Active"
                      : micPermissionState === "denied"
                      ? "Access Blocked"
                      : "Permission Required"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Allows speaking to AarogyaVani receptionist in Hindi, English, Bengali, Tamil &amp; Telugu.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {micPermissionState !== "granted" ? (
                <button
                  type="button"
                  onClick={onRequestMicPermission}
                  className="px-4 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#0B464B] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-semibold text-xs transition-all shadow-xs cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Grant Mic Access</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMicTest}
                  disabled={isTestingMic}
                  className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-white dark:bg-[#13262A] text-emerald-800 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer min-h-[48px] flex items-center justify-center gap-1.5"
                >
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{isTestingMic ? `Testing (${testAudioLevel}%)` : "Test Sensitivity"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Sensitivity Meter */}
          {isTestingMic && (
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-[#1E3B40]">
              <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 mb-1">
                <span>Real-time Audio Input Level</span>
                <span className="font-mono font-bold text-emerald-600">{testAudioLevel}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 dark:bg-[#5FC1C6] transition-all duration-100"
                  style={{ width: `${Math.max(5, testAudioLevel)}%` }}
                />
              </div>
            </div>
          )}

          {micPermissionState === "denied" && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>How to Unblock in Browser:</span>
              </p>
              <ol className="list-decimal list-inside mt-1 space-y-0.5 text-[11px]">
                <li>Click the <strong>Lock (🔒)</strong> or site controls icon in your browser address bar.</li>
                <li>Toggle <strong>Microphone</strong> permission from Blocked to <strong>Allow</strong>.</li>
                <li>Click &quot;Grant Mic Access&quot; above or refresh this page.</li>
              </ol>
            </div>
          )}
        </div>

        {/* 2. Staff Authentication & Clinical Records Permission */}
        <div className="mt-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isStaffAuthenticated
                    ? "bg-teal-100 dark:bg-teal-950/60 text-[#0F5C63] dark:text-[#5FC1C6]"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {isStaffAuthenticated ? (
                  <Unlock className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Lock className="w-4 h-4" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E6F1EF]">
                    Hospital Staff Role &amp; Clinical Data Permission
                  </h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isStaffAuthenticated
                        ? "bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-[#5FC1C6]"
                        : "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {isStaffAuthenticated ? "Staff Privileges Unlocked" : "Restricted / Masked"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Protects patient privacy. Unlocks unmasked patient phone numbers, callback actions, and analytics.
                </p>
              </div>
            </div>

            {isStaffAuthenticated && (
              <button
                type="button"
                onClick={onLockStaff}
                className="px-3.5 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors cursor-pointer min-h-[48px]"
              >
                Lock Session
              </button>
            )}
          </div>

          {!isStaffAuthenticated && (
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-[#1E3B40]">
              <form onSubmit={handlePinSubmit} className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter 6-digit Staff PIN"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError(null);
                    }}
                    className="bg-white dark:bg-[#13262A] border border-zinc-300 dark:border-[#1E3B40] rounded-xl pl-3 pr-8 py-2 text-xs sm:text-sm font-mono w-48 text-zinc-900 dark:text-[#E6F1EF] focus:outline-teal-600 min-h-[48px]"
                    aria-label="Staff PIN"
                  />
                  <KeyRound className="w-4 h-4 text-zinc-400 absolute right-2.5 top-3.5 pointer-events-none" />
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingPin || !pinInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#0B464B] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-semibold text-xs transition-all shadow-xs cursor-pointer min-h-[48px] disabled:opacity-50"
                >
                  {isVerifyingPin ? "Verifying..." : "Unlock Access"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-[#1E3B40] text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-[#1E3B40] transition-colors cursor-pointer min-h-[48px]"
                >
                  🔢 Touch Keypad
                </button>
              </form>

              {pinError && (
                <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{pinError}</span>
                </p>
              )}

              {/* On-screen Keypad */}
              {showKeypad && (
                <div className="mt-3 p-3 rounded-2xl bg-white dark:bg-[#13262A] border border-zinc-200 dark:border-[#1E3B40] max-w-xs mx-auto animate-in zoom-in-95">
                  <div className="grid grid-cols-3 gap-2">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setPinInput((prev) => (prev.length < 8 ? prev + d : prev))}
                        className="h-12 rounded-xl bg-zinc-50 dark:bg-[#0C1A1C] hover:bg-teal-50 dark:hover:bg-[#1E3B40] border border-zinc-200 dark:border-[#1E3B40] font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 active:scale-95 transition-all min-h-[48px] flex items-center justify-center cursor-pointer"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPinInput("")}
                      className="h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold active:scale-95 transition-all min-h-[48px] flex items-center justify-center cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinInput((prev) => (prev.length < 8 ? prev + "0" : prev))}
                      className="h-12 rounded-xl bg-zinc-50 dark:bg-[#0C1A1C] hover:bg-teal-50 dark:hover:bg-[#1E3B40] border border-zinc-200 dark:border-[#1E3B40] font-mono text-base font-bold text-zinc-900 dark:text-zinc-100 active:scale-95 transition-all min-h-[48px] flex items-center justify-center cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setPinInput((prev) => prev.slice(0, -1))}
                      className="h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 text-zinc-800 dark:text-zinc-200 text-sm font-bold active:scale-95 transition-all min-h-[48px] flex items-center justify-center cursor-pointer"
                      aria-label="Backspace"
                    >
                      ⌫
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Audio & Earcon Playback Permission */}
        <div className="mt-4 p-4 rounded-2xl bg-zinc-50 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-[#13262A] text-[#0F5C63] dark:text-[#5FC1C6] flex items-center justify-center shrink-0">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4 text-zinc-400" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-[#E6F1EF]">
                  Sound Earcons &amp; Audio Feedback
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-[#5FC1C6]">
                  {soundEnabled ? "Enabled" : "Muted"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Play subtle auditory chimes on recording start, completion, and urgent alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => playEarcon("actionSuccess")}
              className="px-3 py-2 rounded-xl border border-zinc-300 dark:border-[#1E3B40] text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-[#1E3B40] transition-colors cursor-pointer min-h-[48px]"
            >
              Test Chime
            </button>
            <button
              type="button"
              onClick={onToggleSound}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[48px] ${
                soundEnabled
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                  : "bg-[#0F5C63] text-white dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
              }`}
            >
              {soundEnabled ? "Mute Earcons" : "Enable Sound"}
            </button>
          </div>
        </div>

        {/* 4. Emergency 108 Casualty Access */}
        <div className="mt-4 p-4 rounded-2xl bg-red-50/80 dark:bg-[#1A0B0E] border border-red-200 dark:border-red-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4 animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-950 dark:text-red-200">
                  108 Emergency Casualty Hotline (Always Unrestricted)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                  24x7 Direct Gate 1
                </span>
              </div>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">
                Critical trauma, poison, cyanosis, and cardiac emergencies bypass all queues.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEmergency();
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer min-h-[48px] shrink-0"
          >
            Open 108 Frame
          </button>
        </div>

        {/* Footer info note */}
        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-[#1E3B40] flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-teal-600 dark:text-[#5FC1C6] shrink-0" aria-hidden="true" />
            <span>All permissions adhere to hospital privacy regulations and DISHA compliance.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#0B464B] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-bold text-xs cursor-pointer min-h-[48px]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
