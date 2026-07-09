import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Frame, ApertureLogo } from "@/components/snapix/Frame";
import { PillButton } from "@/components/snapix/ui";
import { signInAnonymously, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, appleProvider } from "@/lib/firebase";
import grain from "@/assets/film-grain.jpg";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [{ title: "Sign in — Snapix" }] }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGuestAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
      navigate({ to: "/setup" });
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate({ to: "/setup" });
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Google");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, appleProvider);
      navigate({ to: "/setup" });
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Apple");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Frame>
      <img src={grain} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background" />
      <div className="relative z-10 flex flex-col min-h-screen px-7 py-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <ApertureLogo size={48} className="text-accent" />
          <h1 className="mt-6 font-display italic text-[34px] leading-tight">
            Welcome to Snapix
          </h1>
          <p className="mt-3 text-[14px] text-muted-foreground max-w-[260px]">
            Start a film, or open the one a friend just sent you.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAppleAuth}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 h-[52px] px-6 rounded-full text-[15px] font-medium tracking-tight transition active:scale-[0.98] bg-white text-black disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-3 h-[52px] px-6 rounded-full text-[15px] font-medium tracking-tight transition active:scale-[0.98] bg-transparent text-white border border-white/20 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          
          {error && (
            <p className="text-center text-[12px] text-red-400 mt-2">
              {error}
            </p>
          )}

          <button 
            onClick={handleGuestAuth}
            disabled={loading}
            className="block w-full text-center text-[13px] text-muted-foreground underline underline-offset-2 pt-2 bg-transparent border-none outline-none cursor-pointer"
          >
            Skip — explore Snapix
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground leading-relaxed">
          By continuing you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </Frame>
  );
}
