import React from "react";
import { Users, ChevronDown, CheckCircle2, UserCheck } from "lucide-react";

const SummaryFilter = ({ teams = [], selectedTeamId, onChange }) => {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Team Dropdown Filter */}
      <div className="max-w-xs w-full">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
          Filter by Team
        </label>
        <div className="relative">
          <select
            value={
              selectedTeamId && selectedTeamId !== "available"
                ? selectedTeamId
                : ""
            }
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full appearance-none bg-white/[0.04] text-white text-xs font-semibold rounded-2xl px-4 py-3 border border-white/10 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all pr-10 shadow-sm cursor-pointer"
          >
            <option value="" className="bg-[#0e121c] text-white">All Teams</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id} className="bg-[#0e121c] text-white">
                {team.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 w-4 h-4 text-white/40" />
        </div>
      </div>

      {/* Pill Toggle Buttons */}
      <div className="glass-pill-container p-1.5 inline-flex gap-1.5 self-start md:self-auto">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
            selectedTeamId === null
              ? "bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-white border border-emerald-400/40 shadow-[0_0_16px_rgba(52,211,153,0.25)]"
              : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Recently Sold</span>
        </button>

        <button
          type="button"
          onClick={() => onChange("available")}
          className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
            selectedTeamId === "available"
              ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-white border border-cyan-400/40 shadow-[0_0_16px_rgba(56,189,248,0.25)]"
              : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Available Pool</span>
        </button>
      </div>
    </div>
  );
};

export default SummaryFilter;
