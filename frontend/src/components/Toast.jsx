import React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export default function Toast({ message, type = "info", onClose }) {
  const base =
    "px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all";
  let style = "bg-[#0e121c]/95 text-white border-white/15";
  let icon = <Info className="w-4 h-4 text-cyan-400 shrink-0" />;

  if (type === "error") {
    style = "bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-[0_0_24px_rgba(244,114,182,0.2)]";
    icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
  } else if (type === "success") {
    style = "bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-[0_0_24px_rgba(52,211,153,0.2)]";
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }

  return (
    <div className={`${base} ${style} animate-fade-in`}>
      <div className="flex items-center gap-2">
        {icon}
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition p-0.5 rounded-lg hover:bg-white/10 cursor-pointer"
          type="button"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
