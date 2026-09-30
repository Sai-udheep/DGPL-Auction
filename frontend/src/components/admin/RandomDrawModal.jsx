import React from "react";
import { X, Dices, Play, RefreshCw, User, Sparkles } from "lucide-react";

export default function RandomDrawModal({
  isOpen,
  player,
  selectedYear,
  remainingCount,
  onClose,
  onStartAuction,
  onDrawAnother,
  isStarting = false,
}) {
  if (!isOpen || !player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 sm:p-7 space-y-6 border-amber-400/30 bg-[#0e1320]/95 shadow-[0_0_60px_rgba(234,118,63,0.3)] my-auto relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <Dices className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white font-brand">
                  Random Player Drawn
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                  Year {selectedYear}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                {remainingCount} available player{remainingCount === 1 ? "" : "s"} in this year pool
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawn Player Spotlight Card */}
        <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-amber-400/25 rounded-2xl p-5 text-center space-y-4 shadow-inner relative overflow-hidden">
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Ready for Stage</span>
          </div>

          {/* Player Photo */}
          <div className="relative inline-block mx-auto mt-2">
            {player.image ? (
              <img
                src={player.image}
                alt={player.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-amber-400/50 shadow-2xl mx-auto"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/40 mx-auto">
                <User className="w-12 h-12" />
              </div>
            )}
            <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-slate-950 border border-amber-400/40 text-[10px] font-black text-amber-300 uppercase tracking-widest shadow">
              Year {player.year || selectedYear}
            </div>
          </div>

          {/* Name & Category */}
          <div className="pt-2">
            <h4 className="text-xl sm:text-2xl font-black text-white tracking-wide font-brand">
              {player.name}
            </h4>
            <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase bg-white/[0.08] border border-white/15 text-white/90">
                {player.category || "All-Rounder"}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                Base: {player.basePrice != null ? `${player.basePrice} Pts` : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Start Auction Button */}
          <button
            onClick={() => onStartAuction && onStartAuction(player._id)}
            disabled={isStarting}
            className="w-full py-3 px-4 rounded-xl text-sm font-black text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none"
            type="button"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{isStarting ? "Starting Live Auction..." : `Start Auction for ${player.name.split(" ")[0]}`}</span>
          </button>

          {/* Draw Another Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onDrawAnother}
              disabled={isStarting || remainingCount <= 1}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              type="button"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Draw Another Player</span>
            </button>

            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition cursor-pointer"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
