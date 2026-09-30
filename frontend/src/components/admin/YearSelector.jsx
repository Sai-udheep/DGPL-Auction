import React from "react";

export default function YearSelector({
  yearOptions = [],
  selectedYear,
  onSelectYear,
}) {
  return (
    <div className="w-full flex flex-wrap gap-2 mb-6">
      <div className="glass-pill-container p-1.5 inline-flex gap-1.5">
        {yearOptions.map((opt) => {
          const active = selectedYear === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onSelectYear && onSelectYear(opt.value)}
              className={`px-5 py-2 rounded-full font-bold text-xs transition-all duration-200 focus:outline-none cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-white border border-amber-400/40 shadow-[0_0_16px_rgba(234,118,63,0.25)]"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
              }`}
              type="button"
            >
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
