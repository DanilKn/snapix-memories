import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Frame } from "@/components/snapix/Frame";
import { BackLink, Dots, PillButton, Toggle } from "@/components/snapix/ui";
import mountain from "@/assets/film-mountain.jpg";
import sunset from "@/assets/film-sunset.jpg";

export const Route = createFileRoute("/create")({
  head: () => ({ meta: [{ title: "Create a film — Snapix" }] }),
  component: Create,
});

const monthDays = Array.from({ length: 31 }, (_, i) => i + 1);
const suggestions = ["Friday rooftop", "Mira turns 30", "Casa Verde weekend", "Nora & Sam"];
const cameras = [
  { id: "original", label: "Original 35mm", img: mountain, desc: "Soft contrast, real grain. Looks like a memory." },
  { id: "portrait", label: "Portrait", img: sunset, desc: "Warm halation around faces. Best for people-heavy nights." },
];

function Create() {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState(17);
  const [title, setTitle] = useState("");
  const [revealMode, setRevealMode] = useState<"during" | "after">("after");
  const [camera, setCamera] = useState("original");
  const [participants, setParticipants] = useState(10);
  const [shots, setShots] = useState(24);
  const [shareAll, setShareAll] = useState(true);
  const navigate = useNavigate();

  const steps = 6;
  const next = () => (step < steps - 1 ? setStep(step + 1) : navigate({ to: "/film" }));

  return (
    <Frame>
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-4 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="h-9 w-9 rounded-full bg-elevated/80 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          ) : <BackLink to="/setup" />}
          <Dots count={steps} active={step} />
          <span className="w-9" />
        </div>

        <div className="flex-1 px-7 pt-6 pb-4 overflow-y-auto">
          {step === 0 && (
            <>
              <h1 className="font-display italic text-[28px] leading-tight">When does the film open?</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Pick the night. We'll start the reel an hour before.</p>
              <div className="mt-8 rounded-2xl bg-elevated border border-white/10 p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display italic text-[18px]">May 2026</span>
                  <div className="flex gap-2">
                    <button className="h-7 w-7 rounded-full bg-background/60">‹</button>
                    <button className="h-7 w-7 rounded-full bg-background/60">›</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground mb-2">
                  {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center text-[13px]">
                  {monthDays.map((d) => (
                    <button key={d} onClick={() => setDate(d)} className={`h-9 mx-auto w-9 rounded-full flex items-center justify-center ${date === d ? "bg-white text-primary-foreground" : "text-foreground"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="font-display italic text-[28px] leading-tight">Give the film a name.</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Something your guests will smile at when the invite lands.</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled film"
                className="mt-6 w-full h-12 rounded-xl bg-elevated border border-white/10 px-4 text-[15px] outline-none focus:border-white/30"
              />
              <p className="mt-8 text-[11px] tracking-widest text-muted-foreground">SUGGESTIONS</p>
              <div className="mt-3 space-y-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setTitle(s)} className="w-full text-left h-12 rounded-xl bg-elevated px-4 text-[14px]">
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-display italic text-[28px] leading-tight">Design the invitation.</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">This is the cover guests see when they open the link.</p>
              <div className="mt-8 mx-auto w-[220px] aspect-[9/19] rounded-[36px] border-[6px] border-elevated overflow-hidden relative shadow-2xl">
                <img src={mountain} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-display italic text-[20px]">{title || "Your film"}</p>
                  <p className="text-[11px] text-muted-foreground">May {date}, 2026</p>
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-center">
                {(["Cover", "After", "Details"] as const).map((t, i) => (
                  <button key={t} className={`h-9 px-4 rounded-full text-[12px] ${i === 0 ? "bg-white text-primary-foreground" : "bg-elevated text-muted-foreground"}`}>{t}</button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="font-display italic text-[28px] leading-tight">When does the reel develop?</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Photos stay sealed until then — the surprise is the point.</p>
              <div className="mt-6 mx-auto w-[200px] aspect-[9/19] rounded-[32px] border-[6px] border-elevated overflow-hidden relative">
                <img src={sunset} alt="" className="absolute inset-0 h-full w-full object-cover blur-md scale-110 opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-background/60 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 10V8a6 6 0 1112 0v2M5 10h14v10H5V10z" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2 p-1 bg-elevated rounded-full">
                {(["during","after"] as const).map((m) => (
                  <button key={m} onClick={() => setRevealMode(m)} className={`flex-1 h-10 rounded-full text-[13px] capitalize ${revealMode === m ? "bg-white text-primary-foreground" : "text-muted-foreground"}`}>
                    {m === "during" ? "During event" : "After event"}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-elevated p-4 text-[14px]">
                Reel develops on <span className="font-display italic">May {date + 9}, 11:00 PM</span>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="font-display italic text-[28px] leading-tight">Choose the lens.</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Every guest shoots through the same one — that's what makes a film.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {cameras.map((c) => (
                  <button key={c.id} onClick={() => setCamera(c.id)} className={`rounded-2xl overflow-hidden border ${camera === c.id ? "border-white" : "border-white/10"}`}>
                    <div className="aspect-[3/4] relative">
                      <img src={c.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                    <div className="p-3 text-left bg-elevated">
                      <p className="text-[13px] font-medium">{c.label}</p>
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground leading-relaxed">
                {cameras.find((c) => c.id === camera)?.desc}
              </p>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="font-display italic text-[28px] leading-tight">Who's holding the camera?</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Set how many guests can shoot, and how many frames each one gets.</p>
              <div className="mt-6 flex gap-2 p-1 bg-elevated rounded-full">
                {[5, 10, 25].map((n) => (
                  <button key={n} onClick={() => setParticipants(n)} className={`flex-1 h-10 rounded-full text-[13px] ${participants === n ? "bg-white text-primary-foreground" : "text-muted-foreground"}`}>
                    Up to {n}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[11px] tracking-widest text-muted-foreground">FRAMES PER GUEST</p>
              <div className="mt-3 flex gap-2">
                {[10, 15, 24, 30, 36].map((n) => (
                  <button key={n} onClick={() => setShots(n)} className={`flex-1 h-12 rounded-full text-[13px] ${shots === n ? "bg-white text-primary-foreground" : "bg-elevated text-foreground"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <div>
                  <p className="text-[14px]">Everyone sees the full reel</p>
                  <p className="text-[12px] text-muted-foreground">Off keeps photos visible only to you.</p>
                </div>
                <Toggle on={shareAll} onChange={setShareAll} />
              </div>
            </>
          )}
        </div>

        <div className="px-7 py-5 border-t border-white/5 flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">Step {step + 1} of {steps}</span>
          <PillButton onClick={next}>{step === steps - 1 ? "Open the film →" : "Next →"}</PillButton>
        </div>
      </div>
    </Frame>
  );
}
