"use client";

import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { fa } from "@/lib/jalali";

export const PRIORITY: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  high: { label: "زیاد", dot: "bg-rose-500", bg: "bg-rose-50 border-rose-200", text: "text-rose-700" },
  medium: { label: "متوسط", dot: "bg-amber-500", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  low: { label: "کم", dot: "bg-sky-500", bg: "bg-sky-50 border-sky-200", text: "text-sky-700" },
};
export const STATUS: Record<string, { label: string; cls: string }> = {
  todo: { label: "انجام نشده", cls: "bg-slate-100 text-slate-600" },
  doing: { label: "در حال انجام", cls: "bg-amber-100 text-amber-700" },
  done: { label: "انجام شده", cls: "bg-emerald-100 text-emerald-700" },
};
export const TASK_CATEGORIES = ["کار", "تحصیل", "شخصی", "سلامت", "مالی", "خانواده", "سایر"];
export const COLORS = ["#16a34a", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#6366f1", "#f97316", "#64748b"];

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Layout ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-emerald-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  padding = true,
}: {
  title?: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section className={cn("rounded-2xl border border-emerald-100 bg-white shadow-sm", padding && "p-5", className)}>
      {(title || action) && (
        <div className={cn("mb-4 flex items-center justify-between gap-2", !padding && "px-5 pt-5")}>
          <div>
            {title && <h2 className="font-bold text-emerald-950">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "green",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "green" | "blue" | "amber" | "rose" | "violet" | "slate";
}) {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
      {icon && <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tones[tone])}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{label}</div>
        <div className="truncate text-xl font-extrabold text-emerald-950">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

/* ---------- Controls ---------- */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
};
export function Button({ variant = "primary", size = "md", loading, className, children, ...props }: BtnProps) {
  const variants: Record<string, string> = {
    primary: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm",
    outline: "border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200",
    soft: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    icon: "h-9 w-9 p-0",
  };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-50";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldCls, props.className)} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldCls, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldCls, "min-h-[80px]", props.className)} />;
}
export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

/* ---------- Modal ---------- */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-emerald-950">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Navigation between ranges ---------- */
export function RangeNav({ label, onPrev, onNext, onToday }: { label: string; onPrev: () => void; onNext: () => void; onToday?: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-emerald-100 bg-white p-1 shadow-sm">
      <button onClick={onPrev} className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50" aria-label="قبلی">
        <ChevronRight size={18} />
      </button>
      <span className="min-w-[160px] px-2 text-center text-sm font-bold text-emerald-900">{label}</span>
      <button onClick={onNext} className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50" aria-label="بعدی">
        <ChevronLeft size={18} />
      </button>
      {onToday && (
        <button onClick={onToday} className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
          امروز
        </button>
      )}
    </div>
  );
}

/* ---------- Charts ---------- */
export function Ring({
  value,
  size = 80,
  stroke = 9,
  color = "var(--accent)",
  track = "var(--track)",
  label,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  label?: ReactNode;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: track }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          style={{ stroke: color, transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span className="font-extrabold text-emerald-950" style={{ fontSize: size / 4.5 }}>
              {fa(Math.round(v))}٪
            </span>
            {label && <span className="text-[10px] text-slate-500">{label}</span>}
          </>
        )}
      </div>
    </div>
  );
}

export function ProgressBar({ value, color = "var(--accent)", height = 8, className }: { value: number; color?: string; height?: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-emerald-50", className)} style={{ height }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function BarChart({
  data,
  height = 140,
  format = (v: number) => fa(v),
  color = "var(--accent)",
}: {
  data: { label: string; value: number; color?: string; hint?: string }[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex w-full items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={d.hint ?? `${d.label}: ${format(d.value)}`}>
          <span className="text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100">{format(d.value)}</span>
          <div
            className="w-full max-w-[36px] rounded-t-md transition-all duration-500"
            style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: d.color ?? color, opacity: d.value ? 1 : 0.25 }}
          />
          <span className="truncate text-[10px] text-slate-500">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data, size = 140, stroke = 22 }: { data: { label: string; value: number; color: string }[]; size?: number; stroke?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: "var(--track)" }} />
      {total > 0 &&
        data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              style={{ stroke: d.color }}
            />
          );
          offset += len;
          return el;
        })}
    </svg>
  );
}

/* ---------- Misc ---------- */
export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-10 text-center text-sm text-slate-500">
      <span>{text}</span>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Loader2 className="animate-spin text-emerald-600" size={18} /> در حال بارگذاری…
    </div>
  );
}
export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={cn("text-xl transition", n <= value ? "text-amber-400" : "text-slate-200", onChange && "hover:scale-110")}
        >
          ★
        </button>
      ))}
    </div>
  );
}
