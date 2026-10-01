import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_URL } from "../../config";
import { useAuth } from "../../context/authContextCore";
import {
  X,
  Crown,
  Shield,
  UserCheck,
  Search,
  CheckCircle,
  AlertCircle,
  Users,
  Loader2,
} from "lucide-react";

export default function CaptainsModal({ isOpen, onClose, onCaptainsUpdated }) {
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingTeamId, setSavingTeamId] = useState(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch teams and all players
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/teams`),
        fetch(`${API_URL}/api/v1/players?includeCaptains=true&limit=500`),
      ]);

      if (!tRes.ok) throw new Error("Failed to load teams");
      if (!pRes.ok) throw new Error("Failed to load players");

      const tData = await tRes.json();
      const pData = await pRes.json();

      const teamsList = tData?.data?.teams || [];
      const playersList = pData?.data?.players || [];

      setTeams(teamsList);
      setAllPlayers(playersList);

      // Pre-populate selected captain mapping
      const initialMap = {};
      teamsList.forEach((t) => {
        const capId = t.captain?._id || t.captain;
        if (capId) initialMap[t._id] = String(capId);
      });
      setSelectedPlayerIds(initialMap);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setMessage(null);
      setError(null);
    }
  }, [isOpen, fetchData]);

  // Handle captain selection and retention
  const handleAssignCaptain = async (teamId) => {
    const playerId = selectedPlayerIds[teamId];
    if (!playerId) {
      setError("Please select a player first");
      return;
    }

    setSavingTeamId(teamId);
    setError(null);
    setMessage(null);

    try {
      const targetTeam = teams.find((t) => String(t._id) === String(teamId));
      const targetPlayer = allPlayers.find((p) => String(p._id) === String(playerId));

      let serverAssignOk = false;
      let lastErrMsg = null;

      // 1. Try server assign-captain endpoint
      try {
        const res = await fetch(`${API_URL}/api/v1/teams/${teamId}/assign-captain`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ playerId }),
        });
        if (res.ok) {
          serverAssignOk = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          lastErrMsg = errData.message;
        }
      } catch (err) {
        lastErrMsg = err.message;
      }

      // 2. Direct client-side update fallback
      if (!serverAssignOk) {
        console.warn("[Captains] Endpoint failed/fallback:", lastErrMsg);

        // A. If team had an old captain that is different, revert them to unsold
        const oldCapId = targetTeam?.captain?._id || targetTeam?.captain;
        if (oldCapId && String(oldCapId) !== String(playerId)) {
          await fetch(`${API_URL}/api/v1/players/${oldCapId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              isCaptain: false,
              status: "unsold",
              team: null,
              finalBidPrice: null,
            }),
          }).catch(() => null);
        }

        // B. Update new player: isCaptain = true, status = sold, team = teamId, finalBidPrice = 0
        const patchPlayerRes = await fetch(`${API_URL}/api/v1/players/${playerId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            isCaptain: true,
            status: "sold",
            team: teamId,
            finalBidPrice: 0,
            markedUnsold: false,
            bidHistory: [],
          }),
        });
        if (!patchPlayerRes.ok) {
          const errData = await patchPlayerRes.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update player captain status");
        }

        // C. Update team: captain = playerId, budget = 100, players array
        let playersArr = (targetTeam?.players || []).map((p) => (p._id || p).toString());
        if (oldCapId) playersArr = playersArr.filter((id) => id !== String(oldCapId));
        if (!playersArr.includes(String(playerId))) playersArr.push(String(playerId));

        const patchTeamRes = await fetch(`${API_URL}/api/v1/teams/${teamId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            captain: playerId,
            budget: 100,
            players: playersArr,
          }),
        });
        if (!patchTeamRes.ok) {
          const errData = await patchTeamRes.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to update team captain");
        }
      }

      setMessage(
        `${targetPlayer?.name || "Player"} is now Captain of ${targetTeam?.name || "the team"} and automatically retained in their roster!`
      );

      // Refresh local modal data and parent AdminPage
      await fetchData();
      if (onCaptainsUpdated) onCaptainsUpdated();
    } catch (err) {
      setError(err.message || "Failed to assign captain");
    } finally {
      setSavingTeamId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="glass-card max-w-4xl w-full p-5 sm:p-7 space-y-6 border-white/20 bg-[#0c101a]/95 shadow-[0_0_50px_rgba(0,0,0,0.8)] my-auto max-h-[92vh] overflow-y-auto custom-scroll relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/25 via-orange-500/25 to-yellow-500/10 border border-amber-400/30 flex items-center justify-center shadow-inner text-amber-400 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white font-brand">
                  Team Captains Assignment
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400/15 border border-amber-400/30 text-amber-300">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                Select a captain for each of the 4 teams. Captains must be 3rd Year students and are automatically retained in their team roster at 0 cost.
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

        {/* Notifications */}
        {message && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 text-white/50 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading teams and player pool...</span>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((t) => {
              const currentCap = t.captain;
              const selectedId = selectedPlayerIds[t._id] || (currentCap?._id || currentCap);
              const isSaving = savingTeamId === t._id;
              const searchQuery = searchQueries[t._id] || "";

              // Eligible players: STRICTLY 3rd Year students, and not captain of ANOTHER team
              const otherCaptainsIds = teams
                .filter((other) => String(other._id) !== String(t._id))
                .map((other) => String(other.captain?._id || other.captain || ""));

              const eligiblePlayers = allPlayers.filter((p) => {
                // Must be 3rd year
                const playerYear = parseInt(p.year, 10);
                if (playerYear !== 3) return false;

                const isOtherCap = otherCaptainsIds.includes(String(p._id));
                if (isOtherCap) return false;
                if (!searchQuery.trim()) return true;
                return (
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
                );
              });

              const totalThirdYear = allPlayers.filter((p) => parseInt(p.year, 10) === 3).length;
              const isChanged = String(selectedId) !== String(currentCap?._id || currentCap);

              return (
                <div
                  key={t._id}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-white/20 transition"
                >
                  {/* Team Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/10 flex items-center justify-center text-amber-400 shrink-0 font-black text-xs">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white">{t.name}</h3>
                        <p className="text-[10px] text-white/40">Purse: {t.budget != null ? `${t.budget} Pts` : "100 Pts"}</p>
                      </div>
                    </div>

                    {currentCap && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                        Captain Set
                      </span>
                    )}
                  </div>

                  {/* Current Captain Info */}
                  <div className="bg-black/30 rounded-xl p-3 flex items-center gap-3 border border-white/[0.04]">
                    {currentCap?.image ? (
                      <img
                        src={currentCap.image}
                        alt={currentCap.name}
                        className="w-10 h-10 rounded-full object-cover border border-amber-400/40 shrink-0 shadow"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 shrink-0">
                        <Crown className="w-5 h-5 text-amber-400/60" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider">
                        Current Retained Captain
                      </span>
                      <p className="text-sm font-black text-white truncate">
                        {currentCap?.name || "None Assigned"}
                      </p>
                      {currentCap && (
                        <p className="text-[10px] text-white/50">
                          {currentCap.category || "All-Rounder"} • Year {currentCap.year || "-"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Select New Captain */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/70 flex items-center justify-between">
                      <span>Choose Captain (3rd Year Students Only)</span>
                      <span className="text-[10px] text-amber-300 font-semibold">
                        ({eligiblePlayers.length} eligible / {totalThirdYear} total 3rd years)
                      </span>
                    </label>

                    {/* Filter search input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search player name or category..."
                        value={searchQuery}
                        onChange={(e) =>
                          setSearchQueries((prev) => ({
                            ...prev,
                            [t._id]: e.target.value,
                          }))
                        }
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
                      />
                    </div>

                    {/* Dropdown Select */}
                    <select
                      value={selectedId || ""}
                      onChange={(e) =>
                        setSelectedPlayerIds((prev) => ({
                          ...prev,
                          [t._id]: e.target.value,
                        }))
                      }
                      className="w-full bg-[#121724] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/60 cursor-pointer"
                    >
                      <option value="">-- Select 3rd Year Captain --</option>
                      {eligiblePlayers.map((p) => {
                        const isCurrent = String(p._id) === String(currentCap?._id || currentCap);
                        return (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.category || "All-Rounder"} • Year {p.year || 1})
                            {isCurrent ? " - [CURRENT CAPTAIN]" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Action Button */}
                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleAssignCaptain(t._id)}
                      disabled={isSaving || !selectedId}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isSaving
                          ? "bg-amber-500/20 text-white/50 cursor-not-allowed"
                          : isChanged
                          ? "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black hover:brightness-110 shadow-md"
                          : "bg-white/[0.08] hover:bg-white/[0.14] text-white/80"
                      }`}
                      type="button"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isChanged ? "Confirm & Retain Captain" : "Save Captain"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <p>Tournament Rule: Only 3rd Year players are eligible to captain teams. Captains are retained at 0 cost.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white/80 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-xl transition cursor-pointer"
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
