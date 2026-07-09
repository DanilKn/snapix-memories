import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame, ApertureLogo } from "@/components/snapix/Frame";
import mountain from "@/assets/film-mountain.jpg";
import sunset from "@/assets/film-sunset.jpg";
import grain from "@/assets/film-grain.jpg";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Snapix — Home" }] }),
  component: Home,
});

function Home() {
  const albumThumbs = [mountain, sunset, grain, mountain];
  return (
    <Frame>
      <div className="flex flex-col min-h-screen pb-28">
        {/* Top bar */}
        <div className="px-5 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ApertureLogo size={26} />
            <span className="font-display italic text-[28px] leading-none">Snapix</span>
          </div>
          <Link
            to="/join"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-elevated/80 text-[14px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <rect x="8" y="9" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Join
          </Link>
        </div>

        {/* ACTIVE */}
        <div className="mt-8 px-5">
          <p className="text-[11px] tracking-[0.25em] text-muted-foreground">ACTIVE</p>
        </div>
        <div className="px-5 mt-3">
          <Link
            to="/film"
            className="block relative rounded-3xl overflow-hidden aspect-[4/5] bg-elevated"
          >
            <img src={mountain} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30" />
            <div className="absolute top-5 left-5 right-5">
              <p className="font-display italic text-[28px] leading-tight text-white">mira's party</p>
              <div className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-white/80">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                15d 2h left
              </div>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="h-14 w-14 rounded-2xl bg-black/80 backdrop-blur flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 8h3l2-2h6l2 2h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="white" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="13" r="3.5" stroke="white" strokeWidth="2"/></svg>
              </span>
            </div>
          </Link>
        </div>

        {/* ALBUMS */}
        <div className="mt-8 px-5">
          <p className="text-[11px] tracking-[0.25em] text-muted-foreground">ALBUMS</p>
        </div>
        <div className="px-5 mt-4">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display italic text-[26px] leading-none">Welcome!</h2>
              <span className="text-[11px] font-medium tracking-wide text-primary bg-primary/15 px-2 py-1 rounded-md uppercase">Sample</span>
            </div>
            <span className="text-[12px] text-muted-foreground">May 6–12, 2026</span>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {albumThumbs.map((src, i) => (
              <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-elevated">
                <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                {i === albumThumbs.length - 1 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[18px] font-medium">+3</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-5 left-0 right-0 flex justify-center px-6">
          <div className="flex items-center gap-2 bg-elevated/90 backdrop-blur rounded-3xl px-3 py-2">
            <Link to="/home" className="flex flex-col items-center gap-0.5 px-5 py-2 text-foreground">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 6V4M11 6V4M15 6V4M19 6V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span className="text-[11px]">Films</span>
            </Link>
            <Link to="/create" className="h-14 w-14 rounded-2xl bg-white text-black flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
            </Link>
            <Link to="/settings" className="flex flex-col items-center gap-0.5 px-5 py-2 text-muted-foreground">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="5" r="1.5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="19" r="1.5" stroke="currentColor" strokeWidth="2"/><circle cx="5" cy="12" r="1.5" stroke="currentColor" strokeWidth="2"/><circle cx="19" cy="12" r="1.5" stroke="currentColor" strokeWidth="2"/></svg>
              <span className="text-[11px]">Setting</span>
            </Link>
          </div>
        </div>
      </div>
    </Frame>
  );
}