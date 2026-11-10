import React from "react";
import { Phone, ShieldAlert, ArrowLeft, MapPin, AlertCircle, HeartPulse, ExternalLink } from "lucide-react";
import { playEarcon } from "../utils/earcon";

interface EmergencyFrameProps {
  onClose?: () => void;
  reason?: string;
}

export const EmergencyFrame: React.FC<EmergencyFrameProps> = ({
  onClose,
  reason = "Critical medical symptoms detected. Immediate emergency response required.",
}) => {
  const handleCall108 = () => {
    playEarcon("alertNotice");
    window.location.href = "tel:108";
  };

  const handleCallCasualty = () => {
    playEarcon("alertNotice");
    window.location.href = "tel:+911412789999";
  };

  return (
    <div
      role="region"
      aria-label="Emergency Casualty 108 Frame"
      className="w-full bg-[#DC2626] text-white rounded-3xl p-6 sm:p-10 shadow-2xl border-4 border-red-700 transition-all select-none"
    >
      {/* Top Bar with Return button */}
      <div className="flex items-center justify-between pb-4 border-b border-white/20 mb-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-white animate-pulse" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
            24x7 Critical Emergency Alert
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[48px]"
            aria-label="Return to voice reception"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Reception</span>
          </button>
        )}
      </div>

      {/* Main Alert Message */}
      <div className="max-w-3xl mx-auto text-center space-y-4 my-4">
        <div className="inline-flex p-4 rounded-full bg-white/10 ring-8 ring-white/20 mb-2">
          <HeartPulse className="w-16 h-16 text-white animate-bounce" aria-hidden="true" />
        </div>

        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
          Seek Emergency Care Immediately
        </h2>

        <p className="text-sm sm:text-base text-red-100 font-medium max-w-xl mx-auto leading-relaxed">
          {reason}
        </p>

        {/* Large Prominent "Call 108" Action Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={handleCall108}
            className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-white hover:bg-red-50 text-[#DC2626] font-black text-lg sm:text-xl flex items-center justify-center gap-3 shadow-2xl transition-transform transform active:scale-95 cursor-pointer min-h-[64px] min-w-[240px]"
            aria-label="Call 108 Free National Ambulance Service"
          >
            <Phone className="w-7 h-7 fill-current stroke-none text-[#DC2626]" aria-hidden="true" />
            <span>Call 108 (Free Ambulance)</span>
          </button>

          <button
            type="button"
            onClick={handleCallCasualty}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-red-800/80 hover:bg-red-800 text-white border-2 border-white/40 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-transform transform active:scale-95 cursor-pointer min-h-[56px]"
            aria-label="Call Aarogya Seva Hospital Direct Casualty Desk at +91 141 278 9999"
          >
            <Phone className="w-5 h-5" aria-hidden="true" />
            <span>Hospital Casualty: +91 141 278 9999</span>
          </button>
        </div>
      </div>

      {/* Hospital Location & First Aid Guidance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/20 text-xs sm:text-sm">
        <div className="p-4 rounded-2xl bg-black/20 border border-white/10 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-white shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="block font-bold text-white text-sm mb-1">
              Casualty Gate 1 Directions:
            </strong>
            <p className="text-red-100 leading-relaxed">
              Casualty &amp; Trauma Unit is at <strong>Gate 1</strong> (Emergency Entrance, Ground Floor). Wheelchair ramp and stretcher bays are staffed 24 hours a day, 7 days a week.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-black/20 border border-white/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-white shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong className="block font-bold text-white text-sm mb-1">
              Immediate Safety Steps:
            </strong>
            <p className="text-red-100 leading-relaxed">
              Keep the patient seated or resting in a comfortable position. Loosen any tight collar or clothing. Do not give food, water, or unprescribed medication while waiting for the ambulance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
