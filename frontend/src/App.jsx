import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Header from "./components/Header";
import NavTabs from "./components/NavTabs";
import CurrentPlayer from "./components/CurrentPlayer";
import SoldBanner from "./components/SoldBanner";
import UnsoldBanner from "./components/UnsoldBanner";
import AuctionSummary from "./components/AuctionSummary";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import { useSocket } from "./context/useSocket";
import { useAuth } from "./context/authContextCore";
import Toast from "./components/Toast";
import { API_URL } from "./config";

function App() {
  const [activeTab, setActiveTab] = useState("live");
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [isAuctionActive, setIsAuctionActive] = useState(false);
  const [tournamentTitle, setTournamentTitle] = useState("DGPL Season 11");
  const [tournamentMode, setTournamentMode] = useState("Official Auction");
  const [teams, setTeams] = useState([]);
  const [recentlySold, setRecentlySold] = useState(null);
  const [recentlyUnsold, setRecentlyUnsold] = useState(null);
  const [toasts, setToasts] = useState([]);

  const { socket, isConnected } = useSocket();
  const { isAuthenticated, user } = useAuth();

  // Socket event subscriptions
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewPlayer = (player) => {
      setRecentlySold(null);
      setRecentlyUnsold(null);
      setCurrentPlayer(player);
      setIsAuctionActive(true);
    };

    const handleNewBid = (payload) => {
      setIsAuctionActive(true);
      setCurrentPlayer((prev) => {
        if (!prev) {
          if (payload.player) return payload.player;
          return {
            _id: payload.playerId,
            finalBidPrice: payload.finalBidPrice,
            team: payload.leadingTeam?.id,
            teamName: payload.leadingTeam?.name,
            bidHistory: payload.latestBid ? [payload.latestBid] : [],
          };
        }
        let bidHistory = (payload.player?.bidHistory || prev.bidHistory || []).map((b) => ({
          ...b,
          teamName: b.team?.name || b.teamName || "Team",
        }));
        if (!payload.bidHistory && payload.latestBid) {
          const lb = payload.latestBid;
          const entry = {
            _id: lb.timestamp || Date.now(),
            team: lb.teamId,
            teamName: lb.teamName,
            bidAmount: lb.bidAmount,
            timestamp: lb.timestamp || Date.now(),
          };
          bidHistory = [...(prev.bidHistory || []), entry];
        }
        return {
          ...prev,
          bidHistory,
          finalBidPrice: payload.finalBidPrice ?? prev.finalBidPrice,
          team: payload.leadingTeam?.id || prev.team,
          teamName: payload.leadingTeam?.name || prev.teamName,
        };
      });
    };

    const handlePlayerSold = (payload) => {
      const p = payload?.player || payload;
      if (p) {
        setRecentlySold({
          name: p.name,
          teamName: p.teamName || p.team?.name || "-",
          amount: p.finalBidPrice,
          until: Date.now() + 10000,
        });
        setCurrentPlayer(null);
        setTimeout(() => {
          setRecentlySold((prev) => (prev && Date.now() > prev.until ? null : prev));
        }, 10500);
      }
      const winningTeam = payload?.team;
      if (winningTeam?.id) {
        setTeams((prev) => {
          const id = winningTeam.id;
          const idx = prev.findIndex((t) => t._id === id || t.id === id);
          const updatedTeam = {
            ...(idx >= 0 ? prev[idx] : {}),
            ...winningTeam,
            _id: id,
          };
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = updatedTeam;
            return clone;
          }
          return [...prev, updatedTeam];
        });
      }
    };

    const handlePlayerUnsold = (payload) => {
      const p = payload?.player || payload;
      if (p) {
        setRecentlyUnsold({ name: p.name, until: Date.now() + 8000 });
        setCurrentPlayer(null);
        setTimeout(() => {
          setRecentlyUnsold((prev) => (prev && Date.now() > prev.until ? null : prev));
        }, 8500);
      }
    };

    const handleAuctionStatusChanged = (payload) => {
      setIsAuctionActive(!!payload?.isAuctionActive);
    };

    const handleAuctionReset = () => {
      setCurrentPlayer(null);
      setRecentlySold(null);
      setRecentlyUnsold(null);
      setIsAuctionActive(false);
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message: "The auction session has been reset.", type: "info" },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    const handleBidError = (payload) => {
      const msg = payload?.message || "Bid failed";
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message: msg, type: "error" }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

        const handlePlayerWithdrawn = () => {
      setCurrentPlayer(null);
      setRecentlySold(null);
      setRecentlyUnsold(null);
      const id = Date.now();
      setToasts((prev) => [
        ...prev,
        { id, message: "Player has been safely returned to the pool.", type: "info" },
      ]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };

    const handleTournamentInfoChanged = (payload) => {
      if (payload?.tournamentTitle) setTournamentTitle(payload.tournamentTitle);
      if (payload?.tournamentMode) setTournamentMode(payload.tournamentMode);
    };

    socket.on("new_player", handleNewPlayer);
    socket.on("server:new_bid", handleNewBid);
    socket.on("player_sold", handlePlayerSold);
    socket.on("server:player_sold", handlePlayerSold);
    socket.on("server:bid_error", handleBidError);
    socket.on("player_unsold", handlePlayerUnsold);
    socket.on("server:player_unsold", handlePlayerUnsold);
    socket.on("server:auction_status_changed", handleAuctionStatusChanged);
    socket.on("server:auction_reset", handleAuctionReset);
    socket.on("server:player_withdrawn", handlePlayerWithdrawn);
    socket.on("server:tournament_info_changed", handleTournamentInfoChanged);

    return () => {
      socket.off("new_player", handleNewPlayer);
      socket.off("server:new_bid", handleNewBid);
      socket.off("player_sold", handlePlayerSold);
      socket.off("server:player_sold", handlePlayerSold);
      socket.off("server:bid_error", handleBidError);
      socket.off("player_unsold", handlePlayerUnsold);
      socket.off("server:player_unsold", handlePlayerUnsold);
      socket.off("server:auction_status_changed", handleAuctionStatusChanged);
      socket.off("server:auction_reset", handleAuctionReset);
      socket.off("server:player_withdrawn", handlePlayerWithdrawn);
      socket.off("server:tournament_info_changed", handleTournamentInfoChanged);
    };
  }, [socket, isConnected]);

  // Load current auction player & global auction status
  useEffect(() => {
    let ignore = false;
    const loadState = async () => {
      try {
        const currRes = await fetch(`${API_URL}/api/v1/auction/current`);
        if (currRes.ok) {
          const currData = await currRes.json();
          const incoming = currData?.data?.player;
          if (!ignore && incoming) {
            setCurrentPlayer(incoming);
            setIsAuctionActive(true);
          }
        }
      } catch {
        /* ignore */
      }
    };
    loadState();
    return () => {
      ignore = true;
    };
  }, []);

  // Load teams
  useEffect(() => {
    let abort = false;
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/teams`);
        if (!res.ok) return;
        const data = await res.json();
        const fetched = data?.data?.docs || data?.data?.teams || [];
        if (!abort && Array.isArray(fetched)) setTeams(fetched);
      } catch {
        /* ignore */
      }
    };
    fetchTeams();
    return () => {
      abort = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#06070a] text-white relative selection:bg-cyan-500/30">
      {/* Atmospheric Aurora Multi-Depth Layer */}
      <div className="aurora-layer" aria-hidden="true">
        <div className="aurora-blob aurora-blob--one" />
        <div className="aurora-blob aurora-blob--two" />
        <div className="aurora-blob aurora-blob--three" />
        <div className="aurora-blob aurora-blob--four" />
      </div>

      {/* Main App Container */}
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-full overflow-x-hidden min-w-0">
        {/* Toast Container */}
        {toasts.length > 0 && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-3 items-center w-full max-w-md px-4 pointer-events-none">
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto">
                <Toast message={t.message} type={t.type} />
              </div>
            ))}
          </div>
        )}

        <Header tournamentTitle={tournamentTitle} tournamentMode={tournamentMode} />

        <Routes>
          <Route
            path="/"
            element={
              <>
                <NavTabs activeTab={activeTab} onChange={setActiveTab} />
                <main
                  className={`container mx-auto px-2 sm:px-4 ${
                    activeTab === "live"
                      ? "max-h-[calc(100dvh-125px)] overflow-hidden sm:max-h-none sm:overflow-visible pb-2 sm:pb-20"
                      : "pb-20"
                  } max-w-6xl`}
                >
                  {activeTab === "live" && (
                    <div className="flex justify-center w-full">
                      {recentlySold && !currentPlayer ? (
                        <SoldBanner
                          name={recentlySold.name}
                          teamName={recentlySold.teamName}
                          amount={recentlySold.amount}
                        />
                      ) : recentlyUnsold && !currentPlayer ? (
                        <UnsoldBanner name={recentlyUnsold.name} />
                      ) : (
                        <CurrentPlayer
                          key={currentPlayer?._id || "no-player"}
                          player={currentPlayer || null}
                          isAuctionActive={isAuctionActive}
                          teams={teams}
                        />
                      )}
                    </div>
                  )}
                  {activeTab === "summary" && <AuctionSummary />}
                </main>
              </>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/player/:playerId" element={<PlayerProfilePage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin isAuthenticated={isAuthenticated} user={user} />
            }
          />
        </Routes>
      </div>
    </div>
  );
}

function RequireAdmin({ isAuthenticated, user }) {
  const location = useLocation();
  const isAdmin = isAuthenticated && user?.role === "admin";
  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <AdminPage />;
}

export default App;
