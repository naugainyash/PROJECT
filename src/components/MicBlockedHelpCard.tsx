import React from "react";
import { MicOff, Lock, CheckCircle2, RotateCw, X } from "lucide-react";

interface MicBlockedHelpCardProps {
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const MicBlockedHelpCard: React.FC<MicBlockedHelpCardProps> = ({
  onRetry,
  onDismiss,
}) => {
  return (
    <div
      role="region"
      aria-labelledby="mic-blocked-title"
      className="w-full bg-rose-50 dark:bg-[#13262A] border border-rose-200 dark:border-rose-900/60 rounded-3xl p-5 sm:p-6 text-zinc-900 dark:text-[#E6F1EF] shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
            <MicOff className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="mic-blocked-title"
              className="text-base font-bold text-rose-950 dark:text-rose-200 tracking-tight"
            >
              Microphone Access Blocked
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
              Browser permission is needed for voice reception. Follow these 3 steps to unblock:
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white p-2 rounded-xl transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center"
            aria-label="Dismiss microphone help card"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 3 Step Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        <div className="bg-white dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <Lock className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step 1: Address Bar</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Click the <strong>Lock / Settings icon (🔒)</strong> on the left side of your browser address bar.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step 2: Set to Allow</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Find <strong>Microphone</strong> in the permissions menu and toggle it to <strong>&quot;Allow&quot;</strong>.
          </p>
        </div>

        <div className="bg-white dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] rounded-2xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <RotateCw className="w-4 h-4 text-teal-700 dark:text-teal-400" aria-hidden="true" />
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Step 3: Try Again</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Tap the button below or reload this webpage to activate the microphone.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              stream.getTracks().forEach((t) => t.stop());
              onRetry?.();
            } catch {
              onRetry?.();
            }
          }}
          className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer min-h-[48px] shadow-sm"
        >
          <RotateCw className="w-4 h-4" aria-hidden="true" />
          <span>Prompt / Test Microphone Permission</span>
        </button>

        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          Or click the 🔒 icon in your browser address bar &rarr; Permissions &rarr; Microphone &rarr; Allow.
        </span>
      </div>
    </div>
  );
};
