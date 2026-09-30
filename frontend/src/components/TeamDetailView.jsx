import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { formatAcademicYear } from "../utils/formatters";
import { Coins, Users, Trophy } from "lucide-react";

const TeamDetailView = ({ team, teamPlayers = [] }) => {
  const formatPts = (val) => (val || val === 0 ? `${val} Pts` : "-");

  const categoryBreakdown = useMemo(() => {
    return teamPlayers.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {});
  }, [teamPlayers]);

  const highestBid = useMemo(() => {
    return teamPlayers.reduce(
      (max, p) =>
        !p.isCaptain && p.finalBidPrice > max ? p.finalBidPrice : max,
      0
    );
  }, [teamPlayers]);

  if (!team) return null;

  return (
    <div className="space-y-8">
      {/* Team Header Title */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-brand">
          {team.name}
        </h2>
        <p className="text-xs text-white/50 mt-0.5">Team Roster and Budget Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Players Acquired</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-white">{teamPlayers.length}</p>
        </div>

        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Purse Remaining</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-emerald-400">
            {formatPts(team.budget)}
          </p>
        </div>

        <div className="glass-card p-5 space-y-1">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Bid Amount</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-black text-white">
            {formatPts(highestBid)}
          </p>
        </div>
      </div>

      {/* Category Breakdown Chips */}
      <div className="glass-card p-5">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-3">
          Squad Composition
        </h5>
        {Object.keys(categoryBreakdown).length === 0 ? (
          <p className="text-xs text-white/40">No players acquired yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2.5">
            {Object.entries(categoryBreakdown).map(([cat, count]) => (
              <li
                key={cat}
                className="px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-white flex items-center gap-2 text-xs font-semibold"
              >
                <span className="text-emerald-400 font-extrabold">{count}</span>
                <span className="text-white/70 uppercase tracking-wider text-[11px]">{cat}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Players List Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 tracking-wide">
          Roster ({teamPlayers.length})
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamPlayers.map((player) => {
            const isCaptain = player.isCaptain;
            return (
              <div
                key={player._id}
                className={`glass-card p-4 flex items-center gap-4 group ${
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
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/80">
                      {player.category}
                    </span>
                    {player.year && (
                      <span className="text-[11px] text-white/40">
                        {formatAcademicYear(player.year)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end flex-shrink-0">
                  {isCaptain ? (
                    <span className="text-xs font-extrabold text-amber-400 tracking-wide">
                      Retained
                    </span>
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
      </div>
    </div>
  );
};

export default TeamDetailView;
