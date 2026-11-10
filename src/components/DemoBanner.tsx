import React from "react";
import { AlertCircle, KeyRound, ExternalLink } from "lucide-react";

interface DemoBannerProps {
  onLearnMore?: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onLearnMore }) => {
  return (
    <div
      role="alert"
      className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-3 sm:p-4 text-amber-900 dark:text-amber-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm font-medium transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-200/70 dark:bg-amber-900/60 flex items-center justify-center shrink-0 text-amber-800 dark:text-amber-300">
          <KeyRound className="w-4 h-4" aria-hidden="true" />
        </div>
        <div>
          <span className="font-bold tracking-tight text-amber-950 dark:text-amber-100">
            Demo mode: add your Gnani API key to enable the microphone
          </span>
          <p className="text-[11px] sm:text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
            Voice STT requires a valid Gnani Prisma API key in your environment. You can still test text queries and preset clinical flows below.
          </p>
        </div>
      </div>

      {onLearnMore && (
        <button
          onClick={onLearnMore}
          className="px-3.5 py-2 rounded-xl bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-800/80 dark:hover:bg-amber-700 text-amber-950 dark:text-amber-100 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer min-h-[48px]"
          aria-label="Setup API Key documentation"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Setup Key</span>
        </button>
      )}
    </div>
  );
};
