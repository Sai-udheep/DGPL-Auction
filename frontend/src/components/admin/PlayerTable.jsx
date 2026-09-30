import React, { useState } from "react";

export default function PlayerTable({
  players = [],
  onStartAuction,
  onSellPlayer,
  onMarkUnsold,
  actionLoadingId,
}) {
  const [confirmId, setConfirmId] = useState(null);
  const [confirmUnsoldId, setConfirmUnsoldId] = useState(null);

  const display = players.filter((p) => p.status !== "sold");

  return (
    <div className="glass-card overflow-hidden border border-white/10 shadow-2xl">
      <div className="overflow-x-auto custom-scroll">
        <table className="w-full text-left border-collapse">
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
              const disabled = actionLoadingId === p._id;
              const isConfirming = confirmId === p._id;
              const isConfirmingUnsold = confirmUnsoldId === p._id;
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
                  <td className="px-5 py-4 text-xs font-bold text-white">
                    {p.name}
                  </td>
                  <td className="px-5 py-4 text-xs text-white/70">
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/80">
                      {p.category || "-"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-white/60 font-medium">
                    {p.basePrice != null ? `${p.basePrice} Pts` : "-"}
                  </td>
                  <td className="px-5 py-4 text-xs text-emerald-400 font-extrabold">
                    {currentBid}
                  </td>
                  <td className="px-5 py-4 text-xs text-white/90 font-semibold">
                    {leadingTeamName}
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-950 bg-gradient-to-r from-amber-400 to-orange-400 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-white/40 text-[11px] font-medium">Unsold</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    {!isLive && (
                      <button
                        onClick={() => onStartAuction && onStartAuction(p._id)}
                        disabled={disabled || isLive}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all focus:outline-none cursor-pointer ${
                          disabled
                            ? "bg-white/[0.04] text-white/30 cursor-not-allowed"
                            : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 hover:brightness-110 shadow-sm"
                        }`}
                        type="button"
                      >
                        {disabled ? "Starting..." : "Start Auction"}
                      </button>
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
