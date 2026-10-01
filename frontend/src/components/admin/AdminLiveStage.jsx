import React, { useState } from "react";
import {
  Gavel,
  Radio,
  User,
  Clock,
  Sparkles,
  TrendingUp,
  Shield,
  Check,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function AdminLiveStage({
  player,
  onSellPlayer,
  onMarkUnsold,
  onCancelPlayer,
  actionLoadingId,
}) {
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [confirmSell, setConfirmSell] = useState(false);
  const [confirmUnsold, setConfirmUnsold] = useState(false);

  if (!player) {
    return (
      <div className="glass-card p-4 sm:p-5 border-white/10 bg-white/[0.02] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/40 shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white/80">
              Auction Stage is Clear
            </h3>
            <p className="text-[10px] sm:text-xs text-white/40">
              No player is currently on stage. Pick a player below or click <strong>🎲 Draw Random Player</strong> to start.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-white/40 font-semibold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          Stage Idle
        </div>
      </div>
    );
  }

  const hasBids =
    (Array.isArray(player.bidHistory) && player.bidHistory.length > 0) ||
    (player.finalBidPrice != null && Number(player.finalBidPrice) > 0) ||
    Boolean(player.team);

  const topBid =
    Array.isArray(player.bidHistory) && player.bidHistory.length > 0
      ? player.bidHistory[player.bidHistory.length - 1]
      : null;

  const currentBidAmount = topBid?.bidAmount != null
    ? `${topBid.bidAmount} Pts`
    : player.finalBidPrice != null
    ? `${player.finalBidPrice} Pts`
    : `${player.basePrice || 0} Pts (Base Price)`;

  const leadingTeamName =
    topBid?.teamName ||
    (topBid?.team && topBid.team.name) ||
    player.teamName ||
    (player.team && player.team.name) ||
    "No bids yet";

  const isLoading = actionLoadingId === player._id;

  return (
    <div className="glass-card p-4 sm:p-6 border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-transparent shadow-[0_0_35px_rgba(234,118,63,0.18)] relative overflow-hidden space-y-4">
      {/* Top Banner / Live Indicator */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
            LIVE ON STAGE
          </span>
          <span className="text-[11px] font-semibold text-white/50 hidden xs:inline">
            Active Bidding Stage
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50 font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{Array.isArray(player.bidHistory) ? player.bidHistory.length : 0} bids placed</span>
        </div>
      </div>

      {/* Main Grid: Player Spotlight & Live Bid Stats & Immediate Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* 1. Player Info (5 Cols) */}
        <div className="lg:col-span-5 flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            {player.image ? (
              <img
                src={player.image}
                alt={player.name}
                className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl object-cover border-2 border-amber-400/60 shadow-xl"
              />
            ) : (
              <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white/40">
                <User className="w-8 h-8" />
              </div>
            )}
            <div className="absolute -bottom-1.5 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full bg-slate-950 border border-amber-400/50 text-[9px] font-black text-amber-300 uppercase tracking-widest shadow">
              Year {player.year || 1}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-black text-white truncate font-brand tracking-wide">
              {player.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-white/[0.08] border border-white/15 text-white/90">
                {player.category || "All-Rounder"}
              </span>
              <span className="text-[11px] text-white/50">
                Base: <strong className="text-white/80">{player.basePrice} Pts</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 2. Live Bid & Leading Team (4 Cols) */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-2 bg-white/[0.03] border border-white/10 rounded-2xl p-3">
          <div>
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
              Highest Bid
            </p>
            <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5 truncate">
              {currentBidAmount}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
              Leading Team
            </p>
            <p className="text-xs sm:text-sm font-bold text-white mt-1 truncate flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{leadingTeamName}</span>
            </p>
          </div>
        </div>

        {/* 3. Action Buttons (3 Cols) */}
        <div className="lg:col-span-3 flex lg:flex-col items-center justify-end gap-2 w-full">
          {hasBids ? (
            /* Sell Player Button */
            <button
              onClick={() => {
                if (confirmSell) {
                  onSellPlayer && onSellPlayer(player._id);
                  setConfirmSell(false);
                } else {
                  setConfirmSell(true);
                  setConfirmUnsold(false);
                }
              }}
              disabled={isLoading || !onSellPlayer}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition shadow-lg cursor-pointer flex items-center justify-center gap-1.5 ${
                isLoading
                  ? "bg-emerald-950/60 text-white/40 cursor-not-allowed"
                  : confirmSell
                  ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-2 border-emerald-300 scale-102"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950"
              }`}
              type="button"
            >
              {isLoading ? (
                <span>Finalizing Sell...</span>
              ) : confirmSell ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>✓ Confirm Sell</span>
                </>
              ) : (
                <>
                  <Gavel className="w-4 h-4" />
                  <span>Sell Player</span>
                </>
              )}
            </button>
          ) : (
            /* Mark Unsold Button (when no bids placed) */
            <button
              onClick={() => {
                if (confirmUnsold) {
                  onMarkUnsold && onMarkUnsold(player._id);
                  setConfirmUnsold(false);
                } else {
                  setConfirmUnsold(true);
                  setConfirmSell(false);
                }
              }}
              disabled={isLoading || !onMarkUnsold}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition shadow-lg cursor-pointer flex items-center justify-center gap-1.5 ${
                isLoading
                  ? "bg-rose-950/60 text-white/40 cursor-not-allowed"
                  : confirmUnsold
                  ? "bg-rose-500 hover:bg-rose-400 text-white border-2 border-rose-300 scale-102"
                  : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40"
              }`}
              type="button"
            >
              {isLoading ? (
                <span>Marking Unsold...</span>
              ) : confirmUnsold ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>✓ Confirm Unsold</span>
                </>
              ) : (
                <span>Mark Unsold</span>
              )}
            </button>
          )}

          {/* Withdraw / Return to Pool Button (Always Available for accidental starts) */}
          <button
            onClick={() => {
              if (confirmWithdraw) {
                onCancelPlayer && onCancelPlayer(player._id);
                setConfirmWithdraw(false);
              } else {
                setConfirmWithdraw(true);
                setConfirmSell(false);
                setConfirmUnsold(false);
              }
            }}
            disabled={isLoading || !onCancelPlayer}
            className={`w-full py-2 px-3 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              confirmWithdraw
                ? "bg-amber-500 text-slate-950 font-black shadow-lg"
                : "bg-white/[0.05] hover:bg-white/[0.1] text-amber-300/80 hover:text-amber-200 border border-amber-500/20"
            }`}
            type="button"
            title="Accidentally clicked start? Return player to available pool without penalty"
          >
            {confirmWithdraw ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>✓ Confirm Withdraw to Pool</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Withdraw to Pool</span>
              </>
            )}
          </button>

          {/* Quick reset confirmation on outside click */}
          {(confirmSell || confirmUnsold || confirmWithdraw) && (
            <button
              onClick={() => {
                setConfirmSell(false);
                setConfirmUnsold(false);
                setConfirmWithdraw(false);
              }}
              className="text-[10px] text-white/40 hover:text-white/70 transition underline cursor-pointer"
              type="button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Recent Bid History Ticker (if any bids) */}
      {Array.isArray(player.bidHistory) && player.bidHistory.length > 0 && (
        <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto custom-scroll text-[11px]">
          <span className="text-white/40 shrink-0 uppercase tracking-wider text-[9px] font-bold">
            Recent Bids:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
            {player.bidHistory.slice(-4).reverse().map((b, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-semibold whitespace-nowrap ${
                  i === 0
                    ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300 font-bold"
                    : "bg-white/[0.03] border-white/10 text-white/50"
                }`}
              >
                {b.teamName || "Team"}: <strong>{b.bidAmount} Pts</strong>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
