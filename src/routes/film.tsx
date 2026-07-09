import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Frame, BrandMark } from "@/components/snapix/Frame";
import { Toggle } from "@/components/snapix/ui";
import mountain from "@/assets/film-mountain.jpg";

export const Route = createFileRoute("/film")({
  head: () => ({ meta: [{ title: "Mira turns 30 — Snapix" }] }),
  component: Film,
});

function Film() {
  const [sheet, setSheet] = useState(false);
  const [share, setShare] = useState(true);
  return (
    <Frame>
      <img src={mountain} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/90" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="px-5 pt-5 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/home"
              aria-label="Back to home"
              className="h-10 w-10 rounded-full bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center text-foreground hover:bg-white/15 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <div>
              <BrandMark />
              <p className="font-display italic text-[22px] mt-1">Mira turns 30</p>
            </div>
          </div>
          <Link to="/invite" className="h-10 w-10 rounded-full bg-elevated/80 flex items-center justify-center backdrop-blur">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </Link>
        </div>

        <div className="flex-1" />

        <div className="px-7 pb-32">
          <div className="flex items-end gap-6 text-foreground">
            <div>
              <p className="font-display italic text-[24px] leading-none">0</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">Frames</p>
            </div>
            <div>
              <p className="font-display italic text-[24px] leading-none">15h</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">Until reveal</p>
            </div>
            <div>
              <p className="font-display italic text-[24px] leading-none">3</p>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">Cameras</p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Live
              </span>
            </div>
          </div>
        </div>

        {/* shutter + nav */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="flex justify-center pb-6">
            <Link to="/gallery" className="h-20 w-20 rounded-full bg-white/90 border-4 border-white/20 flex items-center justify-center active:scale-95 transition">
              <span className="h-16 w-16 rounded-full border-2 border-primary-foreground/30 bg-white" />
            </Link>
          </div>
          <div className="h-16 bg-background/80 backdrop-blur border-t border-white/5 grid grid-cols-4 text-[11px] text-muted-foreground">
            <Link to="/film" className="flex flex-col items-center justify-center gap-1 text-foreground"><span>◎</span>Film</Link>
            <Link to="/gallery" className="flex flex-col items-center justify-center gap-1"><span>▦</span>Reel</Link>
            <button onClick={() => setSheet(true)} className="flex flex-col items-center justify-center gap-1"><span>⚙</span>Film settings</button>
            <Link to="/settings" className="flex flex-col items-center justify-center gap-1"><span>☰</span>Profile</Link>
          </div>
        </div>

        {/* bottom sheet */}
        {sheet && (
          <div className="absolute inset-0 z-20 flex items-end" onClick={() => setSheet(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative w-full bg-surface rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-5" />
              <p className="font-display italic text-[22px] mb-5">Film settings</p>
              {[
                ["Name & cover", "Mira turns 30"],
                ["Develops", "Fri, May 29 · 11:00 PM"],
                ["Reveal", "After event"],
                ["Guests", "Up to 10"],
                ["Frames per guest", "24"],
              ].map(([k, v]) => (
                <button key={k} className="w-full flex items-center justify-between py-3 border-b border-white/5 text-left">
                  <span className="text-[14px]">{k}</span>
                  <span className="text-[13px] text-muted-foreground">{v} ›</span>
                </button>
              ))}
              <div className="flex items-center justify-between py-3">
                <span className="text-[14px]">Everyone sees the full reel</span>
                <Toggle on={share} onChange={setShare} />
              </div>
              <button className="w-full text-center text-destructive text-[14px] mt-4 py-3">Delete this film</button>
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}
