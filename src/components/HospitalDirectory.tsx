import React from "react";
import { UserCheck, Stethoscope, TestTube2, Clock, MapPin, Phone, AlertTriangle, ShieldCheck } from "lucide-react";

interface HospitalDirectoryProps {
  hospitalData: any;
  onQueryDoctor: (doctorName: string) => void;
  onQueryTest: (testName: string) => void;
}

export const HospitalDirectory: React.FC<HospitalDirectoryProps> = ({
  hospitalData,
  onQueryDoctor,
  onQueryTest,
}) => {
  const doctors = hospitalData.doctors || [];
  const tests = hospitalData.diagnostic_tests || [];
  const location = hospitalData.location || {};
  const contacts = hospitalData.contacts || {};

  return (
    <div className="space-y-6">
      {/* Hospital Overview Card */}
      <div className="bg-white dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-[#1E3B40]">
          <div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 dark:bg-[#0C1A1C] text-[#0F5C63] dark:text-[#5FC1C6] border border-teal-200 dark:border-[#1E3B40] uppercase tracking-wider">
              Hospital Database (Single Source of Truth)
            </span>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-[#E6F1EF] mt-2">
              {hospitalData.hospital_name || "Aarogya Seva Hospital"}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              {hospitalData.tagline || "Compassionate Care in Your Own Language"}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 text-xs">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              <div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-200">OPD Timings</div>
                <div className="text-zinc-500">Mon-Sat: 8 AM - 8 PM (Sun Closed)</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <div className="font-semibold">Casualty 24x7</div>
                <div>Gate 1 • 108 Emergency</div>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Contact Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-zinc-600 dark:text-zinc-300">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Address: </span>
              {location.address} ({location.landmark}). {location.google_maps_note}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Helplines: </span>
              Reception: {contacts.reception_phone} | Emergency: {contacts.emergency_phone} / {contacts.hospital_casualty_direct}
            </div>
          </div>
        </div>
      </div>

      {/* Doctors Schedule Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Consultant Doctors &amp; OPD Schedule
            </h3>
          </div>
          <span className="text-xs text-zinc-400">Click any doctor to ask by voice/text</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc: any) => (
            <div
              key={doc.id}
              onClick={() => onQueryDoctor(doc.name)}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-teal-500 dark:hover:border-teal-400 bg-zinc-50/50 dark:bg-zinc-800/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {doc.name}
                  </h4>
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                    ₹{doc.fee}
                  </span>
                </div>

                <div className="text-xs font-medium text-teal-600 dark:text-teal-400 mb-2">
                  {doc.specialty} ({doc.degrees})
                </div>

                <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1 mb-3">
                  <div><strong>Days:</strong> {doc.days}</div>
                  <div><strong>Timings:</strong> {doc.hours}</div>
                  <div><strong>Room:</strong> {doc.room}</div>
                  {doc.surgery_note && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-md mt-1">
                      ⚠️ {doc.surgery_note}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700 text-[11px] text-teal-600 font-semibold group-hover:underline flex items-center justify-between">
                <span>Ask about {doc.name.split(" ")[1]}</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Diagnostic Tests & Pricing */}
      <div className="bg-white dark:bg-[#13262A] border border-[#D8E3E0] dark:border-[#1E3B40] rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100 dark:border-[#1E3B40]">
          <div className="flex items-center gap-2">
            <TestTube2 className="w-5 h-5 text-[#0F5C63] dark:text-[#5FC1C6]" aria-hidden="true" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-[#E6F1EF]">
              Diagnostic Lab Tests &amp; Fasting Guidelines
            </h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Click any test to query test rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tests.map((test: any, idx: number) => (
            <div
              key={idx}
              onClick={() => onQueryTest(test.name)}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors">
                    {test.name}
                  </h4>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    ₹{test.price}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-2 leading-relaxed">
                  <strong>Preparation:</strong> {test.instructions_en}
                </p>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 italic">
                  (हिन्दी: {test.instructions_hi})
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700 text-[11px] text-zinc-500 flex items-center justify-between">
                <span>Report time: <strong>{test.report_time}</strong></span>
                <span className="text-emerald-600 font-semibold group-hover:underline">Ask pricing →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety & Out of scope notice */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-sm mb-1">Grounding &amp; Safety Constraint (Anti-Hallucination)</div>
          <p className="leading-relaxed">
            AarogyaVani is strictly constrained to answer ONLY from this verified dataset. The bot explicitly refuses to diagnose or suggest medicines. If a visitor asks about open-heart surgery, MRI, or neurosurgery, the bot transparently clarifies that these are not conducted on-site and offers a receptionist callback.
          </p>
        </div>
      </div>
    </div>
  );
};
