import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import { formatAcademicYear } from "../utils/formatters";
import CurrentPlayerSkeleton from "./CurrentPlayerSkeleton";
import { Flame, Coins, Shield, Clock } from "lucide-react";

const BidErrorListener = ({ socket }) => {
  React.useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      console.warn("[Bid][Client] server:bid_error", payload);
    };
    socket.on("server:bid_error", handler);
    return () => socket.off("server:bid_error", handler);
  }, [socket]);
  return null;
};

const CurrentPlayer = ({ player: livePlayer, teams = [] }) => {
  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket() || {};
  const [loading, setLoading] = useState(!livePlayer);

  const player = livePlayer;

  useEffect(() => {
    if (livePlayer) setLoading(false);
    else setLoading(false);
  }, [livePlayer]);

  const sortedBids = useMemo(() => {
    if (!player?.bidHistory) return [];
    return [...player.bidHistory].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [player]);

  if (loading) return <CurrentPlayerSkeleton />;

  if (!player) {
    return (
      <div className="glass-card p-12 text-center max-w-lg w-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-white/40 animate-pulse">
          <Clock className="w-6 h-6 text-amber-400/60" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-wide">Waiting for Next Player</h3>
          <p className="text-xs text-white/50 mt-1">The auctioneer will begin the next bidding round shortly.</p>
        </div>
      </div>
    );
  }

  const { name, image, category, year } = player;
  const currentBidRaw = player.finalBidPrice ?? player.basePrice ?? null;
  const currentBid = currentBidRaw != null ? Number(currentBidRaw) : null;
  const leadingTeamName = player.teamName || (player.team?.name) || "";

  const computeNextBidAmount = (amount) => {
    if (amount == null) return null;
    const n = Number(amount);
    if (Number.isNaN(n)) return null;
    let inc;
    if (n < 5) inc = 0.25;
    else if (n < 10) inc = 0.5;
    else inc = 1;
    return Number((n + inc).toFixed(2));
  };

  const hasBids = sortedBids.length > 0;
  let nextBidNumeric = null;
  if (!hasBids) {
    nextBidNumeric =
      typeof player.basePrice === "number"
        ? Number(player.basePrice)
        : player.basePrice != null
        ? Number(player.basePrice)
        : null;
  } else {
    const basisAmount = Number(sortedBids[0]?.bidAmount ?? currentBid);
    nextBidNumeric =
      basisAmount != null && !Number.isNaN(basisAmount)
        ? computeNextBidAmount(basisAmount)
        : null;
  }

  const nextBidAmount =
    nextBidNumeric != null
      ? nextBidNumeric.toFixed(2).replace(/\.00$/, "")
      : null;

  const isTeamOwner =
    isAuthenticated &&
    (user?.role === "team-owner" || user?.role === "captain");

  const handleBid = () => {
    if (!socket || !player?._id) return;
    try {
      socket.emit("captain:place_bid", { playerId: player._id });
    } catch (e) {
      console.error("Bid emit failed", e);
    }
  };

  const latestBid = sortedBids[0];
  const userTeamId = user?.team?._id || user?.team;
  const leadingBidTeamId =
    latestBid?.team?._id ||
    latestBid?.team ||
    player?.team?._id ||
    player?.team;
  const isLeadingTeam = Boolean(
    userTeamId && leadingBidTeamId && String(userTeamId) === String(leadingBidTeamId)
  );

  const fullUserTeam = teams.find(
    (t) => String(t._id || t.id) === String(userTeamId || "")
  );
  const userTeamBudget = fullUserTeam?.budget ?? user?.team?.budget ?? null;
  const isOutOfBudget =
    isTeamOwner &&
    nextBidNumeric != null &&
    typeof userTeamBudget === "number" &&
    userTeamBudget < nextBidNumeric;

  const getCategoryColor = (cat) => {
    switch (cat) {
      case "Batsman":
        return "from-indigo-500/20 to-blue-500/20 text-indigo-300 border-indigo-500/30";
      case "Bowler":
        return "from-cyan-500/20 to-teal-500/20 text-cyan-300 border-cyan-500/30";
      case "All-Rounder":
        return "from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30";
      case "Wicket-Keeper":
        return "from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30";
      default:
        return "from-white/10 to-white/5 text-white/80 border-white/15";
    }
  };

  return (
    <div className="glass-card max-w-md w-full overflow-hidden flex flex-col">
      {socket && <BidErrorListener socket={socket} />}

      {/* Image Preview with Aspect Ratio */}
      {image && (
        <div className="aspect-[3/4] w-full overflow-hidden bg-black/40 relative border-b border-white/[0.08] group">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              e.target.src = `https://via.placeholder.com/300x400?text=${encodeURIComponent(name)}`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06070a]/90 via-transparent to-transparent opacity-80" />

          {/* Live In-Auction Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-amber-300 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>IN AUCTION</span>
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className="p-6 space-y-5">
        {/* Category & Academic Year */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-gradient-to-r border ${getCategoryColor(category)}`}>
            {category}
          </span>
          {year && <span className="text-white/30">•</span>}
          {year && (
            <span className="text-xs font-semibold text-white/60">
              {formatAcademicYear(year)}
            </span>
          )}
        </div>

        {/* Player Name */}
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-wide font-brand">
          {name}
        </h2>

        {/* Current Bid Display Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-inner space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">
              Current Bid
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">
              Base Price: {player.basePrice != null ? `${player.basePrice} Pts` : "-"}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight leading-none">
                {currentBid != null ? currentBid : "--"}
              </span>
              <span className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
                Pts
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-white/40 block">
                Holding Team
              </span>
              <span className="text-sm font-bold text-white truncate max-w-[150px] inline-block">
                {leadingTeamName || "No Bids Yet"}
              </span>
            </div>
          </div>

          {/* Budget status if Team Captain */}
          {isTeamOwner && (
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-white/50">Your Team Purse:</span>
              <span className={`font-bold ${isOutOfBudget ? "text-rose-400" : "text-emerald-400"}`}>
                {typeof userTeamBudget === "number"
                  ? `${userTeamBudget.toFixed(2).replace(/\.00$/, "")} Pts`
                  : "-"}
              </span>
            </div>
          )}
        </div>

        {/* Bid History Stream */}
        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-white/45 font-bold mb-2.5 flex items-center justify-between">
            <span>Bid Stream</span>
            <span className="text-white/30 font-normal">{sortedBids.length} bids</span>
          </h3>

          {sortedBids.length === 0 ? (
            <p className="text-white/40 text-xs italic py-2">First bid will open at base price.</p>
          ) : (
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scroll">
              {sortedBids.map((bid, index) => {
                const isLatest = index === 0;
                return (
                  <li
                    key={bid._id || bid.timestamp || index}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                      isLatest
                        ? "bg-white/[0.08] border-white/20 text-white shadow-sm"
                        : "bg-white/[0.02] border-white/[0.05] text-white/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {isLatest && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      <span>{bid.teamName || "Team"}</span>
                    </span>
                    <span className="font-extrabold text-emerald-400">
                      {bid.bidAmount} Pts
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Place Bid Action (Captains only) */}
        {isTeamOwner && (
          <div className="pt-2">
            <button
              onClick={!isLeadingTeam && !isOutOfBudget ? handleBid : undefined}
              disabled={isLeadingTeam || isOutOfBudget}
              className={`w-full py-3.5 px-5 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 focus:outline-none shadow-lg cursor-pointer ${
                isLeadingTeam
                  ? "bg-white/[0.06] text-white/40 border border-white/10 cursor-not-allowed"
                  : isOutOfBudget
                  ? "bg-rose-500/10 text-rose-300 border border-rose-500/30 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 hover:brightness-110 active:scale-[0.98] shadow-amber-500/20"
              }`}
              type="button"
            >
              <span>
                {isLeadingTeam
                  ? "Holding Highest Bid"
                  : isOutOfBudget
                  ? "Insufficient Funds"
                  : "Place Bid"}
              </span>
              {!isLeadingTeam && nextBidAmount && !isOutOfBudget && (
                <span className="px-2.5 py-0.5 rounded-lg bg-black/20 text-slate-950 font-black text-xs">
                  {nextBidAmount} Pts
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrentPlayer;
