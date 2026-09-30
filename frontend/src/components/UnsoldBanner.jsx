import React from "react";
import { AlertCircle } from "lucide-react";

export default function UnsoldBanner({ name }) {
  return (
    <div className="glass-card p-8 sm:p-10 w-full max-w-md text-center border-rose-500/30 bg-rose-950/30 shadow-[0_0_50px_rgba(244,114,182,0.15)] flex flex-col items-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-7 h-7" />
      </div>

      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-400 block mb-1">
          Player Unsold
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-brand">
          {name}
        </h2>
      </div>

      <p className="text-xs text-white/60 max-w-xs">
        No bids were placed. The player has been returned to the available pool.
      </p>

      <p className="text-[11px] uppercase tracking-wider text-rose-300/60 font-semibold">
        Next auction round begins shortly...
      </p>
    </div>
  );
}
