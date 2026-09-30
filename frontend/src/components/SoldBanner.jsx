import React from "react";
import { CheckCircle2 } from "lucide-react";

export default function SoldBanner({ name, teamName, amount }) {
  return (
    <div className="glass-card p-8 sm:p-10 w-full max-w-md text-center border-emerald-500/30 bg-emerald-950/30 shadow-[0_0_50px_rgba(52,211,153,0.15)] flex flex-col items-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
        <CheckCircle2 className="w-7 h-7" />
      </div>

      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 block mb-1">
          Player Sold
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-brand">
          {name}
        </h2>
      </div>

      <div className="p-4 rounded-2xl bg-black/40 border border-white/10 w-full">
        <p className="text-xs text-white/60 mb-1">Winning Team</p>
        <p className="text-lg font-bold text-white mb-2">{teamName || "-"}</p>
        <div className="text-3xl font-black text-emerald-400">
          {amount != null ? `${amount} Pts` : "--"}
        </div>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-emerald-300/60 font-semibold">
        Next auction round begins shortly...
      </p>
    </div>
  );
}
