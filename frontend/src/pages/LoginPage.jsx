import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContextCore";
import { ArrowLeft, Lock, Mail, ShieldAlert } from "lucide-react";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data?.data?.user?.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center px-4 py-12 relative z-10">
      <div className="w-full max-w-md glass-card p-8 sm:p-10 relative overflow-hidden shadow-2xl">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border border-white/10 transition-all cursor-pointer mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-brand">
            Welcome Back
          </h1>
          <p className="text-xs text-white/50 mt-1.5 font-medium">
            Sign in to access team bidding & administration
          </p>
        </div>

        {/* Notice Badge */}
        <div className="mb-6 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 text-center font-medium">
          Authorized for <strong className="text-amber-300">Team Captains</strong> and{" "}
          <strong className="text-amber-300">Admins</strong> only.
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-[11px] font-bold text-white/60 uppercase tracking-wider"
            >
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl bg-black/40 border border-white/10 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 text-white px-4 py-3 text-xs placeholder-white/25 outline-none transition-all shadow-inner"
                placeholder="name@dgplauction.com"
              />
              <Mail className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 w-4 h-4 text-white/30" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-[11px] font-bold text-white/60 uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl bg-black/40 border border-white/10 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 text-white px-4 py-3 text-xs placeholder-white/25 outline-none transition-all shadow-inner"
                placeholder="••••••••"
              />
              <Lock className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 w-4 h-4 text-white/30" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-2xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer mt-2 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
