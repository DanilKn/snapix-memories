import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Frame } from "@/components/snapix/Frame";
import { BackLink, Dots, PillButton } from "@/components/snapix/ui";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Set up — Snapix" }] }),
  component: Setup,
});

const moods = [
  { icon: "◐", label: "Wedding" },
  { icon: "✦", label: "Birthday" },
  { icon: "❍", label: "Baby shower" },
  { icon: "△", label: "Trip" },
  { icon: "▢", label: "Company night" },
  { icon: "✕", label: "Something else" },
];

function Setup() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const navigate = useNavigate();

  const next = () => (step < 2 ? setStep(step + 1) : navigate({ to: "/create" }));

  return (
    <Frame>
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-4 flex items-center justify-between">
          {step > 0 ? <button onClick={() => setStep(step - 1)} className="h-9 w-9 rounded-full bg-elevated/80 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button> : <BackLink to="/signin" />}
          <Dots count={3} active={step} />
          <span className="w-9" />
        </div>

        <div className="flex-1 px-7 pt-8">
          {step === 0 && (
            <>
              <h1 className="font-display italic text-[30px] leading-tight">First, who's directing?</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Snapix opens with the host. Add a name your guests will recognise.</p>
              <div className="mt-10 flex justify-center">
                <button className="h-28 w-28 rounded-full bg-elevated border border-white/10 flex items-center justify-center text-3xl text-muted-foreground">+</button>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-8 w-full h-12 rounded-xl bg-elevated border border-white/10 px-4 text-[15px] outline-none focus:border-white/30"
              />
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="font-display italic text-[30px] leading-tight">What kind of night is this?</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Pick a mood for your first film. You can change it later.</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {moods.map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setMood(m.label)}
                    className={`h-24 rounded-2xl bg-elevated p-4 text-left flex flex-col justify-between border ${mood === m.label ? "border-white" : "border-white/8"}`}
                  >
                    <span className="text-accent text-xl font-display">{m.icon}</span>
                    <span className="text-[14px]">{m.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="font-display italic text-[30px] leading-tight">Don't miss the moment.</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">We'll only ping you when guests join, when the film opens, and when the reel is ready.</p>
              <div className="mt-8 rounded-3xl bg-elevated border border-white/10 p-6">
                <div className="rounded-2xl bg-background/70 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center text-accent">◎</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">Snapix</p>
                      <p className="text-[12px] text-muted-foreground">3 friends just joined the film.</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">now</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent/20 flex items-center justify-center text-accent">◎</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-medium">Snapix</p>
                      <p className="text-[12px] text-muted-foreground">Your reel is developing.</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">23m</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-7 py-6 flex gap-3">
          {step === 2 && <Link to="/create" className="flex-1 h-12 rounded-full border border-white/15 flex items-center justify-center text-[14px]">Not now</Link>}
          <PillButton onClick={next} className={step === 2 ? "flex-1" : "ml-auto"}>
            {step === 2 ? "Turn on notifications" : "Continue"}
          </PillButton>
        </div>
      </div>
    </Frame>
  );
}
