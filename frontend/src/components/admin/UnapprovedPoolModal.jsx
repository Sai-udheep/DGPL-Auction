import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  Trash2,
  Search,
  AlertTriangle,
  UserCheck,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Edit2,
  Save,
} from "lucide-react";
import { API_URL } from "../../config";
import { useAuth } from "../../context/authContextCore";

export default function UnapprovedPoolModal({
  isOpen,
  onClose,
  onPlayerApproved,
  token: propToken,
}) {
  const { token: authContextToken } = useAuth();
  const token =
    propToken ||
    authContextToken ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("auth_token") : null);

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const fetchUnapproved = async () => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players?isApproved=false&limit=500`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to fetch unapproved players");
      const data = await res.json();
      setPlayers(data?.data?.players || []);
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to load unapproved pool" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUnapproved();
    }
  }, [isOpen]);

  const handleApprove = async (player) => {
    setActionLoadingId(player._id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players/${player._id}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to approve ${player.name}`);
      }
      setPlayers((prev) => prev.filter((p) => p._id !== player._id));
      setFeedbackMsg({ type: "success", text: `Approved ${player.name} into tournament pool!` });
      if (onPlayerApproved) onPlayerApproved();
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (player) => {
    if (!window.confirm(`Are you sure you want to permanently reject & delete "${player.name}"?`)) {
      return;
    }
    setActionLoadingId(player._id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players/${player._id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`Failed to reject ${player.name}`);
      setPlayers((prev) => prev.filter((p) => p._id !== player._id));
      setFeedbackMsg({ type: "info", text: `Rejected and removed ${player.name}` });
      if (onPlayerApproved) onPlayerApproved();
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (players.length === 0) return;
    if (!window.confirm(`Approve all ${players.length} pending players into the tournament pool?`)) {
      return;
    }
    setBulkLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players/approve-all`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to bulk approve players");
      setPlayers([]);
      setFeedbackMsg({
        type: "success",
        text: `All ${data.modifiedCount || players.length} players approved into the tournament pool!`,
      });
      if (onPlayerApproved) onPlayerApproved();
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRejectAll = async () => {
    if (players.length === 0) return;
    if (!window.confirm(`Permanently delete all ${players.length} unapproved players? This cannot be undone.`)) {
      return;
    }
    setBulkLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players/unapproved`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to purge unapproved players");
      setPlayers([]);
      setFeedbackMsg({ type: "info", text: `Cleared all unapproved players.` });
      if (onPlayerApproved) onPlayerApproved();
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleStartEdit = (player) => {
    setEditingPlayerId(player._id);
    setEditFormData({
      name: player.name,
      category: player.category,
      year: player.year || 1,
    });
  };

  const handleSaveEdit = async (playerId) => {
    setActionLoadingId(playerId);
    try {
      const year = parseInt(editFormData.year, 10) || 1;
      const basePrice = year === 1 ? 0.5 : year === 2 ? 1.0 : year === 3 ? 1.5 : 2.0;
      const res = await fetch(`${API_URL}/api/v1/players/${playerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: editFormData.name.trim(),
          category: editFormData.category,
          year,
          basePrice,
        }),
      });
      if (!res.ok) throw new Error("Failed to save player edits");
      setPlayers((prev) =>
        prev.map((p) => (p._id === playerId ? { ...p, ...editFormData, basePrice } : p))
      );
      setEditingPlayerId(null);
    } catch (err) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const matchesSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
      const matchesYear = yearFilter === "all" || String(p.year) === String(yearFilter);
      return matchesSearch && matchesYear;
    });
  }, [players, search, yearFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c1017] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Unapproved Submissions Queue
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {players.length} Pending
                </span>
              </div>
              <p className="text-xs text-white/50 truncate">
                Review Google Form entries to block trolls, duplicates, and bad entries before live auction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition p-2 rounded-xl hover:bg-white/10 cursor-pointer shrink-0"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedbackMsg && (
          <div
            className={`mx-4 sm:mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
              feedbackMsg.type === "success"
                ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30"
                : feedbackMsg.type === "error"
                ? "bg-rose-500/15 text-rose-200 border-rose-500/30"
                : "bg-cyan-500/15 text-cyan-200 border-cyan-500/30"
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action / Filter Bar */}
        <div className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pending players..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-amber-400/50"
              />
            </div>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400/50 cursor-pointer shrink-0"
            >
              <option value="all" className="bg-[#0c1017]">All Years</option>
              <option value="1" className="bg-[#0c1017]">Year 1</option>
              <option value="2" className="bg-[#0c1017]">Year 2</option>
              <option value="3" className="bg-[#0c1017]">Year 3</option>
              <option value="4" className="bg-[#0c1017]">Year 4</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchUnapproved}
              disabled={loading}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-white/70 hover:text-white transition cursor-pointer"
              title="Refresh Queue"
              type="button"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleRejectAll}
              disabled={bulkLoading || players.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition"
              type="button"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reject All</span>
            </button>
            <button
              onClick={handleApproveAll}
              disabled={bulkLoading || players.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              type="button"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Approve All ({players.length})</span>
            </button>
          </div>
        </div>

        {/* Players List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-white/50 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span>Loading unapproved submissions...</span>
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="py-16 text-center text-white/40 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/30">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-white/80">Queue is Clear!</p>
              <p className="text-xs text-white/40 max-w-sm">
                No unapproved submissions found. All Google Form entries have either been approved or rejected.
              </p>
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const isEditing = editingPlayerId === player._id;
              const isActing = actionLoadingId === player._id;
              const basePriceDisplay =
                (player.year === 1
                  ? 0.5
                  : player.year === 2
                  ? 1.0
                  : player.year === 3
                  ? 1.5
                  : 2.0) + " Pts";

              return (
                <div
                  key={player._id}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={player.image}
                      alt={player.name}
                      className="w-11 h-14 rounded-xl object-cover bg-black/50 border border-white/10 shrink-0"
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/150x200?text=${encodeURIComponent(
                          player.name
                        )}`;
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, name: e.target.value })
                            }
                            className="bg-black/60 border border-amber-400/50 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                          <select
                            value={editFormData.category}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, category: e.target.value })
                            }
                            className="bg-black/60 border border-amber-400/50 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket-Keeper">Wicket-Keeper</option>
                          </select>
                          <select
                            value={editFormData.year}
                            onChange={(e) =>
                              setEditFormData({ ...editFormData, year: e.target.value })
                            }
                            className="bg-black/60 border border-amber-400/50 rounded-lg px-2 py-1 text-xs text-white"
                          >
                            <option value="1">Year 1 (0.5 Pts)</option>
                            <option value="2">Year 2 (1.0 Pts)</option>
                            <option value="3">Year 3 (1.5 Pts)</option>
                            <option value="4">Year 4 (2.0 Pts)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white tracking-wide truncate">
                            {player.name}
                          </h4>
                          <button
                            onClick={() => handleStartEdit(player)}
                            className="text-white/40 hover:text-amber-300 transition p-1 cursor-pointer"
                            title="Edit player info before approving"
                            type="button"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white/80 font-semibold border border-white/10">
                          {player.category}
                        </span>
                        <span>Year {player.year || 1}</span>
                        <span>•</span>
                        <span className="text-amber-300 font-bold">Base: {basePriceDisplay}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this player */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isEditing ? (
                      <button
                        onClick={() => handleSaveEdit(player._id)}
                        disabled={isActing}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                        type="button"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    ) : null}

                    <button
                      onClick={() => handleReject(player)}
                      disabled={isActing || bulkLoading}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 transition"
                      type="button"
                      title="Permanently reject and discard submission"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(player)}
                      disabled={isActing || bulkLoading}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                      type="button"
                      title="Approve player into tournament pool"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isActing ? "Approving..." : "Approve"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 sm:px-6 border-t border-white/10 bg-black/40 flex items-center justify-between text-[11px] text-white/40">
          <span>💡 Unapproved players will NEVER appear in live auction or bidding until approved.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white/80 font-semibold cursor-pointer transition"
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
