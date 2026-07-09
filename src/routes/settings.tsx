import { createFileRoute } from "@tanstack/react-router";
import { Frame } from "@/components/snapix/Frame";
import { BackLink } from "@/components/snapix/ui";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Snapix" }] }),
  component: Settings,
});

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <button className="w-full flex items-center justify-between px-4 h-14 bg-surface border-b border-white/5 text-left">
      <span className="text-[14px]">{label}</span>
      <span className="text-[13px] text-muted-foreground">{value ? `${value} ›` : "›"}</span>
    </button>
  );
}

function Settings() {
  return (
    <Frame>
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-4 flex items-center justify-between">
          <BackLink to="/film" />
          <p className="font-display italic text-[18px]">Settings</p>
          <span className="w-9" />
        </div>

        <div className="px-7 pt-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-elevated border border-white/10 flex items-center justify-center text-2xl">A</div>
          <div>
            <p className="font-display italic text-[20px]">Aziz</p>
            <p className="text-[12px] text-muted-foreground">Director · 2 films</p>
          </div>
        </div>

        <p className="px-7 mt-8 text-[11px] uppercase tracking-widest text-muted-foreground">Profile</p>
        <div className="mt-2 rounded-2xl mx-4 overflow-hidden">
          <Row label="Display name" value="Aziz" />
          <Row label="Instagram" value="@aziz" />
          <Row label="Personal site" value="aziz.cam" />
        </div>

        <p className="px-7 mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">Snapix</p>
        <div className="mt-2 rounded-2xl mx-4 overflow-hidden">
          <Row label="Notifications" />
          <Row label="Contact support" />
          <button className="w-full px-4 h-14 bg-surface border-b border-white/5 text-left flex items-center justify-between">
            <span className="text-[14px]">Have a friend code?</span>
            <span className="text-[12px] px-3 h-7 inline-flex items-center rounded-full bg-success/20 text-success">Add</span>
          </button>
        </div>

        <p className="px-7 mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">Account</p>
        <div className="mt-2 rounded-2xl mx-4 overflow-hidden">
          <Row label="Sign out" />
          <button className="w-full px-4 h-14 bg-surface text-left text-destructive text-[14px]">Delete account</button>
        </div>

        <div className="h-12" />
      </div>
    </Frame>
  );
}
