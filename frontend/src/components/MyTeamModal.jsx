import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL } from "../config";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import {
  X,
  Shield,
  Coins,
  Users,
  Trophy,
  User,
  Sparkles,
  TrendingDown,
  Percent,
} from "lucide-react";

export default function MyTeamModal({ isOpen, onClose }) {
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const teamId = user?.team;

  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch team info
      const tRes = await fetch(`${API_URL}/api/v1/teams/${teamId}`);
      if (!tRes.ok) throw new Error("Could not load team details");
      const tData = await tRes.json();
      const teamObj = tData?.data?.team || tData?.data?.doc || tData?.body;
      setTeam(teamObj);

      // 2. Fetch all players acquired by this team
      const pRes = await fetch(`${API_URL}/api/v1/players?team=${teamId}&limit=100`);
      let squadList = [];
      if (pRes.ok) {
        const pData = await pRes.json();
        squadList = pData?.data?.players || [];
      }

      // 3. Ensure Captain is always included in the squad list
      const capRef = teamObj?.captain || user?.playerProfile;
      let captainPlayer = null;

      if (capRef) {
        if (typeof capRef === "object" && capRef._id) {
          captainPlayer = {
            ...capRef,
            isCaptain: true,
            finalBidPrice: capRef.finalBidPrice ?? 0,
          };
        } else if (typeof capRef === "string") {
          const inList = squadList.find((p) => String(p._id) === String(capRef));
          if (inList) {
            inList.isCaptain = true;
          } else {
            try {
              const cRes = await fetch(`${API_URL}/api/v1/players/${capRef}`);
              if (cRes.ok) {
                const cData = await cRes.json();
                const fetched = cData?.data?.player || cData?.data?.doc || cData?.body;
                if (fetched) {
                  captainPlayer = {
                    ...fetched,
                    isCaptain: true,
                    finalBidPrice: fetched.finalBidPrice ?? 0,
                  };
                }
              }
            } catch (_) {}
          }
        }
      }

      if (captainPlayer && !squadList.some((p) => String(p._id) === String(captainPlayer._id))) {
        squadList = [captainPlayer, ...squadList];
      }

      // Mark captain flag and sort captain to top
      squadList = squadList.map((p) => {
        const isCap = p.isCaptain || (capRef && String(p._id) === String(capRef?._id || capRef));
        return isCap ? { ...p, isCaptain: true, finalBidPrice: p.finalBidPrice ?? 0 } : p;
      });

      squadList.sort((a, b) => (b.isCaptain ? 1 : 0) - (a.isCaptain ? 1 : 0));
      setPlayers(squadList);
    } catch (err) {
      setError(err.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (isOpen && teamId) {
      fetchTeamData();
    }
  }, [isOpen, teamId, fetchTeamData]);

  // Real-time socket updates: when a player is sold or auction resets, refresh my team
  useEffect(() => {
    if (!socket || !isConnected || !isOpen || !teamId) return;

    const handlePlayerSold = (payload) => {
      const soldTeamId = payload?.team?.id || payload?.team?._id || payload?.team;
      if (String(soldTeamId) === String(teamId)) {
        fetchTeamData();
      }
    };

    const handleReset = () => {
      fetchTeamData();
    };

    socket.on("server:player_sold", handlePlayerSold);
    socket.on("player_sold", handlePlayerSold);
    socket.on("server:auction_reset", handleReset);

    return () => {
      socket.off("server:player_sold", handlePlayerSold);
      socket.off("player_sold", handlePlayerSold);
      socket.off("server:auction_reset", handleReset);
    };
  }, [socket, isConnected, isOpen, teamId, fetchTeamData]);

  // Stats calculations
  const totalBudget = 100;
  const currentPurse = team?.budget != null ? Number(team.budget) : 100;
  const spentBudget = Math.max(0, Number((totalBudget - currentPurse).toFixed(2)));
  const budgetPercentUsed = Math.min(100, Math.max(0, (spentBudget / totalBudget) * 100));

  const composition = useMemo(() => {
    const counts = {
      Batsman: 0,
      Bowler: 0,
      "All-Rounder": 0,
      "Wicket-Keeper": 0,
    };
    players.forEach((p) => {
      const cat = p.category || "All-Rounder";
      if (cat.toLowerCase().includes("bat")) counts.Batsman = (counts.Batsman || 0) + 1;
      else if (cat.toLowerCase().includes("bowl")) counts.Bowler = (counts.Bowler || 0) + 1;
      else if (cat.toLowerCase().includes("wicket") || cat.toLowerCase().includes("keeper"))
        counts["Wicket-Keeper"] = (counts["Wicket-Keeper"] || 0) + 1;
      else counts["All-Rounder"] = (counts["All-Rounder"] || 0) + 1;
    });
    return counts;
  }, [players]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2.5 sm:p-5 overflow-y-auto">
      <div className="glass-card max-w-2xl w-full p-4 sm:p-7 space-y-5 sm:space-y-6 border-white/20 bg-[#0c101a]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] my-auto max-h-[94vh] overflow-y-auto custom-scroll relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-amber-300/10 border border-amber-400/30 flex items-center justify-center shadow-inner text-amber-400 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-white font-brand truncate max-w-[200px] xs:max-w-xs sm:max-w-none">
                  {team?.name || "My Team Roster"}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-amber-400/15 border border-amber-400/30 text-amber-300 shrink-0">
                  Captain
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/50 mt-0.5">
                Captain: <strong className="text-white/80">{team?.captain?.name || user?.name || "Assigned"}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition cursor-pointer shrink-0"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading && (
          <div className="text-center py-10 text-white/50 text-xs">
            Loading team composition...
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI Cards: Remaining Purse & Squad Count */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {/* Remaining Purse */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-1 relative overflow-hidden">
                <div className="flex items-center justify-between text-white/40">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Remaining Purse</span>
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                </div>
                <p className="text-xl sm:text-3xl font-black text-emerald-400">
                  {currentPurse} <span className="text-xs font-semibold text-emerald-300/70">Pts</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-white/40">Out of 100.00 Pts</p>
              </div>

              {/* Total Spent */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-1">
                <div className="flex items-center justify-between text-white/40">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Total Spent</span>
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                </div>
                <p className="text-xl sm:text-3xl font-black text-white">
                  {spentBudget} <span className="text-xs font-semibold text-white/50">Pts</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-white/40">{budgetPercentUsed.toFixed(1)}% used</p>
              </div>

              {/* Total Players */}
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-1 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-white/40">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">Squad Size</span>
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" />
                </div>
                <p className="text-xl sm:text-3xl font-black text-white">
                  {players.length} <span className="text-xs font-semibold text-white/50">Players</span>
                </p>
                <p className="text-[9px] sm:text-[10px] text-white/40">Acquired in squad</p>
              </div>
            </div>

            {/* Purse Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-white/60">
                <span>Purse Utilization</span>
                <span>{spentBudget} Pts Spent / {currentPurse} Pts Left</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-500 transition-all duration-500"
                  style={{ width: `${budgetPercentUsed}%` }}
                />
              </div>
            </div>

            {/* Player Composition / Role Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] sm:text-xs font-black text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Player Composition
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:p-2.5 text-center">
                  <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-semibold">Batsmen</p>
                  <p className="text-base sm:text-lg font-black text-amber-300 mt-0.5">{composition.Batsman}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:p-2.5 text-center">
                  <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-semibold">Bowlers</p>
                  <p className="text-base sm:text-lg font-black text-cyan-300 mt-0.5">{composition.Bowler}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:p-2.5 text-center">
                  <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-semibold">All-Rounders</p>
                  <p className="text-base sm:text-lg font-black text-emerald-300 mt-0.5">{composition["All-Rounder"]}</p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 sm:p-2.5 text-center">
                  <p className="text-[9px] sm:text-[10px] text-white/40 uppercase font-semibold">Wicket-Keepers</p>
                  <p className="text-base sm:text-lg font-black text-purple-300 mt-0.5">{composition["Wicket-Keeper"]}</p>
                </div>
              </div>
            </div>

            {/* Squad Roster List / Table */}
            <div className="space-y-2.5">
              <h3 className="text-[11px] sm:text-xs font-black text-white/70 uppercase tracking-widest flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Squad Roster ({players.length})
              </h3>

              {players.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/10 text-white/40 text-xs">
                  No players acquired yet. Your captain and auctioned players will appear here.
                </div>
              ) : (
                <>
                  {/* Mobile & Narrow Window Card List (Always 100% visible, never cut off) */}
                  <div className="space-y-2 sm:hidden">
                    {players.map((p) => (
                      <div
                        key={p._id}
                        className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-10 h-10 rounded-xl object-cover border border-white/15 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/50 shrink-0">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-white text-xs truncate">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-white/[0.06] border border-white/10 text-white/80">
                                {p.category || "All-Rounder"}
                              </span>
                              <span className="text-[10px] text-white/40">Year {p.year || 1}</span>
                            </div>
                            {p.isCaptain && (
                              <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block mt-0.5">
                                👑 Captain (Retained)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Points Column - Explicitly right-aligned and clear */}
                        <div className="text-right shrink-0 pl-2">
                          <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">
                            Points
                          </span>
                          <span className="text-sm font-black text-emerald-400 whitespace-nowrap">
                            {p.isCaptain ? (
                              <span className="text-amber-400 text-xs font-bold">Retained</span>
                            ) : p.finalBidPrice != null ? (
                              `${p.finalBidPrice} Pts`
                            ) : (
                              "-"
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tablet & Desktop Scrollable Table */}
                  <div className="hidden sm:block border border-white/10 rounded-2xl overflow-x-auto custom-scroll bg-white/[0.02]">
                    <table className="w-full text-left border-collapse min-w-[480px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase font-bold text-white/40 tracking-wider">
                          <th className="px-4 py-2.5">Player</th>
                          <th className="px-4 py-2.5">Role</th>
                          <th className="px-4 py-2.5">Year</th>
                          <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[110px]">Points Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05] text-xs">
                        {players.map((p) => (
                          <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {p.image ? (
                                  <img
                                    src={p.image}
                                    alt={p.name}
                                    className="w-8 h-8 rounded-full object-cover border border-white/15 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0">
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate text-xs">
                                    {p.name}
                                  </p>
                                  {p.isCaptain && (
                                    <span className="inline-block text-[9px] font-black text-amber-400 uppercase tracking-wider">
                                      👑 Captain / Retained
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-white/[0.06] border border-white/10 text-white/80">
                                {p.category || "All-Rounder"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                              {p.year ? `Year ${p.year}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap font-extrabold text-emerald-400 text-sm">
                              {p.isCaptain ? (
                                <span className="text-amber-400 font-bold text-xs">Retained</span>
                              ) : p.finalBidPrice != null ? (
                                `${p.finalBidPrice} Pts`
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition cursor-pointer"
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
