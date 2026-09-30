import React from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export default function Toast({ message, type = "info" }) {
  const base =
    "px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-xs font-semibold flex items-center gap-2.5 transition-all";
  let style = "bg-white/[0.08] text-white border-white/15";
  let icon = <Info className="w-4 h-4 text-cyan-400 shrink-0" />;

  if (type === "error") {
    style = "bg-rose-950/70 text-rose-200 border-rose-500/40 shadow-[0_0_24px_rgba(244,114,182,0.2)]";
    icon = <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
  } else if (type === "success") {
    style = "bg-emerald-950/70 text-emerald-200 border-emerald-500/40 shadow-[0_0_24px_rgba(52,211,153,0.2)]";
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  }

  return (
    <div className={`${base} ${style} animate-fade-in`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
