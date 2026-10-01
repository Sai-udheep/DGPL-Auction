import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/authContextCore";
import { useSocket } from "../context/useSocket";
import { formatAcademicYear } from "../utils/formatters";
import CurrentPlayerSkeleton from "./CurrentPlayerSkeleton";
import { Clock, Radio, Sparkles, ShieldAlert, User } from "lucide-react";

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

const CurrentPlayer = ({ player: livePlayer, isAuctionActive = false, teams = [], tournamentTitle = "DGPL Season 11", tournamentMode = "Official Auction" }) => {
  const { isAuthenticated, user } = useAuth();
  const { socket } = useSocket() || {};
  const [loading, setLoading] = useState(!livePlayer && isAuctionActive);

  const player = livePlayer;

  useEffect(() => {
    setLoading(false);
  }, [livePlayer, isAuctionActive]);

  const sortedBids = useMemo(() => {
    if (!player?.bidHistory) return [];
    return [...player.bidHistory].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [player]);

  if (loading) return <CurrentPlayerSkeleton />;

  // 1. If auction is not currently active / paused (RED theme as requested)
  if (!isAuctionActive && !player) {
    return (
      <div className="glass-card p-10 sm:p-12 text-center max-w-lg w-full flex flex-col items-center justify-center space-y-5 shadow-2xl border-rose-500/30 bg-[#0e121c]/95 shadow-[0_0_40px_rgba(244,63,94,0.12)]">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-rose-500/25 via-red-500/15 to-transparent border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-inner">
            <Radio className="w-8 h-8" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-400/80 animate-ping" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 inline-block mb-2 shadow-sm">
            {tournamentTitle} • {tournamentMode.toUpperCase()} • PAUSED / STANDBY
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide font-brand">
            {tournamentMode === "Mock Auction" ? "Mock Auction on Standby" : "Auction Not in Session"}
          </h3>
          <p className="text-xs text-white/60 mt-2 leading-relaxed max-w-sm mx-auto font-medium">
            {tournamentMode === "Mock Auction"
              ? "Mock auction session is currently paused. Organizers will resume the practice round shortly."
              : "Live bidding is currently on hold. Organizers will open the session before bringing players to the stage."}
          </p>
        </div>

        <div className="pt-2 w-full max-w-xs">
          <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-[11px] text-rose-300/80 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Standing by — session will turn blue when active</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. If auction is active, but between players
  if (!player) {
    return (
      <div className="glass-card p-10 sm:p-12 text-center max-w-lg w-full flex flex-col items-center justify-center space-y-5 shadow-2xl border-cyan-500/20 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-transparent border border-cyan-400/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 inline-block mb-2 shadow-sm">
            {tournamentTitle} • {tournamentMode.toUpperCase()}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide font-brand">
            Awaiting Next Player to Take Stage
          </h3>
          <p className="text-xs text-white/60 mt-2 leading-relaxed max-w-sm mx-auto font-medium">
            The bidding floor is live! The auctioneer is drawing the next player to take the stage.
          </p>
        </div>
      </div>
    );
  }

  // 3. Active player in auction
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
    <div className="glass-card max-w-md w-full overflow-hidden flex flex-col shadow-2xl border-white/10">
      {socket && <BidErrorListener socket={socket} />}

      {/* ======================================================== */}
      {/* 1. MOBILE COMPACT VIEW (< sm): ZERO SCROLL, THUMB-READY  */}
      {/* ======================================================== */}
      <div className="sm:hidden p-3 space-y-2.5 w-full">
        {/* Player Snapshot: Large Photo + Details Side-by-Side */}
        <div className="flex items-stretch gap-3">
          {/* Prominent High-Impact Player Photo */}
          <div className="relative w-32 h-44 rounded-2xl overflow-hidden bg-black/50 border-2 border-white/20 shrink-0 shadow-xl group">
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  e.target.src = `https://via.placeholder.com/300x400?text=${encodeURIComponent(name)}`;
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <User className="w-12 h-12" />
              </div>
            )}
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[9px] font-black text-amber-300 border border-white/10 shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Details & Current Bid side-by-side with photo */}
          <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(category)}`}>
                  {category}
                </span>
                {year && (
                  <span className="text-[10px] font-bold text-white/50">
                    {formatAcademicYear(year)}
                  </span>
                )}
              </div>

              <h2 className="text-base font-black text-white leading-tight font-brand line-clamp-2 mt-1.5">
                {name}
              </h2>

              <p className="text-[11px] font-semibold text-white/40 mt-1">
                Base: <span className="text-white/80 font-bold">{player.basePrice != null ? `${player.basePrice} Pts` : "-"}</span>
              </p>
            </div>

            {/* Current Bid & Leading Team Snapshot */}
            <div className="p-2 rounded-xl bg-white/[0.05] border border-white/10 shadow-inner">
              <span className="text-[9px] uppercase font-bold text-white/40 block leading-none">
                Current Bid
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-emerald-400 leading-none">
                  {currentBid != null ? currentBid : "--"}
                </span>
                <span className="text-[11px] font-black text-emerald-300 uppercase">Pts</span>
              </div>
              <span className="text-[10px] font-bold text-white/80 truncate block mt-1">
                {leadingTeamName || "No Bids Yet"}
              </span>
            </div>
          </div>
        </div>

        {/* Captain Purse info */}
        {isTeamOwner && (
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-white/50 font-medium">Your Remaining Purse:</span>
            <span className={`font-black ${isOutOfBudget ? "text-rose-400" : "text-emerald-400"}`}>
              {typeof userTeamBudget === "number" ? `${userTeamBudget.toFixed(2).replace(/\.00$/, "")} Pts` : "-"}
            </span>
          </div>
        )}

        {/* Big Place Bid Action for Mobile Captains */}
        {isTeamOwner ? (
          <div>
            <button
              onClick={!isLeadingTeam && !isOutOfBudget ? handleBid : undefined}
              disabled={isLeadingTeam || isOutOfBudget}
              className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-xl cursor-pointer ${
                isLeadingTeam
                  ? "bg-white/[0.08] text-white/40 border border-white/10 cursor-not-allowed"
                  : isOutOfBudget
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30 cursor-not-allowed"
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
                <span className="px-2 py-0.5 rounded-lg bg-black/20 text-slate-950 font-black text-xs">
                  {nextBidAmount} Pts
                </span>
              )}
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center text-[10px] text-white/40">
            Sign in as Team Captain to place bids
          </div>
        )}

        {/* Mini Bid History (Last 2-3 bids, compact ticker) */}
        {sortedBids.length > 0 && (
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">
              Recent Bids ({sortedBids.length})
            </span>
            <div className="space-y-1 max-h-14 overflow-y-auto custom-scroll">
              {sortedBids.slice(0, 3).map((bid, index) => (
                <div
                  key={bid._id || bid.timestamp || index}
                  className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                    index === 0
                      ? "bg-white/[0.08] border-white/20 text-white"
                      : "bg-white/[0.02] border-white/[0.05] text-white/60"
                  }`}
                >
                  <span className="truncate max-w-[130px]">{bid.teamName || "Team"}</span>
                  <span className="font-extrabold text-emerald-400 shrink-0">{bid.bidAmount} Pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP / TABLET VIEW (hidden sm:block): FULL HEIGHT  */}
      {/* ======================================================== */}
      <div className="hidden sm:block">
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
    </div>
  );
};

export default CurrentPlayer;
