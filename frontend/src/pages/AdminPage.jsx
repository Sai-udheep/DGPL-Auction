import React, { useState, useEffect } from "react";
import YearSelector from "../components/admin/YearSelector";
import PlayerTable from "../components/admin/PlayerTable";
import { useSocket } from "../context/useSocket";
import { useAuth } from "../context/authContextCore";
import { API_URL } from "../config";
import { Shield, Sparkles } from "lucide-react";

const yearOptions = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

export default function AdminPage() {
  const [selectedYear, setSelectedYear] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [auctionMessage, setAuctionMessage] = useState(null);

  const { socket } = useSocket();
  const { token } = useAuth();

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

  useEffect(() => {
    if (!socket) return;
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

    socket.on("server:new_bid", handleNewBid);
    socket.on("new_player", handleNewPlayer);
    socket.on("server:player_sold", handlePlayerSold);
    socket.on("player_unsold", handlePlayerUnsold);
    socket.on("server:player_unsold", handlePlayerUnsold);

    return () => {
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
      <div>
        <h1 className="text-3xl font-black text-white tracking-wide font-brand">
          Admin Control Center
        </h1>
        <p className="text-xs text-white/50 mt-1">Manage tournament stages, initiate auctions, and close player sales</p>
      </div>

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
    </div>
  );
}
