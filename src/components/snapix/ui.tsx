import { ReactNode, ButtonHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";

export function PillButton({
  children, variant = "primary", className = "", ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "accent" | "ghost" }) {
  const styles = {
    primary: "bg-primary text-primary-foreground",
    outline: "bg-transparent text-foreground border border-white/20",
    accent: "bg-accent text-accent-foreground",
    ghost: "bg-elevated text-foreground",
  }[variant];
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[15px] font-medium tracking-tight transition active:scale-[0.98] ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function PillLink({ to, children, variant = "primary", className = "" }: { to: string; children: ReactNode; variant?: "primary" | "outline" | "accent"; className?: string }) {
  const styles = {
    primary: "bg-primary text-primary-foreground",
    outline: "bg-transparent text-foreground border border-white/20",
    accent: "bg-accent text-accent-foreground",
  }[variant];
  return (
    <Link to={to} className={`inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[15px] font-medium tracking-tight ${styles} ${className}`}>
      {children}
    </Link>
  );
}

export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-white" : "w-1.5 bg-white/30"}`} />
      ))}
    </div>
  );
}

export function TopBar({ left, right, title }: { left?: ReactNode; right?: ReactNode; title?: ReactNode }) {
  return (
    <div className="h-14 px-4 flex items-center justify-between text-foreground">
      <div className="w-12 flex items-center">{left}</div>
      <div className="flex-1 text-center text-[15px]">{title}</div>
      <div className="w-12 flex items-center justify-end">{right}</div>
    </div>
  );
}

export function BackLink({ to = ".." as string }: { to?: string }) {
  return (
    <Link to={to as any} className="h-9 w-9 rounded-full bg-elevated/80 flex items-center justify-center text-foreground">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </Link>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`relative h-7 w-12 rounded-full transition ${on ? "bg-success" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
