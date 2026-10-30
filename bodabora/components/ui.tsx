import Link from "next/link";
import type { ReactNode } from "react";

export function scoreTone(score: number) {
  if (score >= 75) return { text: "text-safe", bg: "bg-safe", stroke: "var(--safe)", label: "Low risk" };
  if (score >= 55) return { text: "text-warn", bg: "bg-warn", stroke: "var(--warn)", label: "Moderate" };
  return { text: "text-danger", bg: "bg-danger", stroke: "var(--danger)", label: "High risk" };
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-hivis text-ink">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2}>
          <circle cx="5.5" cy="16.5" r="3.5" />
          <circle cx="18.5" cy="16.5" r="3.5" />
          <path d="M5.5 16.5 10 9h5l3.5 7.5M10 9 8.5 6H6M15 9l1-3h2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className={`text-lg font-bold tracking-tight ${dark ? "text-white" : "text-ink"}`}>
        Boda Bora
      </span>
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {action}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-black/5 text-foreground",
  safe: "bg-safe/10 text-safe",
  warn: "bg-warn/15 text-[#9a5d00]",
  danger: "bg-danger/10 text-danger",
  hivis: "bg-hivis text-ink",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function ScoreGauge({
  score,
  size = 180,
  label = "Rider Safety Score",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const r = 70;
  const circumference = Math.PI * r; // half circle
  const filled = (score / 100) * circumference;
  const tone = scoreTone(score);
  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 180 100" width={size} height={size * 0.56} aria-label={`${label}: ${score}`}>
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={14} strokeLinecap="round" />
        <path
          d="M20 90 A70 70 0 0 1 160 90"
          fill="none"
          stroke={tone.stroke}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 300ms ease" }}
        />
      </svg>
      <div className="-mt-12 flex flex-col items-center">
        <span className="tabular text-5xl font-bold tracking-tight">{score}</span>
        <span className={`text-xs font-semibold uppercase tracking-wider ${tone.text}`}>{tone.label}</span>
      </div>
    </div>
  );
}

export function ScoreBar({ label, sublabel, value }: { label: string; sublabel?: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-medium">
          {label}
          {sublabel && <span className="ml-1.5 text-xs font-normal text-muted">{sublabel}</span>}
        </span>
        <span className={`tabular font-semibold ${tone.text}`}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/5">
        <div className={`h-full rounded-full ${tone.bg}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  width = 120,
  height = 36,
  stroke = "currentColor",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  const min = Math.min(...values) - 2;
  const max = Math.max(...values) + 2;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / (max - min)) * height).toFixed(1)}`)
    .join(" ");
  const last = points.split(" ").at(-1)!.split(",");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} />
    </svg>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="tabular mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </Card>
  );
}

export function CoverageMeter({ value }: { value: number }) {
  const tone = value >= 80 ? "bg-safe" : value >= 60 ? "bg-warn" : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/5">
        <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="tabular text-sm text-muted">{value}%</span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Button({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "hivis";
}) {
  const styles = {
    primary: "bg-ink text-white hover:bg-ink/90",
    secondary: "border border-line bg-surface text-foreground hover:bg-black/3",
    hivis: "bg-hivis text-ink hover:bg-hivis/90",
  }[variant];
  const cls = `inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${styles}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls}>
      {children}
    </button>
  );
}
