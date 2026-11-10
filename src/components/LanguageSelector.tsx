import React, { useState } from "react";
import { Check, Globe, Sparkles, ChevronDown } from "lucide-react";
import { playEarcon } from "../utils/earcon";

export interface LanguageOption {
  code: string;
  name: string;
  nativeScript: string;
  region: string;
  voice: string;
  color: string;
  isFeatured?: boolean;
}

export const FEATURED_LANGUAGES: LanguageOption[] = [
  {
    code: "indic-auto",
    name: "Auto-detect",
    nativeScript: "🌐 Indic",
    region: "All Languages",
    voice: "Prisma Auto",
    color: "from-teal-600 to-emerald-600",
    isFeatured: true,
  },
  {
    code: "ta-IN",
    name: "Tamil",
    nativeScript: "தமிழ்",
    region: "Tamil Nadu",
    voice: "Lakshmi",
    color: "from-amber-600 to-orange-600",
    isFeatured: true,
  },
  {
    code: "te-IN",
    name: "Telugu",
    nativeScript: "తెలుగు",
    region: "AP & Telangana",
    voice: "Lakshmi",
    color: "from-indigo-600 to-violet-600",
    isFeatured: true,
  },
  {
    code: "kn-IN",
    name: "Kannada",
    nativeScript: "ಕನ್ನಡ",
    region: "Karnataka",
    voice: "Lakshmi",
    color: "from-rose-600 to-red-600",
    isFeatured: true,
  },
  {
    code: "hi-IN",
    name: "Hindi",
    nativeScript: "हिन्दी",
    region: "North India",
    voice: "Shivani",
    color: "from-emerald-600 to-teal-700",
    isFeatured: true,
  },
  {
    code: "en-IN",
    name: "English",
    nativeScript: "English",
    region: "India General",
    voice: "Shivani",
    color: "from-blue-600 to-sky-600",
    isFeatured: true,
  },
];

export const OTHER_LANGUAGES: LanguageOption[] = [
  { code: "mr-IN", name: "Marathi", nativeScript: "मराठी", region: "Maharashtra", voice: "Kalpana", color: "from-orange-500 to-amber-600" },
  { code: "gu-IN", name: "Gujarati", nativeScript: "ગુજરાતી", region: "Gujarat", voice: "Kalpana", color: "from-yellow-600 to-amber-700" },
  { code: "bn-IN", name: "Bengali", nativeScript: "বাংলা", region: "West Bengal", voice: "Kalpana", color: "from-emerald-600 to-teal-700" },
  { code: "pa-IN", name: "Punjabi", nativeScript: "ਪੰਜਾਬੀ", region: "Punjab", voice: "Kalpana", color: "from-blue-600 to-indigo-700" },
  { code: "ml-IN", name: "Malayalam", nativeScript: "മലയാളം", region: "Kerala", voice: "Lakshmi", color: "from-purple-600 to-pink-700" },
];

export const ALL_LANGUAGES = [...FEATURED_LANGUAGES, ...OTHER_LANGUAGES];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onSelectLanguage: (code: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelectLanguage,
  disabled = false,
  compact = false,
}) => {
  const [showMore, setShowMore] = useState(false);
  const [isOpenCompact, setIsOpenCompact] = useState(false);

  const currentLang =
    ALL_LANGUAGES.find((l) => l.code === selectedLanguage) || FEATURED_LANGUAGES[0];

  const handleSelect = (code: string) => {
    if (disabled || code === selectedLanguage) return;
    playEarcon("actionSuccess");
    onSelectLanguage(code);
    setIsOpenCompact(false);
  };

  if (compact) {
    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setIsOpenCompact(!isOpenCompact)}
          disabled={disabled}
          className="px-3.5 py-2.5 rounded-2xl bg-teal-50 dark:bg-[#0C1A1C] hover:bg-teal-100 dark:hover:bg-[#1E3B40] border border-teal-200 dark:border-[#1E3B40] text-teal-950 dark:text-[#5FC1C6] text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer min-h-[48px] min-w-[48px]"
          aria-label={`Select language, current: ${currentLang.name}`}
          aria-expanded={isOpenCompact}
        >
          <Globe className="w-4 h-4 text-teal-600 dark:text-[#5FC1C6]" aria-hidden="true" />
          <span className="font-bold">{currentLang.nativeScript}</span>
          <span className="text-[11px] opacity-75 font-normal hidden sm:inline">({currentLang.name})</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpenCompact ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>

        {isOpenCompact && (
          <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-[#13262A] border border-zinc-200 dark:border-[#1E3B40] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-[#1E3B40] text-xs font-bold text-zinc-900 dark:text-[#E6F1EF]">
              <span>Select Spoken Language</span>
              <span className="text-[10px] font-mono text-teal-600 dark:text-[#5FC1C6]">{selectedLanguage}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {ALL_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer min-h-[48px] ${
                      isSelected
                        ? "bg-teal-50 dark:bg-[#0C1A1C] border-teal-600 dark:border-[#5FC1C6] text-teal-950 dark:text-[#5FC1C6] font-bold ring-2 ring-teal-500/20"
                        : "bg-zinc-50 dark:bg-[#0C1A1C]/60 hover:bg-zinc-100 dark:hover:bg-[#0C1A1C] border-zinc-200 dark:border-[#1E3B40] text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{lang.nativeScript}</div>
                      <div className="text-[10px] opacity-80">{lang.name}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-600 dark:text-[#5FC1C6] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-[#13262A] border border-zinc-200 dark:border-[#1E3B40] rounded-3xl p-5 shadow-sm text-left">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100 dark:border-[#1E3B40]">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-teal-600 dark:text-[#5FC1C6]" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-[#E6F1EF]">
            Target Spoken Language
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-[#0C1A1C] text-zinc-700 dark:text-zinc-300">
          <span>STT Code:</span>
          <strong className="text-teal-700 dark:text-[#5FC1C6] font-bold">{selectedLanguage}</strong>
        </div>
      </div>

      {/* Primary Visual Language Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FEATURED_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              disabled={disabled}
              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer select-none ${
                isSelected
                  ? "bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                  : "bg-zinc-50/70 hover:bg-zinc-100 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300"
              } ${disabled ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]"}`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}

              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 font-serif">
                    {lang.nativeScript}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {lang.name}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
                <span className="truncate">{lang.region}</span>
                <span className="font-mono text-[9px] px-1 rounded bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                  {lang.voice}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Extended Languages Toggle */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center justify-between py-1 cursor-pointer"
        >
          <span>More Indic Languages (Marathi, Gujarati, Bengali, Punjabi, Malayalam)...</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              showMore ? "rotate-180" : ""
            }`}
          />
        </button>

        {showMore && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1 animate-in fade-in zoom-in-95">
            {OTHER_LANGUAGES.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  disabled={disabled}
                  className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-900 dark:text-teal-100 font-bold ring-1 ring-teal-500"
                      : "bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div className="truncate">
                    <span className="font-bold mr-1">{lang.nativeScript}</span>
                    <span className="text-[11px] opacity-80">{lang.name}</span>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-teal-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation helper note */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
        <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
        <span>
          Selected: <strong className="text-zinc-800 dark:text-zinc-200">{currentLang.name} ({currentLang.nativeScript})</strong>
          {currentLang.code === "indic-auto"
            ? " — Uses Prisma automatic Indic acoustic detection."
            : ` — Forces STT language model & synthesis to ${currentLang.name} (${currentLang.code}).`}
        </span>
      </div>
    </div>
  );
};
