import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { API_URL } from "../config";
import { ArrowLeft, Clock } from "lucide-react";

const formatAcademicYear = (yr) => {
  if (!yr) return "";
  const num = Number(yr);
  if (isNaN(num)) return yr;
  if (num === 1) return "1st Year";
  if (num === 2) return "2nd Year";
  if (num === 3) return "3rd Year";
  if (num === 4) return "4th Year";
  return `${num}th Year`;
};

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;
    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/v1/players/${playerId}`);
        if (!res.ok) throw new Error("Failed to fetch player details");
        const data = await res.json();
        if (!ignore) {
          setPlayer(data?.data?.player || data?.data?.doc || null);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load player profile");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchPlayer();
    return () => {
      ignore = true;
    };
  }, [playerId]);

  const sortedBids = useMemo(() => {
    if (!player || !Array.isArray(player.bidHistory)) return [];
    return [...player.bidHistory].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      if (timeA === timeB) {
        return (b.bidAmount || 0) - (a.bidAmount || 0);
      }
      return timeB - timeA;
    });
  }, [player]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-cyan-400 text-xs font-semibold animate-pulse tracking-widest uppercase">
          Loading player profile...
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 gap-4">
        <p className="text-rose-400 text-sm font-semibold">{error || "Player not found."}</p>
        <Link
          to="/"
          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline"
        >
          Back to Auction
        </Link>
      </div>
    );
  }

  const { name, image, category, year, status, finalBidPrice, isCaptain } = player;
  let leadingTeamName = player.team?.name || player.teamName || "";
  if (!leadingTeamName && sortedBids.length > 0) {
    leadingTeamName = sortedBids[0].teamName || leadingTeamName;
  }

  const wasSold = status === "sold" && typeof finalBidPrice === "number";
  const isRetained = !!isCaptain;

  return (
    <div className="min-h-screen py-8 max-w-4xl mx-auto px-4 relative z-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-white/80 bg-white/[0.06] hover:bg-white/[0.12] px-4 py-2 rounded-full border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Arena</span>
        </Link>

        {wasSold && !isRetained && (
          <div className="text-xs font-bold text-emerald-300 bg-emerald-500/10 rounded-full px-4 py-1.5 border border-emerald-500/30 flex items-baseline gap-1.5 shadow-sm">
            <span>Sold for</span>
            <span className="font-black text-emerald-400 text-sm">{finalBidPrice}</span>
            <span className="text-[10px] font-bold text-emerald-400">Pts</span>
          </div>
        )}

        {isRetained && (
          <div className="text-xs font-bold text-amber-300 bg-amber-500/10 rounded-full px-4 py-1.5 border border-amber-500/30 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Retained Captain</span>
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden flex flex-col md:flex-row">
        {image && (
          <div className="md:w-5/12 w-full bg-black/40 aspect-[3/4] md:aspect-auto overflow-hidden max-h-96 md:max-h-none border-b md:border-b-0 md:border-r border-white/[0.08]">
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover object-center"
              loading="lazy"
              onError={(e) => {
                e.target.src = `https://via.placeholder.com/300x400?text=${encodeURIComponent(name)}`;
              }}
            />
          </div>
        )}

        <div className="flex-1 p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2 font-brand">
                {name}
              </h1>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-white/60">
                <span className="uppercase px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-white font-bold">
                  {category}
                </span>
                {year && <span>•</span>}
                {year && <span>{formatAcademicYear(year)}</span>}
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {!isRetained && (
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                    status === "in_auction"
                      ? "border-amber-400/40 text-amber-300 bg-amber-500/10"
                      : status === "sold"
                      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                      : "border-white/10 text-white/50 bg-white/[0.02]"
                  }`}
                >
                  {status?.replace(/_/g, " ")}
                </span>
              )}
              {wasSold && (
                <div className="text-xs font-semibold text-white/60">
                  Team: <span className="text-white font-bold">{leadingTeamName || "-"}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
            <h3 className="text-[11px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Bid History</span>
            </h3>

            {sortedBids.length === 0 ? (
              <p className="text-white/40 text-xs italic">No bids recorded for this player.</p>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1 custom-scroll text-xs">
                {sortedBids.map((bid, index) => {
                  const isLatest = index === 0;
                  return (
                    <li
                      key={bid._id || bid.timestamp || index}
                      className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-colors border ${
                        isLatest
                          ? "bg-white/[0.08] border-white/20 text-white font-semibold"
                          : "bg-white/[0.02] border-white/[0.05] text-white/60"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isLatest && (
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        )}
                        <span>{bid.teamName || "Team"}</span>
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {bid.bidAmount} Pts
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfilePage;
