import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Frame, ApertureLogo } from "@/components/snapix/Frame";
import { BackLink, PillButton } from "@/components/snapix/ui";

export const Route = createFileRoute("/invite")({
  head: () => ({ meta: [{ title: "Invite — Snapix" }] }),
  component: Invite,
});

function Invite() {
  return (
    <Frame>
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-4 flex items-center justify-between">
          <BackLink to="/film" />
          <div className="flex items-center gap-1.5"><ApertureLogo size={14} /><span className="font-display italic text-[15px]">Snapix</span></div>
          <span className="w-9" />
        </div>

        <div className="flex-1 px-7 pt-6 flex flex-col items-center text-center">
          <div className="rounded-3xl bg-white p-5 shadow-2xl">
            <QRCodeSVG value="https://snapix.film/m/mira30" size={200} bgColor="#ffffff" fgColor="#0c0c0c" level="M" />
          </div>
          <h1 className="mt-8 font-display italic text-[26px] leading-tight">Hand the lens around.</h1>
          <p className="mt-3 text-[14px] text-muted-foreground max-w-[280px]">
            Anyone with the link or QR code joins the film, takes a few frames, and waits for the reveal with you.
          </p>
        </div>

        <div className="px-7 pb-8 space-y-3">
          <PillButton className="w-full">Open in Snapix app</PillButton>
          <PillButton variant="outline" className="w-full">Open in browser</PillButton>
          <Link to="/join" className="block text-center text-[12px] text-muted-foreground underline underline-offset-2">snapix.film/m/mira30</Link>
          <div className="flex gap-3 pt-2">
            <button className="flex-1 h-11 rounded-full bg-elevated text-[13px]">Share link</button>
            <button className="flex-1 h-11 rounded-full bg-elevated text-[13px]">Save QR</button>
          </div>
        </div>
      </div>
    </Frame>
  );
}
