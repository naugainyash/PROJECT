import React from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";

interface RateLimitToastProps {
  message?: string;
  retryAfterSeconds?: number;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const RateLimitToast: React.FC<RateLimitToastProps> = ({
  message = "Too many requests, please wait a moment",
  retryAfterSeconds,
  onDismiss,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100%-3rem)] bg-amber-900 text-amber-50 rounded-2xl p-4 shadow-xl border border-amber-600/40 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="w-9 h-9 rounded-xl bg-amber-800/80 flex items-center justify-center shrink-0 text-amber-200">
        <AlertTriangle className="w-5 h-5 text-amber-300" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white tracking-tight">
            {message}
          </p>
          <button
            onClick={onDismiss}
            className="text-amber-200 hover:text-white p-1 rounded-lg transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center -mr-2 -mt-2"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
          {retryAfterSeconds && retryAfterSeconds > 0
            ? `Gnani rate limiter active. Backoff retry in progress (${retryAfterSeconds}s remaining)...`
            : "The voice service received too many concurrent requests. Please wait a moment before trying again."}
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2.5 px-3 py-1.5 rounded-xl bg-white text-amber-950 text-xs font-semibold hover:bg-amber-100 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[48px]"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Query Now</span>
          </button>
        )}
      </div>
    </div>
  );
};
