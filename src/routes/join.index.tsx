import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Frame, ApertureLogo } from "@/components/snapix/Frame";
import grain from "@/assets/film-grain.jpg";

export const Route = createFileRoute("/join/")({
  head: () => ({ meta: [{ title: "Join — Snapix" }] }),
  component: JoinFallback,
});

function JoinFallback() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    const trimmed = code.trim();
    if (trimmed) {
      navigate({ to: `/join/${trimmed}` });
    }
  };

  return (
    <Frame>
      <img
        src={grain}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black" />

      <div className="relative z-10 flex flex-col min-h-screen px-7 py-10 justify-between">
        <div />

        <div className="flex flex-col items-center text-center">
          <ApertureLogo size={48} className="text-accent" />
          <h1 className="mt-6 font-display italic text-[34px] leading-tight text-white">
            Join an Event
          </h1>
          <p className="mt-3 text-[14px] text-white/45 max-w-[260px]">
            Enter your invite code or scan the QR code in the Snapix app.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Enter invite code"
            id="invite-code-input"
            className="w-full h-14 px-5 rounded-full bg-white/10 text-white text-[15px] placeholder:text-white/30 outline-none border border-white/5 focus:border-white/20 transition text-center tracking-[0.15em] uppercase"
          />
          <button
            onClick={handleJoin}
            disabled={!code.trim()}
            id="join-submit"
            className="w-full h-14 rounded-full bg-white text-black text-[15px] font-bold flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Join Event
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>

          <p className="text-center text-[12px] text-white/30 pt-2">
            Don't have a code?{" "}
            <a
              href="https://apps.apple.com/kz/app/snapix-%D0%BA%D0%B0%D0%BC%D0%B5%D1%80%D0%B0-%D0%BC%D0%BE%D0%BC%D0%B5%D0%BD%D1%82%D0%B0/id6788061353"
              target="_blank"
              rel="noreferrer"
              className="underline text-white/50"
            >
              Download Snapix
            </a>{" "}
            to create your own event.
          </p>
        </div>
      </div>
    </Frame>
  );
}
