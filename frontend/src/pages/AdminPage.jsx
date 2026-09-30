import React, { useState, useEffect, useMemo, useCallback } from "react";
import YearSelector from "../components/admin/YearSelector";
import PlayerTable from "../components/admin/PlayerTable";
import CsvUploadModal from "../components/admin/CsvUploadModal";
import CaptainsModal from "../components/admin/CaptainsModal";
import RandomDrawModal from "../components/admin/RandomDrawModal";
import AdminLiveStage from "../components/admin/AdminLiveStage";
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
  Users,
  Gavel,
  Crown,
  Dices,
  UserCheck,
} from "lucide-react";

export default function AdminPage() {
  const { token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [players, setPlayers] = useState([]);
  const [selectedYear, setSelectedYear] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auctionMessage, setAuctionMessage] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState(null);

  // Master auction session state
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [currentAuctionPlayerId, setCurrentAuctionPlayerId] = useState(null);
  const [statusToggling, setStatusToggling] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Bulk Player & CSV Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Captains & Random Draw Modals
  const [isCaptainsModalOpen, setIsCaptainsModalOpen] = useState(false);
  const [isRandomDrawModalOpen, setIsRandomDrawModalOpen] = useState(false);
  const [drawnPlayer, setDrawnPlayer] = useState(null);
  const [liveStagePlayer, setLiveStagePlayer] = useState(null);

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

  // Fetch initial auction status (includes currentPlayerId)
  useEffect(() => {
    let ignore = false;
    const fetchStatus = async () => {
      try {
        const [statRes, curRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/auction/status`).catch(() => null),
          fetch(`${API_URL}/api/v1/auction/current`).catch(() => null),
        ]);

        if (!ignore && statRes && statRes.ok) {
          const data = await statRes.json();
          if (data && data.data) {
            if (typeof data.data.isAuctionActive === "boolean") {
              setIsAuctionActive(data.data.isAuctionActive);
            }
            if (data.data.currentPlayerId) {
              setCurrentAuctionPlayerId(String(data.data.currentPlayerId));
            } else {
              setCurrentAuctionPlayerId(null);
            }
          }
        }

        if (!ignore && curRes && curRes.ok) {
          const curData = await curRes.json();
          const activePlayer = curData?.data?.player;
          if (activePlayer) {
            setLiveStagePlayer(activePlayer);
            setCurrentAuctionPlayerId(String(activePlayer._id));
            setIsAuctionActive(true);
          } else {
            setLiveStagePlayer(null);
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

  // Real-time socket sync
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatusChanged = (payload) => {
      if (payload && typeof payload.isAuctionActive === "boolean") {
        setIsAuctionActive(payload.isAuctionActive);
      }
      if ("currentPlayerId" in payload) {
        setCurrentAuctionPlayerId(
          payload.currentPlayerId ? String(payload.currentPlayerId) : null
        );
      }
    };

    const handleReset = () => {
      setIsAuctionActive(false);
      setCurrentAuctionPlayerId(null);
      setLiveStagePlayer(null);
      fetchPlayers();
    };

    // When a new player enters auction — update local state live
    const handleNewPlayer = (player) => {
      if (!player) return;
      setCurrentAuctionPlayerId(String(player._id));
      setLiveStagePlayer(player);
      setIsAuctionActive(true);
      setPlayers((prev) =>
        prev.map((p) => {
          if (String(p._id) === String(player._id)) {
            return { ...p, ...player, status: "in_auction" };
          }
          // Reset other in_auction players back to unsold
          if (p.status === "in_auction") {
            return { ...p, status: "unsold", bidHistory: [] };
          }
          return p;
        })
      );
    };

    // When a bid is placed — update bidHistory live on admin view
    // server:new_bid sends: { player, playerId, latestBid, finalBidPrice, leadingTeam, bidHistoryLength }
    const handleBidPlaced = (payload) => {
      if (!payload) return;
      // The server sends the full player snapshot in payload.player
      const player = payload.player || null;
      if (player && player._id) {
        setLiveStagePlayer(player);
        setPlayers((prev) =>
          prev.map((p) =>
            String(p._id) === String(player._id) ? { ...p, ...player } : p
          )
        );
      } else if (payload.latestBid) {
        setLiveStagePlayer((prev) =>
          prev && String(prev._id) === String(payload.playerId)
            ? {
                ...prev,
                finalBidPrice: payload.finalBidPrice,
                team: payload.leadingTeam?.id || prev.team,
                teamName: payload.leadingTeam?.name || prev.teamName,
                bidHistory: [...(prev.bidHistory || []), payload.latestBid],
              }
            : prev
        );
      }
    };

    // When player sold
    const handlePlayerSold = (payload) => {
      if (!payload || !payload.player) return;
      const { player } = payload;
      setCurrentAuctionPlayerId(null);
      setLiveStagePlayer(null);
      setIsAuctionActive(false);
      setPlayers((prev) =>
        prev.map((p) =>
          String(p._id) === String(player._id)
            ? { ...p, ...player, status: "sold" }
            : p
        )
      );
    };

    // When player marked unsold
    const handlePlayerUnsold = (player) => {
      if (!player) return;
      setCurrentAuctionPlayerId(null);
      setLiveStagePlayer(null);
      setIsAuctionActive(false);
      setPlayers((prev) =>
        prev.map((p) =>
          String(p._id) === String(player._id)
            ? { ...p, ...player, status: "unsold", markedUnsold: true }
            : p
        )
      );
    };

    socket.on("server:auction_status_changed", handleStatusChanged);
    socket.on("server:auction_reset", handleReset);
    socket.on("new_player", handleNewPlayer);
    socket.on("server:new_bid", handleBidPlaced);
    socket.on("server:player_sold", handlePlayerSold);
    socket.on("player_sold", handlePlayerSold);
    socket.on("server:player_unsold", handlePlayerUnsold);
    socket.on("player_unsold", handlePlayerUnsold);

    return () => {
      socket.off("server:auction_status_changed", handleStatusChanged);
      socket.off("server:auction_reset", handleReset);
      socket.off("new_player", handleNewPlayer);
      socket.off("server:new_bid", handleBidPlaced);
      socket.off("server:player_sold", handlePlayerSold);
      socket.off("player_sold", handlePlayerSold);
      socket.off("server:player_unsold", handlePlayerUnsold);
      socket.off("player_unsold", handlePlayerUnsold);
    };
  }, [socket, isConnected, fetchPlayers]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Toggle Auction Session Active / Inactive (Pause/Resume global session)
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update auction status");
      }
      const data = await res.json();
      setIsAuctionActive(data.data.isAuctionActive);
      setAuctionMessage(
        nextStatus
          ? "Auction session resumed! Live bidding is active."
          : "Auction session paused. Viewers will see the waiting stage."
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to update auction status");
    } finally {
      setStatusToggling(false);
    }
  };

  // Reset entire tournament (with auto-fallback to direct API if backend reset endpoint isn't deployed yet)
  const handleResetAuction = async () => {
    setResetting(true);
    setAuctionMessage(null);
    try {
      let resetSucceeded = false;
      try {
        const res = await fetch(`${API_URL}/api/v1/auction/reset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          resetSucceeded = true;
        }
      } catch (_) {}

      // If backend reset endpoint failed or isn't deployed yet, run comprehensive client fallback
      if (!resetSucceeded) {
        // 1. Fetch all players and reset all non-captains back to unsold
        const pRes = await fetch(`${API_URL}/api/v1/players?limit=200`);
        if (pRes.ok) {
          const pData = await pRes.json();
          const allP = pData?.data?.players || [];
          const toReset = allP.filter(
            (p) => !p.isCaptain && (p.status !== "unsold" || p.markedUnsold || (Array.isArray(p.bidHistory) && p.bidHistory.length > 0) || p.finalBidPrice != null)
          );
          await Promise.all(
            toReset.map((p) =>
              fetch(`${API_URL}/api/v1/players/${p._id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  status: "unsold",
                  team: null,
                  finalBidPrice: null,
                  bidHistory: [],
                  markedUnsold: false,
                }),
              }).catch(() => null)
            )
          );
        }

        // 2. Fetch all teams and restore budget to 100 and players to only captain
        const tRes = await fetch(`${API_URL}/api/v1/teams`);
        if (tRes.ok) {
          const tData = await tRes.json();
          const allT = tData?.data?.teams || [];
          await Promise.all(
            allT.map((t) => {
              const captainId = t.captain?._id || t.captain;
              return fetch(`${API_URL}/api/v1/teams/${t._id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  budget: 100,
                  players: captainId ? [captainId] : [],
                }),
              }).catch(() => null);
            })
          );
        }
      }

      setIsAuctionActive(false);
      setCurrentAuctionPlayerId(null);
      setAuctionMessage(
        "Auction successfully reset! All non-captain players unsold, rosters cleared, budgets restored to 100 Pts."
      );
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to delete player");
      }
      setPlayers((prev) => prev.filter((p) => p._id !== playerId));
      // If deleted player was the one in auction, clear auction state
      if (String(currentAuctionPlayerId) === String(playerId)) {
        setCurrentAuctionPlayerId(null);
        setIsAuctionActive(false);
      }
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
      setAuctionMessage(
        data.message ||
          "All non-captain players deleted and team rosters cleared."
      );
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to start auction");
      }
      setIsAuctionActive(true);
      setCurrentAuctionPlayerId(playerId);
      const startingPlayer = players.find((p) => String(p._id) === String(playerId));
      if (startingPlayer) {
        setLiveStagePlayer({ ...startingPlayer, status: "in_auction", bidHistory: [] });
      }
      setAuctionMessage("Player is now in auction!");
      setPlayers((prev) =>
        prev.map((p) => {
          if (p._id === playerId) return { ...p, status: "in_auction", bidHistory: [] };
          if (p.status === "in_auction") return { ...p, status: "unsold", bidHistory: [] };
          return p;
        })
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
      const playerObj = players.find((p) => String(p._id) === String(playerId));
      let teamId = playerObj?.team?._id || (typeof playerObj?.team === "string" ? playerObj.team : null);
      let finalBid = playerObj?.finalBidPrice != null ? Number(playerObj.finalBidPrice) : null;

      if ((!teamId || finalBid == null) && Array.isArray(playerObj?.bidHistory) && playerObj.bidHistory.length > 0) {
        const topBid = playerObj.bidHistory[playerObj.bidHistory.length - 1];
        if (!teamId) teamId = topBid.team?._id || topBid.team;
        if (finalBid == null) finalBid = Number(topBid.bidAmount);
      }

      // If still missing teamId or finalBid, check current live player directly from server
      if (!teamId || finalBid == null) {
        try {
          const curRes = await fetch(`${API_URL}/api/v1/auction/current`);
          if (curRes.ok) {
            const curData = await curRes.json();
            const curPlayer = curData?.data?.player;
            if (curPlayer && String(curPlayer._id) === String(playerId)) {
              if (!teamId) teamId = curPlayer.team?._id || (typeof curPlayer.team === "string" ? curPlayer.team : null);
              if (finalBid == null && curPlayer.finalBidPrice != null) finalBid = Number(curPlayer.finalBidPrice);
              if ((!teamId || finalBid == null) && Array.isArray(curPlayer.bidHistory) && curPlayer.bidHistory.length > 0) {
                const topBid = curPlayer.bidHistory[curPlayer.bidHistory.length - 1];
                if (!teamId) teamId = topBid.team?._id || topBid.team;
                if (finalBid == null) finalBid = Number(topBid.bidAmount);
              }
            }
          }
        } catch (_) {}
      }

      if (!teamId || finalBid == null) {
        throw new Error("No bids have been placed for this player. Use 'Mark Unsold' instead.");
      }

      const payload = {
        playerId,
        teamId,
        finalBid,
        finalBidPrice: finalBid,
      };

      const res = await fetch(`${API_URL}/api/v1/auction/sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to sell player");
      }
      const resData = await res.json();
      const soldPlayer = resData?.data?.player;
      setCurrentAuctionPlayerId(null);
      setLiveStagePlayer(null);
      setIsAuctionActive(false);
      setAuctionMessage(`Player ${soldPlayer?.name || playerObj?.name || ""} successfully sold!`);
      setPlayers((prev) =>
        prev.map((p) =>
          String(p._id) === String(playerId)
            ? {
                ...p,
                ...(soldPlayer || {}),
                status: "sold",
                team: soldPlayer?.team || teamId,
                teamName: soldPlayer?.teamName || "Sold",
                finalBidPrice: finalBid,
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
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to mark player unsold");
      }
      setCurrentAuctionPlayerId(null);
      setLiveStagePlayer(null);
      setIsAuctionActive(false);
      setAuctionMessage("Player marked as unsold.");
      setPlayers((prev) =>
        prev.map((p) =>
          p._id === playerId
            ? { ...p, status: "unsold", markedUnsold: true, bidHistory: [] }
            : p
        )
      );
    } catch (err) {
      setAuctionMessage(err.message || "Failed to mark player as unsold");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Derive player pools for the selected year
  const availablePlayers = players.filter(
    (p) => p.status === "unsold" && !p.markedUnsold
  );
  const unsoldPool = players.filter(
    (p) => p.status === "unsold" && p.markedUnsold
  );
  const inAuctionPlayers = players.filter((p) => p.status === "in_auction");
  const soldPlayers = players.filter((p) => p.status === "sold");

  const nonSoldPlayers = players.filter((p) => p.status !== "sold");

  // Random player draw logic
  const handleDrawRandomPlayer = () => {
    if (availablePlayers.length === 0 || currentAuctionPlayerId !== null) return;
    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    setDrawnPlayer(availablePlayers[randomIndex]);
    setIsRandomDrawModalOpen(true);
  };

  const handleDrawAnother = () => {
    if (availablePlayers.length <= 1) return;
    const others = availablePlayers.filter(
      (p) => String(p._id) !== String(drawnPlayer?._id)
    );
    if (others.length === 0) return;
    const randomIndex = Math.floor(Math.random() * others.length);
    setDrawnPlayer(others[randomIndex]);
  };

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pt-2 pb-10 space-y-4 sm:space-y-5">
      {/* Page Header */}
      <div className="glass-card p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white tracking-wide">
              Auction Control Panel
            </h2>
            <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">
              Manage players, control the auction flow, and track bids in
              real-time.
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: "Available",
              value: availablePlayers.length,
              color: "text-cyan-400",
            },
            {
              label: "In Auction",
              value: inAuctionPlayers.length,
              color: "text-amber-400",
            },
            {
              label: "Sold",
              value: soldPlayers.length,
              color: "text-emerald-400",
            },
            {
              label: "Unsold Pool",
              value: unsoldPool.length,
              color: "text-rose-400",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card p-2.5 sm:p-3 text-center border-white/[0.07]"
            >
              <p className={`text-lg sm:text-2xl font-black ${s.color}`}>
                {s.value}
              </p>
              <p className="text-[9px] sm:text-[10px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Manage Captains */}
          <button
            onClick={() => setIsCaptainsModalOpen(true)}
            className="glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 hover:border-amber-400/60 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
            type="button"
            title="Assign captains for the 4 teams"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Captains</span>
          </button>

          {/* Upload CSV */}
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/25 hover:border-cyan-500/45 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            type="button"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Upload Players</span>
          </button>

          {/* Delete All */}
          <button
            onClick={() => setIsDeleteAllConfirmOpen(true)}
            className="glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 hover:border-rose-500/45 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            type="button"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Clear All Players</span>
          </button>

          <div className="flex-1 hidden sm:block" />

          {/* Auction In-Progress Banner (replaces Start when player is live) */}
          {currentAuctionPlayerId && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              Auction in progress
            </div>
          )}

          {/* Pause / Resume Session */}
          <button
            onClick={handleToggleAuctionStatus}
            disabled={statusToggling}
            className={`glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
                <span>Start Session</span>
              </>
            )}
          </button>

          {/* Reset Auction */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="glass-btn px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/25 hover:border-rose-500/45 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
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

      {!loading && !error && selectedYear != null && (
        <>
          {/* Available + In Auction pool */}
          {nonSoldPlayers.filter((p) => !p.markedUnsold).length === 0 &&
          inAuctionPlayers.length === 0 ? (
            <div className="glass-card p-8 text-center text-white/50 text-xs">
              No available players remaining for this academic year.
            </div>
          ) : (
            <PlayerTable
              players={players.filter((p) => p.status !== "sold" && !p.markedUnsold)}
              onStartAuction={handleStartAuction}
              onSellPlayer={handleSellPlayer}
              onMarkUnsold={handleMarkUnsold}
              onDeletePlayer={handleDeletePlayer}
              actionLoadingId={actionLoadingId}
              deletingPlayerId={deletingPlayerId}
              currentAuctionPlayerId={currentAuctionPlayerId}
              tableTitle="Available Pool"
            />
          )}

          {/* Unsold Pool (permanently marked unsold) */}
          {unsoldPool.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-widest">
                  Unsold Pool ({unsoldPool.length})
                </h3>
                <p className="text-[10px] text-white/30 ml-1">
                  — These players won't re-enter the auction
                </p>
              </div>
              <PlayerTable
                players={unsoldPool}
                onStartAuction={null}
                onSellPlayer={null}
                onMarkUnsold={null}
                onDeletePlayer={handleDeletePlayer}
                actionLoadingId={actionLoadingId}
                deletingPlayerId={deletingPlayerId}
                currentAuctionPlayerId={currentAuctionPlayerId}
                isUnsoldPool={true}
                tableTitle="Unsold Pool"
              />
            </div>
          )}
        </>
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
                <h3 className="text-lg font-black text-white">
                  Reset Entire Auction?
                </h3>
                <p className="text-xs text-white/50">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              Resetting will clear all current bid histories, mark all
              auctioned non-captain players back to{" "}
              <strong>Available</strong>, and restore all team budgets to{" "}
              <strong>100 Points</strong>.
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
                <h3 className="text-lg font-black text-white">
                  Delete All Players?
                </h3>
                <p className="text-xs text-white/50">Permanent pool wipe</p>
              </div>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              This will permanently delete{" "}
              <strong>all non-captain players</strong> from the database and
              reset team rosters. Captains will be preserved.
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
