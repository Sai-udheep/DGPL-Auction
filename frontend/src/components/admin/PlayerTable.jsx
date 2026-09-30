import React, { useState } from "react";
import { Trash2, AlertCircle, User, Gavel } from "lucide-react";

export default function PlayerTable({
  players = [],
  onStartAuction,
  onSellPlayer,
  onMarkUnsold,
  onDeletePlayer,
  actionLoadingId,
  deletingPlayerId,
  currentAuctionPlayerId = null,
  isUnsoldPool = false,
  tableTitle = "Players",
}) {
  const [confirmId, setConfirmId] = useState(null);
  const [confirmUnsoldId, setConfirmUnsoldId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // If unsold pool, show all. Otherwise hide sold.
  const display = isUnsoldPool
    ? players
    : players.filter((p) => p.status !== "sold");

  // Is there a global auction happening for a DIFFERENT player?
  const anotherPlayerInAuction =
    currentAuctionPlayerId !== null &&
    !display.some((p) => String(p._id) === String(currentAuctionPlayerId) && p.status === "in_auction");

  return (
    <div className="space-y-4">
      {/* 1. Mobile & Windowed Card View (< md) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
        {display.map((p) => {
          const isLive = p.status === "in_auction" || String(p._id) === String(currentAuctionPlayerId);
          const hasBids = (Array.isArray(p.bidHistory) && p.bidHistory.length > 0) || (p.finalBidPrice != null && Number(p.finalBidPrice) > 0) || Boolean(p.team);
          const isThisPlayerInAuction = String(p._id) === String(currentAuctionPlayerId);
          const otherPlayerIsLive = currentAuctionPlayerId !== null && !isThisPlayerInAuction;
          const disabled = actionLoadingId === p._id || deletingPlayerId === p._id;
          const isConfirming = confirmId === p._id;
          const isConfirmingUnsold = confirmUnsoldId === p._id;
          const isConfirmingDelete = confirmDeleteId === p._id;
          const currentBid =
            isLive && hasBids
              ? `${p.bidHistory[p.bidHistory.length - 1].bidAmount} Pts`
              : isLive
              ? `${p.basePrice} Pts (Base)`
              : "-";
          const latestBid = hasBids ? p.bidHistory[p.bidHistory.length - 1] : null;
          const leadingTeamName = isLive
            ? latestBid?.teamName ||
              (latestBid?.team && latestBid.team.name) ||
              p.teamName ||
              (p.team && p.team.name) ||
              "No bids yet"
            : "-";

          return (
            <div
              key={p._id}
              className={`glass-card p-4 space-y-3.5 transition-all ${
                isLive
                  ? "border-amber-500/50 bg-amber-500/[0.08] shadow-[0_0_24px_rgba(234,118,63,0.2)]"
                  : isUnsoldPool
                  ? "border-rose-500/20 bg-rose-500/[0.04]"
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
                      onError={(e) => { e.target.style.display = "none"; }}
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

                {/* Status Badge */}
                <div className="shrink-0">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1 text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 rounded-full text-[9px] font-black shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      LIVE
                    </span>
                  ) : isUnsoldPool ? (
                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                      UNSOLD
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-white/30">Available</span>
                  )}
                </div>
              </div>

              {/* Bid Info */}
              {isLive && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.04] rounded-xl p-2.5">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">Current Bid</p>
                    <p className="text-sm font-black text-emerald-400 mt-0.5">{currentBid}</p>
                  </div>
                  <div className="bg-white/[0.04] rounded-xl p-2.5">
                    <p className="text-[9px] text-white/40 uppercase tracking-wider">Leading Team</p>
                    <p className="text-sm font-bold text-white/90 mt-0.5 truncate">{leadingTeamName}</p>
                  </div>
                </div>
              )}

              {/* Base Price */}
              {!isLive && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Base Price</span>
                  <span className="font-bold text-white/70">
                    {p.basePrice != null ? `${p.basePrice} Pts` : "-"}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {isUnsoldPool ? (
                  // Unsold pool — only delete available
                  <p className="text-[10px] text-rose-300/60 flex-1">Permanently unsold</p>
                ) : !isLive && !otherPlayerIsLive ? (
                  // Start Auction (no live player anywhere)
                  <button
                    onClick={() => onStartAuction && onStartAuction(p._id)}
                    disabled={disabled || !onStartAuction}
                    className={`flex-1 px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all focus:outline-none cursor-pointer ${
                      disabled || !onStartAuction
                        ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                        : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 hover:brightness-110 shadow-sm"
                    }`}
                    type="button"
                  >
                    {actionLoadingId === p._id ? "Starting..." : "Start Auction"}
                  </button>
                ) : !isLive && otherPlayerIsLive ? (
                  // Another player is in auction right now
                  <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-300/70 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    Auction in progress
                  </div>
                ) : isLive && hasBids ? (
                  // Sell Player
                  <button
                    onClick={() => {
                      if (isConfirming) {
                        onSellPlayer && onSellPlayer(p._id);
                        setConfirmId(null);
                      } else {
                        setConfirmId(p._id);
                        setConfirmUnsoldId(null);
                      }
                    }}
                    disabled={disabled || !onSellPlayer}
                    className={`flex-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      disabled
                        ? "bg-emerald-950/40 text-white/30 cursor-not-allowed"
                        : isConfirming
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                    }`}
                    type="button"
                  >
                    {disabled ? "Saving..." : isConfirming ? "✓ Confirm Sell" : "Sell Player"}
                  </button>
                ) : isLive && !hasBids ? (
                  // Mark Unsold
                  <button
                    onClick={() => {
                      if (isConfirmingUnsold) {
                        onMarkUnsold && onMarkUnsold(p._id);
                        setConfirmUnsoldId(null);
                      } else {
                        setConfirmUnsoldId(p._id);
                        setConfirmId(null);
                      }
                    }}
                    disabled={disabled || !onMarkUnsold}
                    className={`flex-1 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      disabled
                        ? "bg-rose-950/40 text-white/30 cursor-not-allowed"
                        : isConfirmingUnsold
                        ? "bg-rose-500 text-white border-rose-400 font-extrabold shadow"
                        : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                    }`}
                    type="button"
                  >
                    {disabled ? "Updating..." : isConfirmingUnsold ? "✓ Confirm Unsold" : "Mark Unsold"}
                  </button>
                ) : null}

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
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Desktop Table View (>= md) */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                  Player
                </th>
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                  Category
                </th>
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                  Base
                </th>
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                  Current Bid
                </th>
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                  Leading Team
                </th>
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-5 py-3.5 text-[10px] font-extrabold text-white/40 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {display.map((p) => {
                const isLive = p.status === "in_auction";
                const hasBids = Array.isArray(p.bidHistory) && p.bidHistory.length > 0;
                const isThisPlayerInAuction = String(p._id) === String(currentAuctionPlayerId);
                const otherPlayerIsLive = currentAuctionPlayerId !== null && !isThisPlayerInAuction;
                const disabled = actionLoadingId === p._id || deletingPlayerId === p._id;
                const isConfirming = confirmId === p._id;
                const isConfirmingUnsold = confirmUnsoldId === p._id;
                const isConfirmingDelete = confirmDeleteId === p._id;
                const latestBid = hasBids ? p.bidHistory[p.bidHistory.length - 1] : null;
                const currentBid =
                  isLive && hasBids
                    ? `${latestBid.bidAmount} Pts`
                    : isLive
                    ? `${p.basePrice} Pts (Base)`
                    : "-";
                const leadingTeamName = isLive
                  ? latestBid?.teamName ||
                    (latestBid?.team && latestBid.team.name) ||
                    "No bids yet"
                  : "-";

                return (
                  <tr
                    key={p._id}
                    className={`transition-colors ${
                      isLive
                        ? "bg-amber-500/[0.06] hover:bg-amber-500/[0.09]"
                        : isUnsoldPool
                        ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06]"
                        : "hover:bg-white/[0.025]"
                    }`}
                  >
                    {/* Name / Avatar */}
                    <td className="px-5 py-3.5 text-xs font-semibold text-white">
                      <div className="flex items-center gap-2.5">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0 bg-white/5"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                        <span className="truncate max-w-[160px]">{p.name}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-xs text-white/70">
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/80 whitespace-nowrap">
                        {p.category || "-"}
                      </span>
                    </td>

                    {/* Base Price */}
                    <td className="px-5 py-3.5 text-xs text-white/60 font-medium whitespace-nowrap">
                      {p.basePrice != null ? `${p.basePrice} Pts` : "-"}
                    </td>

                    {/* Current Bid */}
                    <td className="px-5 py-3.5 text-xs text-emerald-400 font-extrabold whitespace-nowrap">
                      {currentBid}
                    </td>

                    {/* Leading Team */}
                    <td className="px-5 py-3.5 text-xs text-white/90 font-semibold whitespace-nowrap">
                      {leadingTeamName}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5 text-xs whitespace-nowrap">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                          LIVE
                        </span>
                      ) : isUnsoldPool ? (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                          UNSOLD
                        </span>
                      ) : (
                        <span className="text-white/40 text-[11px] font-medium">Available</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2">
                        {isUnsoldPool ? (
                          // Unsold pool: only delete
                          <span className="text-[10px] text-rose-300/50 mr-2">Permanently unsold</span>
                        ) : !isLive && !otherPlayerIsLive ? (
                          // Normal: Start Auction button
                          <button
                            onClick={() => onStartAuction && onStartAuction(p._id)}
                            disabled={disabled || !onStartAuction}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                              disabled || !onStartAuction
                                ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                                : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 hover:brightness-110 shadow-sm font-extrabold"
                            }`}
                            type="button"
                          >
                            {actionLoadingId === p._id ? "Starting..." : "Start Auction"}
                          </button>
                        ) : !isLive && otherPlayerIsLive ? (
                          // Another player live — show inline banner
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 text-amber-300/70 text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            Auction in progress
                          </div>
                        ) : isLive && hasBids ? (
                          // Sell Player button
                          <button
                            onClick={() => {
                              if (isConfirming) {
                                onSellPlayer && onSellPlayer(p._id);
                                setConfirmId(null);
                              } else {
                                setConfirmId(p._id);
                                setConfirmUnsoldId(null);
                              }
                            }}
                            disabled={disabled || !onSellPlayer}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              disabled
                                ? "bg-emerald-950/40 text-white/30 cursor-not-allowed"
                                : isConfirming
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                            }`}
                            type="button"
                          >
                            {disabled ? "Saving..." : isConfirming ? "✓ Confirm Sell" : "Sell Player"}
                          </button>
                        ) : isLive && !hasBids ? (
                          // Mark Unsold button
                          <button
                            onClick={() => {
                              if (isConfirmingUnsold) {
                                onMarkUnsold && onMarkUnsold(p._id);
                                setConfirmUnsoldId(null);
                              } else {
                                setConfirmUnsoldId(p._id);
                                setConfirmId(null);
                              }
                            }}
                            disabled={disabled || !onMarkUnsold}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              disabled
                                ? "bg-rose-950/40 text-white/30 cursor-not-allowed"
                                : isConfirmingUnsold
                                ? "bg-rose-500 text-white border-rose-400 font-extrabold shadow"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                            }`}
                            type="button"
                          >
                            {disabled ? "Updating..." : isConfirmingUnsold ? "✓ Confirm Unsold" : "Mark Unsold"}
                          </button>
                        ) : null}

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
