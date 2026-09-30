import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL } from "../../config";
import {
  X,
  Shield,
  Coins,
  Users,
  Trophy,
  User,
  Crown,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AdminTeamsModal({ isOpen, onClose }) {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamPlayers, setTeamPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/teams`);
      if (!res.ok) throw new Error("Failed to load teams");
      const data = await res.json();
      const list = data?.data?.teams || [];
      setTeams(list);
      if (list.length > 0 && !selectedTeamId) {
        setSelectedTeamId(list[0]._id);
      }
    } catch (err) {
      setError(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (isOpen) {
      fetchTeams();
    }
  }, [isOpen, fetchTeams]);

  // Fetch players for selected team
  useEffect(() => {
    if (!selectedTeamId || !isOpen) return;
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/players?team=${selectedTeamId}&limit=100`);
        if (res.ok) {
          const data = await res.json();
          setTeamPlayers(data?.data?.players || []);
        }
      } catch (_) {
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, [selectedTeamId, isOpen]);

  const activeTeam = useMemo(
    () => teams.find((t) => String(t._id) === String(selectedTeamId)) || teams[0],
    [teams, selectedTeamId]
  );

  const composition = useMemo(() => {
    const counts = { Batsman: 0, Bowler: 0, "All-Rounder": 0, "Wicket-Keeper": 0 };
    teamPlayers.forEach((p) => {
      const cat = p.category || "All-Rounder";
      if (cat.toLowerCase().includes("bat")) counts.Batsman = (counts.Batsman || 0) + 1;
      else if (cat.toLowerCase().includes("bowl")) counts.Bowler = (counts.Bowler || 0) + 1;
      else if (cat.toLowerCase().includes("wicket") || cat.toLowerCase().includes("keeper"))
        counts["Wicket-Keeper"] = (counts["Wicket-Keeper"] || 0) + 1;
      else counts["All-Rounder"] = (counts["All-Rounder"] || 0) + 1;
    });
    return counts;
  }, [teamPlayers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2.5 sm:p-5 overflow-y-auto">
      <div className="glass-card max-w-4xl w-full p-4 sm:p-7 space-y-5 sm:space-y-6 border-white/20 bg-[#0c101a]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] my-auto max-h-[94vh] overflow-y-auto custom-scroll relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-white font-brand">
                Team Rosters & Purses
              </h2>
              <p className="text-[11px] sm:text-xs text-white/50 mt-0.5">
                Inspect player compositions and remaining points for all 4 tournament teams
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

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-white/50 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Loading teams...</span>
          </div>
        ) : (
          <>
            {/* Team Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/10 pb-3">
              {teams.map((t) => {
                const isSelected = String(t._id) === String(selectedTeamId);
                return (
                  <button
                    key={t._id}
                    onClick={() => setSelectedTeamId(t._id)}
                    className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-400/50 shadow-lg text-white"
                        : "bg-white/[0.03] border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06]"
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-1.5 mb-1 min-w-0">
                      <Shield className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-amber-400" : "text-white/40"}`} />
                      <strong className="text-xs font-bold truncate block">{t.name}</strong>
                    </div>
                    <span className="text-[11px] font-black text-emerald-400">
                      {t.budget != null ? `${t.budget} Pts` : "100 Pts"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Team Overview */}
            {activeTeam && (
              <div className="space-y-4 sm:space-y-5">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/40 tracking-wider">
                      Purse Remaining
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-emerald-400">
                      {activeTeam.budget != null ? `${activeTeam.budget} Pts` : "100 Pts"}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-white/40">Initial: 100 Pts</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/40 tracking-wider">
                      Squad Size
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-white">
                      {teamPlayers.length} <span className="text-xs font-normal text-white/50">Players</span>
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-white/40">Acquired in squad</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4 space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold text-white/40 tracking-wider">
                      Team Captain
                    </span>
                    <p className="text-xs sm:text-sm font-black text-amber-300 mt-1 truncate flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{activeTeam.captain?.name || "Not assigned"}</span>
                    </p>
                    <p className="text-[10px] text-white/40">
                      {activeTeam.captain?.category || "Retained"}
                    </p>
                  </div>
                </div>

                {/* Composition Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2 sm:p-2.5">
                    <span className="text-[9px] sm:text-[10px] text-white/40 font-semibold block uppercase">Batsmen</span>
                    <strong className="text-sm sm:text-base text-amber-300 font-black">{composition.Batsman}</strong>
                  </div>
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2 sm:p-2.5">
                    <span className="text-[9px] sm:text-[10px] text-white/40 font-semibold block uppercase">Bowlers</span>
                    <strong className="text-sm sm:text-base text-cyan-300 font-black">{composition.Bowler}</strong>
                  </div>
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2 sm:p-2.5">
                    <span className="text-[9px] sm:text-[10px] text-white/40 font-semibold block uppercase">All-Rounders</span>
                    <strong className="text-sm sm:text-base text-emerald-300 font-black">{composition["All-Rounder"]}</strong>
                  </div>
                  <div className="bg-white/[0.02] border border-white/10 rounded-xl p-2 sm:p-2.5">
                    <span className="text-[9px] sm:text-[10px] text-white/40 font-semibold block uppercase">Wicket-Keepers</span>
                    <strong className="text-sm sm:text-base text-purple-300 font-black">{composition["Wicket-Keeper"]}</strong>
                  </div>
                </div>

                {/* Roster Cards / Table */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] sm:text-xs font-black text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Squad Roster ({teamPlayers.length})
                  </h4>

                  {loadingPlayers ? (
                    <div className="text-center py-8 text-white/40 text-xs">Loading roster...</div>
                  ) : teamPlayers.length === 0 ? (
                    <div className="p-6 text-center text-white/40 text-xs rounded-2xl bg-white/[0.02] border border-white/10">
                      No players acquired yet for {activeTeam.name}.
                    </div>
                  ) : (
                    <>
                      {/* Mobile Card List (< sm) - 100% visible points */}
                      <div className="space-y-2 sm:hidden">
                        {teamPlayers.map((p) => (
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
                                <strong className="text-white block font-bold text-xs truncate">{p.name}</strong>
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

                            {/* Points Display */}
                            <div className="text-right shrink-0 pl-2">
                              <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">
                                Points
                              </span>
                              <span className="text-sm font-black text-emerald-400 whitespace-nowrap">
                                {p.isCaptain ? (
                                  <span className="text-amber-400 font-bold text-xs">Retained</span>
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

                      {/* Desktop Table (sm:) */}
                      <div className="hidden sm:block border border-white/10 rounded-2xl overflow-x-auto custom-scroll bg-white/[0.02]">
                        <table className="w-full text-left border-collapse text-xs min-w-[480px]">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase font-bold text-white/40 tracking-wider">
                              <th className="px-4 py-2.5">Player</th>
                              <th className="px-4 py-2.5">Role</th>
                              <th className="px-4 py-2.5">Year</th>
                              <th className="px-4 py-2.5 text-right whitespace-nowrap min-w-[110px]">Points Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.05]">
                            {teamPlayers.map((p) => (
                              <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    {p.image ? (
                                      <img
                                        src={p.image}
                                        alt={p.name}
                                        className="w-7 h-7 rounded-full object-cover border border-white/15 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0">
                                        <User className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                    <div>
                                      <strong className="text-white block font-bold text-xs">{p.name}</strong>
                                      {p.isCaptain && (
                                        <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
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
                                  Year {p.year || 1}
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
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end">
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
