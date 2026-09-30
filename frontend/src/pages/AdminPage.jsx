import React, { useState, useEffect } from "react";
import YearSelector from "../components/admin/YearSelector";
import PlayerTable from "../components/admin/PlayerTable";
import { useSocket } from "../context/useSocket";
import { useAuth } from "../context/authContextCore";
import { API_URL } from "../config";
import { Radio, Play, Pause, RotateCcw, AlertTriangle, X, Check } from "lucide-react";

const yearOptions = [
  { value: "4", label: "4th Year" },
  { value: "3", label: "3rd Year" },
  { value: "2", label: "2nd Year" },
  { value: "1", label: "1st Year" },
];

export default function AdminPage() {
  const [selectedYear, setSelectedYear] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [auctionMessage, setAuctionMessage] = useState(null);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [statusToggling, setStatusToggling] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const { socket } = useSocket();
  const { token } = useAuth();

  // Load global auction status on mount
  useEffect(() => {
    let ignore = false;
    const loadStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auction/status`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore && typeof data?.data?.isAuctionActive === "boolean") {
            setIsAuctionActive(data.data.isAuctionActive);
          }
        }
      } catch {
        /* ignore */
      }
    };
    loadStatus();
    return () => {
      ignore = true;
    };
  }, []);

  // Fetch players for selected year
  useEffect(() => {
    if (selectedYear == null) return;
    let isCancelled = false;
    const fetchPlayersByYear = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/v1/players?year=${selectedYear}`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) throw new Error("Failed to load players");
        const data = await res.json();
        if (!isCancelled) {
          setPlayers(data.data?.players || []);
        }
      } catch (err) {
        if (!isCancelled) setError(err.message);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    fetchPlayersByYear();
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, token]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleAuctionStatusChanged = (payload) => {
      setIsAuctionActive(!!payload?.isAuctionActive);
    };

    const handleAuctionReset = () => {
      setIsAuctionActive(false);
      refreshYearPlayers();
      setAuctionMessage("Auction has been reset. All rosters and budgets restored.");
    };

    const handleNewBid = (payload) => {
      setPlayers((prev) => {
        return prev.map((p) => {
          if (p._id !== payload.playerId) return p;
          let bidHistory = payload.player?.bidHistory;
          if (!bidHistory && payload.latestBid) {
            const lb = payload.latestBid;
            const entry = {
              _id: lb.timestamp || Date.now(),
              team: lb.teamId,
              teamName: lb.teamName,
              bidAmount: lb.bidAmount,
              timestamp: lb.timestamp || Date.now(),
            };
            bidHistory = [...(p.bidHistory || []), entry];
          }
          return {
            ...p,
            bidHistory: bidHistory || p.bidHistory,
            finalBidPrice: payload.finalBidPrice ?? p.finalBidPrice,
            team: payload.leadingTeam?.id || p.team,
            teamName: payload.leadingTeam?.name || p.teamName,
            status: "in_auction",
          };
        });
      });
    };

    const handleNewPlayer = (player) => {
      setPlayers((prev) =>
        prev.map((p) => ({
          ...p,
          status:
            p._id === player._id
              ? "in_auction"
              : p.status === "in_auction"
              ? "unsold"
              : p.status,
        }))
      );
    };

    const handlePlayerSold = (payload) => {
      const soldPlayer = payload?.player || payload;
      if (!soldPlayer?._id) return;
      setPlayers((prev) =>
        prev.map((p) =>
          p._id === soldPlayer._id
            ? {
                ...p,
                status: "sold",
                finalBidPrice: soldPlayer.finalBidPrice ?? p.finalBidPrice,
                team: soldPlayer.team?._id || soldPlayer.team || p.team,
                teamName:
                  soldPlayer.team?.name || soldPlayer.teamName || p.teamName,
              }
            : p
        )
      );
    };

    const handlePlayerUnsold = (player) => {
      if (!player?._id) return;
      setPlayers((prev) =>
        prev.map((p) => (p._id === player._id ? { ...p, status: "unsold" } : p))
      );
    };

    socket.on("server:auction_status_changed", handleAuctionStatusChanged);
    socket.on("server:auction_reset", handleAuctionReset);
    socket.on("server:new_bid", handleNewBid);
    socket.on("new_player", handleNewPlayer);
    socket.on("server:player_sold", handlePlayerSold);
    socket.on("player_unsold", handlePlayerUnsold);
    socket.on("server:player_unsold", handlePlayerUnsold);

    return () => {
      socket.off("server:auction_status_changed", handleAuctionStatusChanged);
      socket.off("server:auction_reset", handleAuctionReset);
      socket.off("server:new_bid", handleNewBid);
      socket.off("new_player", handleNewPlayer);
      socket.off("server:player_sold", handlePlayerSold);
      socket.off("player_unsold", handlePlayerUnsold);
      socket.off("server:player_unsold", handlePlayerUnsold);
    };
  }, [socket]);

  const refreshYearPlayers = async () => {
    if (selectedYear == null) return;
    try {
      const res = await fetch(
        `${API_URL}/api/v1/players?year=${selectedYear}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.data?.players || []);
      }
    } catch {
      /* ignore */
    }
  };

  const handleToggleAuctionStatus = async () => {
    if (!token) return;
    setStatusToggling(true);
    setAuctionMessage(null);
    try {
      const nextState = !isAuctionActive;
      const res = await fetch(`${API_URL}/api/v1/auction/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAuctionActive: nextState }),
      });
      if (!res.ok) throw new Error("Failed to update auction status");
      setIsAuctionActive(nextState);
      setAuctionMessage(
        nextState
          ? "Auction session is now LIVE and accepting bids."
          : "Auction session has been PAUSED."
      );
    } catch (err) {
      setAuctionMessage(err.message);
    } finally {
      setStatusToggling(false);
    }
  };

  const handleResetAuction = async () => {
    if (!token) return;
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
      if (!res.ok) throw new Error("Failed to reset auction");
      setIsAuctionActive(false);
      setIsResetConfirmOpen(false);
      setAuctionMessage("Auction successfully reset! All non-captain players are unsold and budgets set to 100 Pts.");
      await refreshYearPlayers();
    } catch (err) {
      setAuctionMessage(err.message);
    } finally {
      setResetting(false);
    }
  };

  const handleStartAuction = async (playerId) => {
    if (!token) {
      setAuctionMessage("You must be signed in as admin to start auctions.");
      return;
    }
    setAuctionMessage(null);
    setActionLoadingId(playerId);
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to start auction");
      }
      setIsAuctionActive(true);
      setAuctionMessage("Auction started for selected player.");
      await refreshYearPlayers();
    } catch (err) {
      setAuctionMessage(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSellPlayer = async (playerId) => {
    const player = players.find((p) => p._id === playerId);
    if (!player) return;
    let winningTeamId = null;
    let finalBidPrice = null;
    if (player.bidHistory && player.bidHistory.length) {
      const last = player.bidHistory[player.bidHistory.length - 1];
      winningTeamId = (last.team && last.team._id) || last.team || player.team;
      finalBidPrice = last.bidAmount;
    } else {
      winningTeamId = player.team;
      finalBidPrice = player.finalBidPrice || player.basePrice || 0;
    }
    if (!winningTeamId) {
      setAuctionMessage("No winning team determined (no bids and no team).");
      return;
    }
    setActionLoadingId(playerId);
    setAuctionMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/auction/sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          playerId,
          teamId: winningTeamId,
          finalBid: finalBidPrice,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAuctionMessage("Player sold successfully.");
      setPlayers((prev) =>
        prev.map((p) =>
          p._id === playerId
            ? {
                ...p,
                status: "sold",
                finalBidPrice: finalBidPrice,
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
    <div className="max-w-5xl mx-auto px-4 py-8 relative z-10 space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-wide font-brand">
          Admin Control Center
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Master auction session controller, player stage initiator, and tournament reset
        </p>
      </div>

      {/* Master Session Controls Bar */}
      <div className="glass-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-white/12 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
            isAuctionActive
              ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-400"
              : "bg-white/[0.04] border-white/10 text-white/40"
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
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
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleToggleAuctionStatus}
            disabled={statusToggling}
            className={`glass-btn px-4 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer ${
              isAuctionActive
                ? "bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/15"
                : "bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border-emerald-400/40 hover:from-emerald-500/35 hover:to-teal-500/35"
            }`}
            type="button"
          >
            {isAuctionActive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Session</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Start Auction Session</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="glass-btn px-4 py-2.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 hover:border-rose-500/45 flex items-center gap-2 cursor-pointer"
            type="button"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
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
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
          {error}
        </div>
      )}

      {auctionMessage && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-semibold">
          {auctionMessage}
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
            actionLoadingId={actionLoadingId}
          />
        )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-6 sm:p-8 space-y-5 border-rose-500/30 bg-[#0e121c]/90 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
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
    </div>
  );
}
