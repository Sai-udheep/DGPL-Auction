import React from "react";
import { Link } from "react-router-dom";
import { formatAcademicYear } from "../utils/formatters";

const RecentSoldView = ({ soldPlayers = [], teamMap = new Map() }) => {
  const formatPts = (val) => (val || val === 0 ? `${val} Pts` : "-");

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "Batsman":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/20";
      case "Bowler":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/20";
      case "All-Rounder":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/20";
      case "Wicket-Keeper":
        return "bg-amber-500/15 text-amber-300 border-amber-500/20";
      default:
        return "bg-white/10 text-white/80 border-white/10";
    }
  };

  return (
    <div>
      {soldPlayers.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/50 text-xs">
          No players have been sold yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {soldPlayers.map((player) => {
            const isCaptain = player.isCaptain;
            let teamName =
              (player.team && teamMap.get(player.team)?.name) ||
              player.teamName ||
              "";
            if (!teamName && player.bidHistory && player.bidHistory.length) {
              const last = player.bidHistory[player.bidHistory.length - 1];
              teamName = last.teamName || last.team?.name || teamName;
            }

            return (
              <div
                key={player._id}
                className={`glass-card p-4 flex items-center gap-4 group transition-all duration-300 ${
                  isCaptain ? "border-amber-400/40 shadow-[0_0_20px_rgba(250,204,21,0.15)]" : ""
                }`}
              >
                {isCaptain && (
                  <span className="absolute -top-2.5 -left-2.5 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border border-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                    CAPTAIN
                  </span>
                )}

                <Link
                  to={`/player/${player._id}`}
                  className="w-14 h-20 sm:w-16 sm:h-22 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10 group-hover:border-cyan-400/40 transition-colors"
                >
                  <img
                    src={player.image}
                    alt={player.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.target.src = `https://via.placeholder.com/150x200?text=${encodeURIComponent(player.name)}`;
                    }}
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm sm:text-base font-bold truncate tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                    <Link to={`/player/${player._id}`}>
                      {player.name}
                    </Link>
                  </h4>

                  <div className="text-xs text-white/50 mt-1 flex flex-wrap items-center gap-1.5 leading-none">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(player.category)}`}>
                      {player.category}
                    </span>
                    {player.year && (
                      <span className="text-[11px] text-white/40">
                        {formatAcademicYear(player.year)}
                      </span>
                    )}
                  </div>

                  {teamName && (
                    <p className="text-xs font-semibold text-white/80 mt-1.5 truncate">
                      {teamName}
                    </p>
                  )}
                </div>

                <div className="text-right flex flex-col items-end flex-shrink-0">
                  {isCaptain ? (
                    <>
                      <span className="text-xs font-extrabold text-amber-400 tracking-wide">
                        Retained
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
                        {formatPts(player.finalBidPrice)}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-emerald-300/60 tracking-wider">
                        FINAL BID
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentSoldView;
