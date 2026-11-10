import React, { useState, useMemo } from "react";
import {
  Phone,
  CheckCircle2,
  Clock,
  PhoneForwarded,
  UserCheck,
  Search,
  LayoutGrid,
  List,
  ChevronDown,
  Sparkles,
  Send,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Lead } from "../services/hospitalLogic";
import { SampleDataBadge } from "./SampleDataBadge";

interface ReceptionDeskProps {
  leads: Lead[];
  onMarkCalled: (id: string) => Promise<void>;
  onTriggerOutboundReminder: (payload: {
    patient_name: string;
    patient_phone: string;
    doctor_name: string;
    appointment_time: string;
    language_code: string;
  }) => Promise<{ message: string; audioBase64?: string | null }>;
  isLoading: boolean;
  isStaffAuthenticated?: boolean;
  onVerifyPin?: (pin: string) => Promise<boolean>;
  onSeedSampleLeads?: () => Promise<void>;
}

const ITEMS_PER_PAGE = 8;

export const ReceptionDesk: React.FC<ReceptionDeskProps> = ({
  leads,
  onMarkCalled,
  onTriggerOutboundReminder,
  isLoading,
  isStaffAuthenticated = false,
  onVerifyPin,
  onSeedSampleLeads,
}) => {
  const [filter, setFilter] = useState<"all" | "pending" | "called">("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"adaptive" | "table">("adaptive");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [selectedLeadForReminder, setSelectedLeadForReminder] = useState<Lead | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);
  const [showKioskKeypad, setShowKioskKeypad] = useState(false);
  const [inactivitySeconds, setInactivitySeconds] = useState(60);

  // Inactivity auto-clear timer: automatically re-locks staff PIN and masks phone numbers after 60s of inactivity
  React.useEffect(() => {
    if (!isStaffAuthenticated) return;

    const resetInactivity = () => {
      setInactivitySeconds(60);
    };

    const interval = setInterval(() => {
      setInactivitySeconds((prev) => {
        if (prev <= 1) {
          // Inactivity timeout: clear staff authentication to lock numbers
          if (onVerifyPin) {
            onVerifyPin("");
          }
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    window.addEventListener("pointerdown", resetInactivity);
    window.addEventListener("keydown", resetInactivity);
    window.addEventListener("touchstart", resetInactivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pointerdown", resetInactivity);
      window.removeEventListener("keydown", resetInactivity);
      window.removeEventListener("touchstart", resetInactivity);
    };
  }, [isStaffAuthenticated, onVerifyPin]);

  // Reminder form state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [doctorName, setDoctorName] = useState("Dr. Arvind Rao (Pediatrician)");
  const [appointmentTime, setAppointmentTime] = useState("Tomorrow at 10:30 AM");
  const [reminderLang, setReminderLang] = useState("hi-IN");
  const [reminderResult, setReminderResult] = useState<{ message: string; audioBase64?: string | null } | null>(null);
  const [reminderLoading, setReminderLoading] = useState(false);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filter === "pending" && lead.status !== "pending") return false;
      if (filter === "called" && lead.status !== "called") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          lead.name.toLowerCase().includes(q) ||
          lead.phone.includes(q) ||
          lead.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [leads, filter, search]);

  // Virtualized/paginated slice
  const paginatedLeads = useMemo(() => {
    return filteredLeads.slice(0, visibleCount);
  }, [filteredLeads, visibleCount]);

  const hasMore = visibleCount < filteredLeads.length;

  const handleOpenReminder = (lead?: Lead) => {
    if (lead) {
      setSelectedLeadForReminder(lead);
      setPatientName(lead.name);
      setPatientPhone(lead.phone);
    } else {
      setSelectedLeadForReminder(null);
      setPatientName("Sunita Sharma");
      setPatientPhone("9829012345");
    }
    setReminderResult(null);
    setIsReminderModalOpen(true);
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setReminderLoading(true);
    try {
      const res = await onTriggerOutboundReminder({
        patient_name: patientName,
        patient_phone: patientPhone,
        doctor_name: doctorName,
        appointment_time: appointmentTime,
        language_code: reminderLang,
      });
      setReminderResult(res);
    } finally {
      setReminderLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner with Outbound Simulator trigger */}
      <div className="bg-[#0F5C63] dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl p-5 sm:p-7 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SampleDataBadge label={leads.length === 0 ? "Sample data (0 queued)" : "Sample data (Pre-seeded)"} isPreseeded={true} />
            <span className="text-xs text-teal-100/90 dark:text-teal-300">• Auto-polls 5s</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white dark:text-[#E6F1EF]">
            Reception Callback Desk
          </h2>
          <p className="text-xs text-teal-100/90 dark:text-zinc-400 max-w-xl mt-1 leading-relaxed">
            Patient voice inquiries are transcribed, verified with spoken digits, and recorded here. Optimized for desktop (1440px), tablet, and mobile touchscreens.
          </p>
        </div>

        <button
          onClick={() => handleOpenReminder()}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white text-[#0F5C63] hover:bg-teal-50 dark:bg-[#5FC1C6] dark:text-[#0C1A1C] dark:hover:bg-[#4eb3b8] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer self-start md:self-auto shrink-0 min-h-[48px]"
        >
          <PhoneForwarded className="w-4 h-4 text-[#0F5C63] dark:text-[#0C1A1C]" aria-hidden="true" />
          <span>Voice Reminder Audio Preview (Gnani TTS)</span>
        </button>
      </div>

      {/* Staff Access Control (PIN Protection with Kiosk Touch Numpad & Inactivity Auto-Clear) */}
      <div className="bg-white dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-zinc-800 dark:text-zinc-200">
            <UserCheck className="w-5 h-5 text-[#0F5C63] dark:text-[#5FC1C6] shrink-0" aria-hidden="true" />
            <div>
              <span className="font-bold text-sm block">
                {isStaffAuthenticated
                  ? "Staff Authenticated: Full patient phone numbers unlocked for clinic dialing."
                  : "Patient Privacy Protection: Phone numbers masked. Enter Staff PIN to unlock."}
              </span>
              {isStaffAuthenticated && (
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  ⏳ Inactivity auto-lock active: Re-locks in <strong>{inactivitySeconds}s</strong> of no touch.
                </span>
              )}
            </div>
          </div>

          {!isStaffAuthenticated ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (onVerifyPin) {
                      const ok = await onVerifyPin(pinInput);
                      if (!ok) {
                        setPinFeedback("Incorrect PIN or lockout active (max 5 attempts).");
                      } else {
                        setPinFeedback(null);
                        setPinInput("");
                      }
                    }
                  }}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <input
                    type="password"
                    placeholder="Enter Staff PIN"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinFeedback) setPinFeedback(null);
                    }}
                    className="bg-[#EEF3F1] dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] rounded-xl px-3 py-2 text-xs sm:text-sm w-36 focus:outline-none focus:ring-2 focus:ring-[#0F5C63] dark:focus:ring-[#5FC1C6] font-mono min-h-[48px]"
                    aria-label="Enter authorized staff PIN"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#0F5C63] hover:bg-[#0B464B] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-bold text-xs sm:text-sm cursor-pointer shadow-xs min-h-[48px] min-w-[48px] flex items-center justify-center"
                  >
                    Unlock
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setShowKioskKeypad(!showKioskKeypad)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[48px] ${
                    showKioskKeypad
                      ? "bg-teal-50 dark:bg-[#0C1A1C] border-[#0F5C63] dark:border-[#5FC1C6] text-[#0F5C63] dark:text-[#5FC1C6]"
                      : "bg-zinc-100 dark:bg-[#0C1A1C] border-zinc-200 dark:border-[#1E3B40] text-zinc-700 dark:text-zinc-300"
                  }`}
                  aria-label="Toggle kiosk touch numeric keypad"
                >
                  <span>🔢 Kiosk Numpad</span>
                </button>
              </div>
              {pinFeedback && (
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{pinFeedback}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span>Staff Access Active</span>
              </span>
              <button
                type="button"
                onClick={() => onVerifyPin?.("")}
                className="px-3.5 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 text-xs font-semibold cursor-pointer min-h-[48px]"
                aria-label="Lock phone numbers now"
              >
                Lock Now
              </button>
              {onSeedSampleLeads && leads.length === 0 && (
                <button
                  type="button"
                  onClick={onSeedSampleLeads}
                  className="px-3 py-2 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-800 text-[#0F5C63] dark:text-teal-200 text-xs font-semibold cursor-pointer min-h-[48px]"
                >
                  + Add Sample Leads
                </button>
              )}
            </div>
          )}
        </div>

        {/* On-Screen Kiosk Touch Numeric Keypad (Zero external physical keyboard needed) */}
        {!isStaffAuthenticated && showKioskKeypad && (
          <div className="p-4 rounded-2xl bg-[#EEF3F1]/80 dark:bg-[#0C1A1C] border border-zinc-200 dark:border-[#1E3B40] max-w-sm mx-auto w-full animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200 dark:border-[#1E3B40]">
              <span className="font-bold text-xs uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                Hospital Kiosk Touch Keypad
              </span>
              <span className="font-mono text-sm px-2 py-0.5 rounded bg-white dark:bg-[#13262A] text-zinc-900 dark:text-zinc-100 font-bold">
                {pinInput ? "●".repeat(pinInput.length) : "(empty)"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => {
                    if (pinInput.length < 8) setPinInput((prev) => prev + digit);
                  }}
                  className="h-14 rounded-xl bg-white dark:bg-[#13262A] hover:bg-teal-50 dark:hover:bg-[#1E3B40] border border-zinc-200 dark:border-[#1E3B40] font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100 shadow-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer min-h-[48px]"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPinInput("")}
                className="h-14 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center cursor-pointer min-h-[48px]"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pinInput.length < 8) setPinInput((prev) => prev + "0");
                }}
                className="h-14 rounded-xl bg-white dark:bg-[#13262A] hover:bg-teal-50 dark:hover:bg-[#1E3B40] border border-zinc-200 dark:border-[#1E3B40] font-mono text-xl font-bold text-zinc-900 dark:text-zinc-100 shadow-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer min-h-[48px]"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => setPinInput((prev) => prev.slice(0, -1))}
                className="h-14 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-bold active:scale-95 transition-all flex items-center justify-center cursor-pointer min-h-[48px]"
                aria-label="Backspace"
              >
                ⌫
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                if (onVerifyPin) {
                  const ok = await onVerifyPin(pinInput);
                  if (!ok) {
                    setPinFeedback("Incorrect PIN or lockout active (max 5 attempts).");
                  } else {
                    setPinFeedback(null);
                    setPinInput("");
                  }
                }
              }}
              disabled={!pinInput}
              className="mt-3 w-full h-12 rounded-xl bg-[#0F5C63] hover:bg-[#0B464B] dark:bg-[#5FC1C6] dark:hover:bg-[#4eb3b8] text-white dark:text-[#0C1A1C] font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              Unlock Reception Desk
            </button>
          </div>
        )}
      </div>

      {/* Responsive Filter & Search Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Pills with Horizontal Scroll on Small Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] cursor-pointer ${
              filter === "all"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
            }`}
          >
            All ({leads.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] cursor-pointer ${
              filter === "pending"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
            }`}
          >
            Pending ({leads.filter((l) => l.status === "pending").length})
          </button>
          <button
            onClick={() => setFilter("called")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] cursor-pointer ${
              filter === "called"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200"
            }`}
          >
            Called ({leads.filter((l) => l.status === "called").length})
          </button>
        </div>

        {/* Search & Layout View Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, phone, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-teal-500 min-h-[38px]"
            />
          </div>

          {/* Desktop/Mobile Layout Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("adaptive")}
              aria-label="Grid Card View"
              title="Adaptive Card Grid (Mobile Friendly)"
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === "adaptive"
                  ? "bg-white dark:bg-zinc-700 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              aria-label="Table View"
              title="Data Table View"
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white dark:bg-zinc-700 text-teal-700 dark:text-teal-300 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ADAPTIVE CARD GRID SYSTEM (Default on mobile, optional on desktop) */}
      {(viewMode === "adaptive" || window.innerWidth < 768) && (
        <div className="space-y-4">
          {filteredLeads.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 text-xs">
              No callback requests match current filters. Speak or type to record a lead!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header: Name + Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                          {lead.name}
                        </h4>
                        <a
                          href={`tel:+91${lead.phone}`}
                          className="font-mono text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Phone className="w-3 h-3 text-teal-600 shrink-0" />
                          <span>+91 {lead.phone}</span>
                        </a>
                      </div>

                      {lead.status === "called" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Called
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold shrink-0">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Card Body: Enquiry details */}
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 mb-3 space-y-1">
                      <div className="font-medium line-clamp-2">{lead.reason}</div>
                      {lead.notes && (
                        <div className="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-zinc-100 dark:border-zinc-700/60 italic">
                          {lead.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-3 font-mono">
                      <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>{lead.created_at}</span>
                    </div>
                  </div>

                  {/* Card Actions: Touch-friendly buttons (min 42px touch target) */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-2">
                    {lead.status === "pending" ? (
                      <button
                        onClick={() => onMarkCalled(lead.id)}
                        disabled={isLoading}
                        className="w-full py-2 px-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px] active:scale-98"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Mark Called</span>
                      </button>
                    ) : (
                      <div className="text-center py-2 text-[11px] text-zinc-400 font-medium flex items-center justify-center">
                        ✓ Contacted
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenReminder(lead)}
                      className="w-full py-2 px-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[42px] active:scale-98"
                    >
                      <Phone className="w-3.5 h-3.5 text-teal-600" />
                      <span>Remind Call</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Virtualized / Windowed "Load More" Button */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                className="px-5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                <ChevronDown className="w-3.5 h-3.5 text-teal-600" />
                <span>Show more leads ({filteredLeads.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* DESKTOP DATA TABLE (Visible when Table mode is active and on larger displays) */}
      {viewMode === "table" && (
        <div className="hidden md:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Enquiry / Appointment</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Reception Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      No callback requests matching filter. Speak to the bot to record a lead!
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {lead.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-teal-700 dark:text-teal-300">
                        +91 {lead.phone}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 dark:text-zinc-300">
                        <div>{lead.reason}</div>
                        {lead.notes && (
                          <div className="text-[11px] text-zinc-400 mt-0.5">{lead.notes}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                        {lead.created_at}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lead.status === "called" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Called
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Call
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {lead.status === "pending" && (
                            <button
                              onClick={() => onMarkCalled(lead.id)}
                              disabled={isLoading}
                              className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Mark Called
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenReminder(lead)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            title="Trigger automated voice reminder"
                          >
                            <Phone className="w-3.5 h-3.5 text-teal-600" />
                            Remind Call
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table pagination */}
          {hasMore && (
            <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                className="text-xs text-teal-600 hover:underline font-semibold"
              >
                Load more leads ({filteredLeads.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Outbound Voice Call Simulator Modal with Mobile Touch Ergonomics */}
      {isReminderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overscroll-contain">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 flex items-center justify-center shrink-0">
                  <PhoneForwarded className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                    Voice Reminder Audio Preview
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-500">
                    Synthesizes appointment reminder audio using Gnani Timbre TTS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReminderModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[11px] text-zinc-600 dark:text-zinc-400">
              <strong>Honesty Note:</strong> Generates a high-quality spoken audio reminder via Gnani Timbre. Live PSTN telephony dialing requires external carrier SIP trunking.
            </div>

            <form onSubmit={handleSendReminder} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Patient Name
                </label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm min-h-[38px]"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 font-mono text-xs sm:text-sm min-h-[38px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Doctor
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Language
                  </label>
                  <select
                    value={reminderLang}
                    onChange={(e) => setReminderLang(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm min-h-[38px]"
                  >
                    <option value="hi-IN">Hindi (हिन्दी)</option>
                    <option value="en-IN">Indian English</option>
                    <option value="ta-IN">Tamil (தமிழ்)</option>
                    <option value="te-IN">Telugu (తెలుగు)</option>
                    <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Appointment Time
                </label>
                <input
                  type="text"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  required
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm min-h-[38px]"
                />
              </div>

              {reminderResult && (
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 mt-3 animate-in fade-in">
                  <div className="font-semibold flex items-center gap-1.5 text-xs text-teal-800 dark:text-teal-300 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Synthetic Voice Audio Preview Ready</span>
                  </div>
                  <p className="text-[11px] leading-relaxed italic">{reminderResult.message}</p>
                </div>
              )}

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsReminderModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 font-medium min-h-[40px] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={reminderLoading}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{reminderLoading ? "Synthesizing Timbre Audio..." : "Generate Voice Preview"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
