import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/authContextCore";
import { Shield, LogOut, LogIn, LayoutDashboard, Radio } from "lucide-react";

function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const isOnAdmin = location.pathname.startsWith("/admin");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const firstName = user?.name ? user.name.split(" ")[0] : "User";

  return (
    <header className="sticky top-3 z-40 px-4 max-w-6xl mx-auto w-full mb-2">
      <div className="header-island px-5 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between">
        {/* Brand Title */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-cyan-500/20 border border-white/15 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
            <Radio className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h1 className="font-brand text-white text-lg sm:text-xl font-extrabold tracking-wider leading-none flex items-center gap-1.5">
              <span>DGPL</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
                AUCTION
              </span>
            </h1>
            <p className="text-[10px] font-semibold text-white/40 tracking-widest uppercase mt-0.5">
              Live Bidding Arena
            </p>
          </div>
        </div>

        {/* Right Side Navigation / Actions */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User greeting pill */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-medium text-white/70">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Signed in as <strong className="text-white font-semibold">{user?.name || "User"}</strong>
              </span>
            </div>

            {/* Admin Panel toggle button */}
            {user?.role === "admin" && (
              <button
                onClick={() => navigate(isOnAdmin ? "/" : "/admin")}
                className="glass-btn px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white/90 bg-white/[0.08] hover:bg-white/[0.14] flex items-center gap-1.5 cursor-pointer"
                type="button"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
                <span>{isOnAdmin ? "Live Auction" : "Admin Panel"}</span>
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="glass-btn px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-white/80 bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/40 flex items-center gap-1.5 cursor-pointer"
              type="button"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden xs:inline">Logout</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="glass-btn px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-500/30 hover:border-amber-400/50 flex items-center gap-2 shadow-sm cursor-pointer"
            type="button"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default Header;
