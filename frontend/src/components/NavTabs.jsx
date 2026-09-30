import React from "react";
import { Radio, BarChart3 } from "lucide-react";

const NavTabs = ({ activeTab = "live", onChange }) => {
  const isActive = (tab) => activeTab === tab;
  return (
    <div className="w-full flex justify-center pt-4 pb-6 px-4">
      <div
        className="glass-pill-container p-1.5 inline-flex gap-1.5 items-center"
        role="tablist"
        aria-label="Auction navigation"
      >
        <button
          role="tab"
          aria-selected={isActive("live")}
          aria-pressed={isActive("live")}
          tabIndex={isActive("live") ? 0 : -1}
          onClick={() => onChange && onChange("live")}
          className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none flex items-center gap-2 cursor-pointer ${
            isActive("live")
              ? "bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-white font-bold border border-amber-400/40 shadow-[0_0_20px_rgba(234,118,63,0.25)]"
              : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <div className="relative flex items-center justify-center">
            <Radio className={`w-4 h-4 ${isActive("live") ? "text-amber-400" : "text-white/50"}`} />
            {isActive("live") && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="tracking-wide">Live Auction</span>
        </button>

        <button
          role="tab"
          aria-selected={isActive("summary")}
          aria-pressed={isActive("summary")}
          tabIndex={isActive("summary") ? 0 : -1}
          onClick={() => onChange && onChange("summary")}
          className={`relative px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 focus:outline-none flex items-center gap-2 cursor-pointer ${
            isActive("summary")
              ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-white font-bold border border-cyan-400/40 shadow-[0_0_20px_rgba(56,189,248,0.25)]"
              : "text-white/60 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${isActive("summary") ? "text-cyan-400" : "text-white/50"}`} />
          <span className="tracking-wide">Auction Summary</span>
        </button>
      </div>
    </div>
  );
};

export default NavTabs;
