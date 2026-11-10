import React from "react";
import {
  Activity,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  Building2,
  BarChart3,
  BookOpen,
  Clock,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Mic,
} from "lucide-react";

export type DeviceMode = "responsive" | "phone" | "tablet" | "kiosk" | "desktop";

interface HeaderProps {
  activeTab: "voice" | "reception" | "analytics" | "directory" | "docs";
  setActiveTab: (tab: "voice" | "reception" | "analytics" | "directory" | "docs") => void;
  pendingLeadsCount: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  deviceMode: DeviceMode;
  onSelectDeviceMode: (mode: DeviceMode) => void;
  onOpenEmergency?: () => void;
  micPermissionState?: "granted" | "prompt" | "denied" | "unknown";
  onRequestMicPermission?: () => void;
  isStaffAuthenticated?: boolean;
  onOpenPermissions?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingLeadsCount,
  soundEnabled = true,
  onToggleSound,
  isDarkMode,
  onToggleDarkMode,
  deviceMode,
  onSelectDeviceMode,
  onOpenEmergency,
  micPermissionState,
  onRequestMicPermission,
  isStaffAuthenticated = false,
  onOpenPermissions,
}) => {
  return (
    <header className="border-b border-[#D8E3E0] dark:border-[#1E3B40] bg-white/95 dark:bg-[#0C1A1C]/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* 1. 24/7 Emergency Casualty Top Banner */}
      <div
        onClick={onOpenEmergency}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenEmergency?.();
        }}
        className="bg-[#DC2626] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs cursor-pointer hover:bg-red-700 transition-colors"
        aria-label="Open 24/7 Casualty & 108 Ambulance Hotline Details"
      >
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-white animate-pulse" aria-hidden="true" />
            <span>
              <strong>Emergency Casualty &amp; 108 Ambulance Hotline:</strong> Gate 1 • Open 24x7 • Direct: +91 141 278 9999
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition-colors">
            Open Emergency 108 Frame →
          </span>
        </div>
      </div>

      {/* 2. Main Top Navigation Row */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Brand & Clinic Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0F5C63] dark:bg-[#5FC1C6] text-white dark:text-[#0C1A1C] flex items-center justify-center shadow-md shadow-teal-900/20 shrink-0">
              <Activity className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-zinc-900 dark:text-[#E6F1EF] tracking-tight">
                  AarogyaVani
                </h1>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 dark:bg-[#13262A] dark:text-[#5FC1C6] border border-teal-200 dark:border-[#1E3B40]">
                  Gnani Voice AI
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Aarogya Seva Hospital &amp; Multi-Specialty Clinic
              </p>
            </div>
          </div>

          {/* Quick utility controls for small screens */}
          <div className="flex items-center gap-1.5 xl:hidden">
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 rounded-xl border border-zinc-200 dark:border-[#1E3B40] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#13262A] min-h-[48px] min-w-[48px] flex items-center justify-center cursor-pointer"
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-zinc-700" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Accessible with icons + text labels, min 48px hitboxes) */}
        <nav
          className="flex items-center gap-1.5 bg-[#EEF3F1]/80 dark:bg-[#13262A] p-1.5 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar"
          aria-label="Main application tabs"
        >
          <button
            onClick={() => setActiveTab("voice")}
            className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap min-h-[48px] cursor-pointer ${
              activeTab === "voice"
                ? "bg-[#0F5C63] text-white shadow-sm dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-[#1E3B40]"
            }`}
          >
            <PhoneCall className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Voice Receptionist</span>
          </button>

          <button
            onClick={() => setActiveTab("reception")}
            className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap min-h-[48px] cursor-pointer relative ${
              activeTab === "reception"
                ? "bg-[#0F5C63] text-white shadow-sm dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-[#1E3B40]"
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Reception Desk</span>
            {pendingLeadsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                {pendingLeadsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap min-h-[48px] cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#0F5C63] text-white shadow-sm dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-[#1E3B40]"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap min-h-[48px] cursor-pointer ${
              activeTab === "directory"
                ? "bg-[#0F5C63] text-white shadow-sm dark:bg-[#5FC1C6] dark:text-[#0C1A1C]"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-[#1E3B40]"
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Doctors &amp; Tests</span>
          </button>

          <button
            onClick={() => setActiveTab("docs")}
            className={`px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap min-h-[48px] cursor-pointer ${
              activeTab === "docs"
                ? "bg-teal-700 text-white shadow-sm dark:bg-teal-500 dark:text-[#0C1A1C]"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-[#1E3B40]"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Hackathon Docs</span>
          </button>
        </nav>

        {/* Device Switcher Toolbar + Utility Controls */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EEF3F1] dark:bg-[#13262A] border border-zinc-200 dark:border-[#1E3B40] text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-[#1E3B40] transition-colors cursor-pointer min-h-[48px]"
            aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#0F5C63]" aria-hidden="true" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Permissions Center Hub Button */}
          {onOpenPermissions && (
            <button
              type="button"
              onClick={onOpenPermissions}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer min-h-[48px] bg-[#EEF3F1] dark:bg-[#13262A] border-zinc-200 dark:border-[#1E3B40] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-[#1E3B40]"
              aria-label="Open Hospital Access and Permissions Center"
              title="Manage Microphone, Staff PIN, Sound, and Emergency Access Permissions"
            >
              <ShieldCheck className="w-4 h-4 text-[#0F5C63] dark:text-[#5FC1C6]" aria-hidden="true" />
              <span className="hidden sm:inline">Permissions</span>
              {isStaffAuthenticated && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Staff Role Active" />
              )}
            </button>
          )}

          {/* Microphone Permission Quick Access Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenPermissions && micPermissionState !== "granted") {
                onOpenPermissions();
              } else {
                setActiveTab("voice");
                onRequestMicPermission?.();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer min-h-[48px] ${
              micPermissionState === "granted"
                ? "bg-emerald-50 dark:bg-[#13262A] border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300"
                : micPermissionState === "denied"
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                : "bg-teal-50 dark:bg-[#13262A] border-teal-300 dark:border-[#1E3B40] text-[#0F5C63] dark:text-[#5FC1C6]"
            }`}
            aria-label={`Microphone permission status: ${
              micPermissionState === "granted"
                ? "granted and active"
                : micPermissionState === "denied"
                ? "blocked"
                : "needs permission"
            }`}
          >
            <Mic className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {micPermissionState === "granted"
                ? "Mic: Active"
                : micPermissionState === "denied"
                ? "Mic: Blocked"
                : "Mic: Access"}
            </span>
          </button>

          {/* Sound Earcons Toggle Button */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold transition-colors cursor-pointer min-h-[48px] ${
                soundEnabled
                  ? "bg-teal-50 dark:bg-[#13262A] border-teal-300 dark:border-[#1E3B40] text-[#0F5C63] dark:text-[#5FC1C6]"
                  : "bg-zinc-100 dark:bg-[#13262A] border-zinc-300 dark:border-[#1E3B40] text-zinc-500"
              }`}
              aria-label={soundEnabled ? "Mute audio earcons" : "Enable audio earcons"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-[#0F5C63] dark:text-[#5FC1C6]" aria-hidden="true" />
                  <span className="hidden sm:inline">Audio On</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
