import React, { useState, useEffect, useMemo, useCallback } from "react";
import YearSelector from "../components/admin/YearSelector";
import PlayerTable from "../components/admin/PlayerTable";
import CsvUploadModal from "../components/admin/CsvUploadModal";
import { API_URL } from "../config";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import {
  RotateCcw,
  Play,
  Pause,
  AlertTriangle,
  Radio,
  Upload,
  Trash2,
  X,
} from "lucide-react";

export default function AdminPage() {
  const { token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [players, setPlayers] = useState([]);
  const [selectedYear, setSelectedYear] = useState(4); // Default to 4th year
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auctionMessage, setAuctionMessage] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState(null);

  // Master auction session state
  const [isAuctionActive, setIsAuctionActive] = useState(true);
  const [statusToggling, setStatusToggling] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Bulk Player & CSV Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Descending academic years (4th to 1st)
  const yearOptions = useMemo(
    () => [
      { label: "4th Year", value: 4 },
      { label: "3rd Year", value: 3 },
      { label: "2nd Year", value: 2 },
      { label: "1st Year", value: 1 },
    ],
    []
  );

  // Fetch players for selected year
  const fetchPlayers = useCallback(async () => {
    if (selectedYear == null) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/players?year=${selectedYear}&limit=100`
      );
      if (!res.ok) throw new Error("Failed to load players");
      const data = await res.json();
      setPlayers(data?.data?.players || []);
    } catch (err) {
      setError(err.message || "Failed to load players");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Fetch initial auction status
  useEffect(() => {
    let ignore = false;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auction/status`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore && data && data.data && typeof data.data.isAuctionActive === "boolean") {
            setIsAuctionActive(data.data.isAuctionActive);
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchStatus();
    return () => {
      ignore = true;
    };
  }, []);

  // Real-time socket sync for status & reset events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusChanged = (payload) => {
      if (payload && typeof payload.isAuctionActive === "boolean") {
        setIsAuctionActive(payload.isAuctionActive);
      }
    };

    const handleReset = () => {
      setIsAuctionActive(false);
      fetchPlayers();
    };

    socket.on("server:auction_status_changed", handleStatusChanged);
    socket.on("server:auction_reset", handleReset);

    return () => {
      socket.off("server:auction_status_changed", handleStatusChanged);
      socket.off("server:auction_reset", handleReset);
    };
  }, [socket, isConnected, fetchPlayers]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Toggle Auction Session Active / Inactive
  const handleToggleAuctionStatus = async () => {
    setStatusToggling(true);
    setAuctionMessage(null);
    const nextStatus = !isAuctionActive;
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAuctionActive: nextStatus }),
      });
      if (!res.ok) throw new Error("Failed to update auction status");
      const data = await res.json();
      setIsAuctionActive(data.data.isAuctionActive);
      setAuctionMessage(
        nextStatus
          ? "Auction session started! Viewers can now see live bidding stage."
          : "Auction session paused. Viewers will see waiting stage."
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to update auction status");
    } finally {
      setStatusToggling(false);
    }
  };

  // Reset entire tournament
  const handleResetAuction = async () => {
    setResetting(true);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to reset auction");
      }
      setIsAuctionActive(false);
      setAuctionMessage("Auction successfully reset! All non-captain players unsold, rosters cleared, budgets restored to 100 Pts.");
      setIsResetConfirmOpen(false);
      fetchPlayers();
    } catch (err) {
      setAuctionMessage(err.message || "Failed to reset auction");
    } finally {
      setResetting(false);
    }
  };

  // Delete individual player
  const handleDeletePlayer = async (playerId) => {
    setDeletingPlayerId(playerId);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players/${playerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete player");
      setPlayers((prev) => prev.filter((p) => p._id !== playerId));
      setAuctionMessage("Player deleted successfully.");
    } catch (err) {
      setAuctionMessage(err.message || "Failed to delete player");
    } finally {
      setDeletingPlayerId(null);
    }
  };

  // Delete all non-captain players (bulk wipe)
  const handleDeleteAllPlayers = async () => {
    setDeletingAll(true);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/players/delete-all`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete all players");
      }
      const data = await res.json();
      setAuctionMessage(data.message || "All non-captain players deleted and team rosters cleared.");
      setIsDeleteAllConfirmOpen(false);
      fetchPlayers();
    } catch (err) {
      setAuctionMessage(err.message || "Failed to clear players");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleStartAuction = async (playerId) => {
    setActionLoadingId(playerId);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setIsAuctionActive(true);
      setAuctionMessage("Player is now in auction!");
      setPlayers((prev) =>
        prev.map((p) => (p._id === playerId ? { ...p, status: "in_auction" } : p))
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to start auction for player");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSellPlayer = async (playerId) => {
    setActionLoadingId(playerId);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      const winningTeamId = resData?.data?.player?.team;
      setAuctionMessage("Player successfully sold!");
      setPlayers((prev) =>
        prev.map((p) =>
          p._id === playerId
            ? {
                ...p,
                status: "sold",
                team: winningTeamId,
              }
            : p
        )
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to sell player");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkUnsold = async (playerId) => {
    setActionLoadingId(playerId);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/unsold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAuctionMessage("Player marked unsold.");
      setPlayers((prev) =>
        prev.map((p) => (p._id === playerId ? { ...p, status: "unsold" } : p))
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to mark unsold");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10 space-y-6 sm:space-y-8">
      {/* Page Title & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-brand">
            Admin Control Center
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Master auction session controller, player stage initiator, and bulk data manager
          </p>
        </div>

        {/* Top Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="glass-btn px-3 py-2 sm:px-3.5 sm:py-2 text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 flex items-center gap-1.5 cursor-pointer shadow-sm flex-1 sm:flex-initial justify-center"
            type="button"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Import CSV / JSON</span>
          </button>

          <button
            onClick={() => setIsDeleteAllConfirmOpen(true)}
            className="glass-btn px-3 py-2 sm:px-3.5 sm:py-2 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center"
            type="button"
            title="Delete all non-captain players"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Clear Pool</span>
          </button>
        </div>
      </div>

      {/* Master Session Controls Bar */}
      <div className="glass-card p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-white/12 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner shrink-0 ${
            isAuctionActive
              ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-400"
              : "bg-white/[0.04] border-white/10 text-white/40"
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                isAuctionActive ? "bg-emerald-400 animate-ping" : "bg-white/30"
              }`} />
              <span className={`text-xs font-black uppercase tracking-wider ${
                isAuctionActive ? "text-emerald-400" : "text-white/50"
              }`}>
                {isAuctionActive ? "Live Session Active" : "Session Inactive / Paused"}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              {isAuctionActive
                ? "Public viewers and captains see the live bidding stage"
                : "Viewers see the 'Auction Not Active' waiting card"}
            </p>
          </div>
        </div>

        {/* Master Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full md:w-auto">
          <button
            onClick={handleToggleAuctionStatus}
            disabled={statusToggling}
            className={`glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap ${
              isAuctionActive
                ? "bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/15"
                : "bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border-emerald-400/40 hover:from-emerald-500/35 hover:to-teal-500/35"
            }`}
            type="button"
          >
            {isAuctionActive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Pause Session</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 shrink-0" />
                <span>Start Auction Session</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 hover:border-rose-500/45 flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
            type="button"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Reset Auction</span>
          </button>
        </div>
      </div>

      {/* Year Selector Tabs (4th to 1st) */}
      <YearSelector
        yearOptions={yearOptions}
        selectedYear={selectedYear}
        onSelectYear={setSelectedYear}
      />

      {selectedYear == null && (
        <div className="glass-card p-8 text-center text-white/50 text-xs">
          Select an academic year above to inspect and control the player pool.
        </div>
      )}

      {loading && (
        <div className="text-cyan-400 text-xs font-semibold animate-pulse tracking-widest uppercase">
          Fetching player pool...
        </div>
      )}

      {error && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-300/60 hover:text-white cursor-pointer"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {auctionMessage && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-between gap-3">
          <span>{auctionMessage}</span>
          <button
            onClick={() => setAuctionMessage(null)}
            className="text-amber-200/60 hover:text-white cursor-pointer shrink-0"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        selectedYear != null &&
        players.filter((p) => p.status !== "sold").length === 0 && (
          <div className="glass-card p-8 text-center text-white/50 text-xs">
            No active or unsold players remaining for this academic year.
          </div>
        )}

      {!loading &&
        !error &&
        selectedYear != null &&
        players.filter((p) => p.status !== "sold").length > 0 && (
          <PlayerTable
            players={players}
            onStartAuction={handleStartAuction}
            onSellPlayer={handleSellPlayer}
            onMarkUnsold={handleMarkUnsold}
            onDeletePlayer={handleDeletePlayer}
            actionLoadingId={actionLoadingId}
            deletingPlayerId={deletingPlayerId}
          />
        )}

      {/* CSV / JSON Upload Modal */}
      <CsvUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        token={token}
        onUploadSuccess={fetchPlayers}
      />

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-6 sm:p-8 space-y-5 border-rose-500/30 bg-[#0e121c]/95 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Reset Entire Auction?</h3>
                <p className="text-xs text-white/50">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Resetting will clear all current bid histories, mark all auctioned non-captain players back to <strong>Unsold</strong>, and restore all team budgets to <strong>100 Points</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={resetting}
                className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-xl transition cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleResetAuction}
                disabled={resetting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg cursor-pointer flex items-center gap-1.5"
                type="button"
              >
                {resetting ? "Resetting..." : "Confirm & Reset All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Players Confirmation Modal */}
      {isDeleteAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-6 sm:p-8 space-y-5 border-rose-500/30 bg-[#0e121c]/95 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Delete All Players?</h3>
                <p className="text-xs text-white/50">Permanent pool wipe</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              This will permanently delete <strong>all non-captain players</strong> from the database and reset team rosters. Captains will be preserved.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteAllConfirmOpen(false)}
                disabled={deletingAll}
                className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-xl transition cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllPlayers}
                disabled={deletingAll}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition shadow-lg cursor-pointer flex items-center gap-1.5"
                type="button"
              >
                {deletingAll ? "Deleting..." : "Confirm Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
