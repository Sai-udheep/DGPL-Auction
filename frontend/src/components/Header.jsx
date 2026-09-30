import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContextCore";
import { LogOut, LogIn, LayoutDashboard, Radio, Shield } from "lucide-react";
import MyTeamModal from "./MyTeamModal";

function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const isOnAdmin = location.pathname.startsWith("/admin");
  const [isMyTeamOpen, setIsMyTeamOpen] = useState(false);

  const isCaptain = user?.role === "captain" || Boolean(user?.team);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <header className="sticky top-2 z-40 px-2 sm:px-4 max-w-6xl mx-auto w-full mb-3">
        <div className="header-island px-3 py-2 sm:px-5 sm:py-3 flex items-center justify-between gap-2 min-h-[52px]">
          {/* Brand Title */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none shrink-0"
          >
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500/25 via-orange-500/25 to-cyan-500/25 border border-white/15 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200 shrink-0">
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="font-brand text-white text-sm sm:text-xl font-extrabold tracking-wider leading-none flex items-center gap-1">
                <span>DGPL</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
                  AUCTION
                </span>
              </h1>
              <p className="text-[8px] sm:text-[10px] font-semibold text-white/40 tracking-widest uppercase mt-0.5 hidden xs:block">
                Live Bidding Arena
              </p>
            </div>
          </div>

          {/* Right Side Navigation / Actions (Strictly single line, flex-nowrap) */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
              {/* User status badge */}
              <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-[10px] sm:text-xs font-medium text-white/70 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="hidden md:inline">Signed in as </span>
                <strong className="text-white font-semibold">
                  {user?.name ? (user.role === "admin" ? "Admin" : user.name.split(" ")[0]) : "User"}
                </strong>
              </div>

              {/* Captain: My Team button */}
              {isCaptain && (
                <button
                  onClick={() => setIsMyTeamOpen(true)}
                  className="glass-btn px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 hover:border-amber-400/60 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-sm"
                  type="button"
                  title="View your squad composition and remaining purse"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>My Team</span>
                </button>
              )}

              {/* Admin / Live toggle button */}
              {user?.role === "admin" && (
                <button
                  onClick={() => navigate(isOnAdmin ? "/" : "/admin")}
                  className="glass-btn px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-white/90 bg-white/[0.08] hover:bg-white/[0.14] flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  type="button"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden xs:inline">{isOnAdmin ? "Live Auction" : "Admin Panel"}</span>
                  <span className="inline xs:hidden">{isOnAdmin ? "Live" : "Admin"}</span>
                </button>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="glass-btn p-1.5 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 hover:border-rose-500/40 flex items-center gap-1 cursor-pointer shrink-0"
                type="button"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="glass-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-500/30 hover:border-amber-400/50 flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
              type="button"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Captain's Team & Purse Modal */}
      {isCaptain && (
        <MyTeamModal
          isOpen={isMyTeamOpen}
          onClose={() => setIsMyTeamOpen(false)}
        />
      )}
    </>
  );
}

export default Header;
