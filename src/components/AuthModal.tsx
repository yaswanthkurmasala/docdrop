"use client";

import React, { useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Key,
  Loader2,
} from "lucide-react";
import { motionTokens } from "@/lib/motion-tokens";
import { useAuth } from "@/context/AuthContext";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "signup";
  onOpenLicenseModal?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  initialTab = "login",
  onOpenLicenseModal,
}: AuthModalProps) {
  const [tabOverride, setTabOverride] = useState<"login" | "signup" | null>(null);
  const tab = tabOverride ?? initialTab;
  const setTab = (next: "login" | "signup") => setTabOverride(next);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleClose = () => {
    setTabOverride(null);
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  const { loginWithSocial, loginWithEmail, signupWithEmail, loginAsGuest, isLoading } = useAuth();

  const handleSocialLogin = async (provider: "google" | "github") => {
    setError(null);
    try {
      await loginWithSocial(provider);
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      handleClose();
    } catch (err: any) {
      setError(err?.message || "Failed to sign in with provider.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      if (tab === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(name || "DocDrop Member", email, password);
      }
      setSuccessMsg(tab === "login" ? "Welcome back!" : "Account created successfully!");
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please try again.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={motionTokens.spring.snappy}
            className="relative z-10 w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-zinc-900 dark:text-zinc-100"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 font-mono mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% In-Browser Privacy
              </div>
              <h3 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">
                {tab === "login" ? "Welcome back" : "Create your account"}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {tab === "login"
                  ? "Access your Pro features, sync passes, and history."
                  : "Join thousands converting documents privately in RAM."}
              </p>
            </div>

            {/* Tab Switcher (Log In vs Sign Up) */}
            <div className="relative isolate flex p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 mb-5">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setError(null);
                }}
                className={`relative flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  tab === "login"
                    ? "text-zinc-950 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {tab === "login" && (
                  <motion.div
                    layoutId="authTabPill"
                    transition={motionTokens.spring.snappy}
                    className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xs -z-10"
                  />
                )}
                Log In
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setError(null);
                }}
                className={`relative flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  tab === "signup"
                    ? "text-zinc-950 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {tab === "signup" && (
                  <motion.div
                    layoutId="authTabPill"
                    transition={motionTokens.spring.snappy}
                    className="absolute inset-0 bg-white dark:bg-zinc-900 rounded-xl shadow-xs -z-10"
                  />
                )}
                Sign Up
              </button>
            </div>

            {/* 1-Click Social Sign-In Buttons */}
            <div className="space-y-2.5 mb-5">
              {/* Google Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* GitHub Button */}
              <button
                type="button"
                onClick={() => handleSocialLogin("github")}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>Continue with GitHub</span>
              </button>

              {/* Guest Session Button */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginAsGuest();
                    handleClose();
                  } catch (err: any) {
                    setError(err?.message || "Guest session initialization failed.");
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <span>⚡ Continue as Anonymous Guest</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
              <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-mono">
                or with email
              </span>
              <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {tab === "signup" && (
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-mono">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
                    className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
                    Password
                  </label>
                  {tab === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        if (!email.trim() || !email.includes("@")) {
                          setError("Enter your email address above first, then click Forgot password.");
                          return;
                        }
                        setSuccessMsg(`If an account exists for ${email.trim()}, check your inbox or use Continue with Google.`);
                      }}
                      className="text-[11px] text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-10 pr-10 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
                  <p>{error}</p>
                  {error.includes("Sign Up") && tab === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("signup");
                        setError(null);
                      }}
                      className="mt-1.5 font-bold underline hover:no-underline cursor-pointer block text-rose-900 dark:text-rose-100"
                    >
                      Switch to Sign Up tab &rarr;
                    </button>
                  )}
                  {error.includes("Log In") && tab === "signup" && (
                    <button
                      type="button"
                      onClick={() => {
                        setTab("login");
                        setError(null);
                      }}
                      className="mt-1.5 font-bold underline hover:no-underline cursor-pointer block text-rose-900 dark:text-rose-100"
                    >
                      Switch to Log In tab &rarr;
                    </button>
                  )}
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : tab === "login" ? (
                  <>
                    <span>Sign In to DocDrop</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-500 shrink-0" />
                  </>
                )}
              </button>
            </form>

            {/* Direct License Key Bypass (Privacy Purists) */}
            {onOpenLicenseModal && (
              <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenLicenseModal();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white font-medium transition-colors cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Have a License Key? Activate directly without account &rarr;</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
