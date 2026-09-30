import React, { useState } from "react";
import { Trash2, AlertCircle, Sparkles, User, Tag, Award } from "lucide-react";

export default function PlayerTable({
  players = [],
  onStartAuction,
  onSellPlayer,
  onMarkUnsold,
  onDeletePlayer,
  actionLoadingId,
  deletingPlayerId,
}) {
  const [confirmId, setConfirmId] = useState(null);
  const [confirmUnsoldId, setConfirmUnsoldId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const display = players.filter((p) => p.status !== "sold");

  return (
    <div className="space-y-4">
      {/* 1. Mobile & Windowed Card View (< md) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        {display.map((p) => {
          const isLive = p.status === "in_auction";
          const hasBids = p.bidHistory && p.bidHistory.length > 0;
          const disabled = actionLoadingId === p._id || deletingPlayerId === p._id;
          const isConfirming = confirmId === p._id;
          const isConfirmingUnsold = confirmUnsoldId === p._id;
          const isConfirmingDelete = confirmDeleteId === p._id;
          const currentBid =
            isLive && hasBids
              ? `${p.bidHistory[p.bidHistory.length - 1].bidAmount} Pts`
              : isLive
              ? `${p.basePrice} Pts`
              : "-";
          const latestBid = hasBids
            ? p.bidHistory[p.bidHistory.length - 1]
            : null;
          const leadingTeamName = isLive
            ? latestBid?.teamName ||
              (latestBid?.team && latestBid.team.name) ||
              p.teamName ||
              (p.team && p.team.name) ||
              "-"
            : "-";

          return (
            <div
              key={p._id}
              className={`glass-card p-4 space-y-3.5 transition-all ${
                isLive
                  ? "border-amber-500/50 bg-amber-500/[0.08] shadow-[0_0_24px_rgba(234,118,63,0.2)]"
                  : "border-white/10"
              }`}
            >
              {/* Top Row: Avatar, Name, Category & Status */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-10 h-10 rounded-xl object-cover border border-white/15 bg-white/5 shrink-0"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/10 text-white/80">
                        {p.category || "All-Rounder"}
                      </span>
                      <span className="text-[10px] text-white/40">Year {p.year || 1}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-white/35 text-[10px] font-medium uppercase px-2 py-0.5 rounded-md bg-white/[0.03]">
                      Unsold
                    </span>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center text-xs">
                <div>
                  <span className="text-[10px] text-white/40 block font-medium">Base</span>
                  <span className="text-white/90 font-bold">{p.basePrice != null ? `${p.basePrice} Pts` : "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-medium">High Bid</span>
                  <span className="text-emerald-400 font-extrabold">{currentBid}</span>
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-medium">Leading</span>
                  <span className="text-white/90 font-semibold truncate block max-w-[80px] mx-auto">
                    {leadingTeamName}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {!isLive && (
                  <>
                    <button
                      onClick={() => onStartAuction && onStartAuction(p._id)}
                      disabled={disabled || isLive}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer flex items-center justify-center gap-1.5 ${
                        disabled
                          ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                          : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 hover:brightness-110 shadow-sm font-extrabold"
                      }`}
                      type="button"
                    >
                      {actionLoadingId === p._id ? "Starting..." : "Start Auction"}
                    </button>

                    {isConfirmingDelete ? (
                      <button
                        onClick={() => {
                          onDeletePlayer && onDeletePlayer(p._id);
                          setConfirmDeleteId(null);
                        }}
                        disabled={disabled}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow transition cursor-pointer flex items-center gap-1 shrink-0"
                        type="button"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Confirm</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(p._id)}
                        disabled={disabled}
                        className="p-2 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 transition cursor-pointer shrink-0"
                        type="button"
                        title="Delete Player"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}

                {isLive && hasBids && (
                  <button
                    onClick={() => {
                      if (isConfirming) {
                        onSellPlayer && onSellPlayer(p._id);
                        setConfirmId(null);
                      } else {
                        setConfirmId(p._id);
                      }
                    }}
                    disabled={disabled}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      disabled
                        ? "bg-emerald-950/40 text-white/30 cursor-not-allowed"
                        : isConfirming
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                    }`}
                    type="button"
                  >
                    {disabled
                      ? "Saving..."
                      : isConfirming
                      ? "Confirm Sell"
                      : "Sell Player"}
                  </button>
                )}

                {isLive && !hasBids && (
                  <button
                    onClick={() => {
                      if (isConfirmingUnsold) {
                        onMarkUnsold && onMarkUnsold(p._id);
                        setConfirmUnsoldId(null);
                      } else {
                        setConfirmUnsoldId(p._id);
                      }
                    }}
                    disabled={disabled}
                    className={`w-full py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      disabled
                        ? "bg-rose-950/40 text-white/30 cursor-not-allowed"
                        : isConfirmingUnsold
                        ? "bg-rose-500 text-white border-rose-400 shadow-lg"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                    }`}
                    type="button"
                  >
                    {disabled
                      ? "Updating..."
                      : isConfirmingUnsold
                      ? "Confirm Unsold"
                      : "Mark Unsold"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Table View (>= md) */}
      <div className="hidden md:block glass-card overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto custom-scroll">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-5 py-3.5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  Base Price
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  Highest Bid
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  Leading Team
                </th>
                <th className="px-5 py-3.5 text-xs font-bold text-white/50 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-white/50 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {display.map((p) => {
                const isLive = p.status === "in_auction";
                const hasBids = p.bidHistory && p.bidHistory.length > 0;
                const disabled = actionLoadingId === p._id || deletingPlayerId === p._id;
                const isConfirming = confirmId === p._id;
                const isConfirmingUnsold = confirmUnsoldId === p._id;
                const isConfirmingDelete = confirmDeleteId === p._id;
                const currentBid =
                  isLive && hasBids
                    ? `${p.bidHistory[p.bidHistory.length - 1].bidAmount} Pts`
                    : isLive
                    ? `${p.basePrice} Pts`
                    : "-";
                const latestBid = hasBids
                  ? p.bidHistory[p.bidHistory.length - 1]
                  : null;
                const leadingTeamName = isLive
                  ? latestBid?.teamName ||
                    (latestBid?.team && latestBid.team.name) ||
                    p.teamName ||
                    (p.team && p.team.name) ||
                    "-"
                  : "-";

                return (
                  <tr
                    key={p._id}
                    className={`transition-colors hover:bg-white/[0.03] ${
                      isLive ? "bg-amber-500/[0.07]" : ""
                    }`}
                  >
                    <td className="px-5 py-3.5 text-xs font-bold text-white">
                      <div className="flex items-center gap-2.5">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0 bg-white/5"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <span className="truncate max-w-[160px]">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/70">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/80 whitespace-nowrap">
                        {p.category || "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/60 font-medium whitespace-nowrap">
                      {p.basePrice != null ? `${p.basePrice} Pts` : "-"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-emerald-400 font-extrabold whitespace-nowrap">
                      {currentBid}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/90 font-semibold whitespace-nowrap">
                      {leadingTeamName}
                    </td>
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-white/40 text-[11px] font-medium">Unsold</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        {!isLive && (
                          <>
                            <button
                              onClick={() => onStartAuction && onStartAuction(p._id)}
                              disabled={disabled || isLive}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                                disabled
                                  ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                                  : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 hover:brightness-110 shadow-sm font-extrabold"
                              }`}
                              type="button"
                            >
                              {actionLoadingId === p._id ? "Starting..." : "Start Auction"}
                            </button>

                            {/* Delete Button */}
                            {isConfirmingDelete ? (
                              <button
                                onClick={() => {
                                  onDeletePlayer && onDeletePlayer(p._id);
                                  setConfirmDeleteId(null);
                                }}
                                disabled={disabled}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow transition cursor-pointer flex items-center gap-1"
                                type="button"
                                title="Click to confirm deletion"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Confirm</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(p._id)}
                                disabled={disabled}
                                className="p-1.5 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                                type="button"
                                title="Delete Player"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}

                        {isLive && hasBids && (
                          <button
                            onClick={() => {
                              if (isConfirming) {
                                onSellPlayer && onSellPlayer(p._id);
                                setConfirmId(null);
                              } else {
                                setConfirmId(p._id);
                              }
                            }}
                            disabled={disabled}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              disabled
                                ? "bg-emerald-950/40 text-white/30 cursor-not-allowed"
                                : isConfirming
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            }`}
                            type="button"
                          >
                            {disabled
                              ? "Saving..."
                              : isConfirming
                              ? "Confirm Sell"
                              : "Sell Player"}
                          </button>
                        )}

                        {isLive && !hasBids && (
                          <button
                            onClick={() => {
                              if (isConfirmingUnsold) {
                                onMarkUnsold && onMarkUnsold(p._id);
                                setConfirmUnsoldId(null);
                              } else {
                                setConfirmUnsoldId(p._id);
                              }
                            }}
                            disabled={disabled}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              disabled
                                ? "bg-rose-950/40 text-white/30 cursor-not-allowed"
                                : isConfirmingUnsold
                                ? "bg-rose-500 text-white border-rose-400 font-extrabold shadow"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                            }`}
                            type="button"
                          >
                            {disabled
                              ? "Updating..."
                              : isConfirmingUnsold
                              ? "Confirm Unsold"
                              : "Mark Unsold"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
