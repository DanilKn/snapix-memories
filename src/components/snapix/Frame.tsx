import { ReactNode } from "react";

export function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-black">
      <div className={`relative w-full max-w-[420px] min-h-screen bg-background overflow-hidden ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function ApertureLogo({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-foreground ${className}`}>
      <ApertureLogo size={14} />
      <span className="font-display italic text-[15px]">Snapix</span>
    </span>
  );
}
