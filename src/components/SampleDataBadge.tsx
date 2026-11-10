import React from "react";
import { Info } from "lucide-react";

interface SampleDataBadgeProps {
  label?: string;
  isPreseeded?: boolean;
}

export const SampleDataBadge: React.FC<SampleDataBadgeProps> = ({
  label = "Sample data",
  isPreseeded = false,
}) => {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-[#13262A] text-teal-900 dark:text-[#5FC1C6] border border-teal-200 dark:border-[#1E3B40] text-[11px] sm:text-xs font-semibold tracking-wide"
      title={isPreseeded ? "Demonstration and sample clinic activity records" : "Real-time clinic activity"}
    >
      <Info className="w-3.5 h-3.5 text-teal-700 dark:text-[#5FC1C6] shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
