"use client";
import CollegePredictorLogo from "@/components/CollegePredictorLogo";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { generateCollegeResultsPdf } from "@/lib/pdf/generateCollegeResultsPdf";
import CollegeComparison from "@/components/CollegeComparison";

/* ====================================================================== */
/*  Types                                                                  */
/* ====================================================================== */

type Prediction = {
  institute_code: string | number;
  college_name: string;
  branch_name: string;
  cap_round: number;
  status: string | null;
  level: string | null;
  stage: string | null;
  category: string;
  historical_closing_rank: number | null;
  historical_cutoff_percentile: number;
  student_percentile: number;
  percentile_difference: number;
  prediction: "More Chance" | "Moderate" | "Low Chances";
  historical_cutoff: string | number | null;
};

type PredictionResponse = {
  student_percentile: number;
  category: string;
  branch: string;
  cap_round: number;
  total_results: number;
  notice: string;
  predictions: Prediction[];
};

type CollegeBranch = {
  branch_code: string | number | null;
  branch_name: string;
};

type CollegeDetailsResponse = {
  institute_code: string | number;
  college_name: string;
  details: Record<string, unknown>;
  branches: CollegeBranch[];
};

type SearchContext = {
  branches: string[];
  cities: string[];
  year: string;
};

type ChanceFilter = "all" | Prediction["prediction"];
type SortBy = "name" | "cutoff-desc" | "cutoff-asc";

/* ====================================================================== */
/*  Constants and helpers                                                  */
/* ====================================================================== */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const PAGE_SIZE = 20;
const PREDICTOR_SESSION_KEY_PREFIX = "collegePredictorSearchStateV1";

/** Build a separate browser-state key for each authenticated student. */
function getPredictorSessionKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const rawStudent = window.sessionStorage.getItem("collegePredictorStudent");
    if (!rawStudent) return null;
    const student = JSON.parse(rawStudent) as {
      id?: number | string;
      email?: string;
      full_name?: string;
      name?: string;
    };
    // Prefer a stable database id. Email is the fallback for older student records.
    const identity =
      student.id !== undefined && String(student.id).trim()
        ? `id:${String(student.id).trim()}`
        : student.email?.trim().toLowerCase()
          ? `email:${student.email.trim().toLowerCase()}`
          : null;
    return identity ? `${PREDICTOR_SESSION_KEY_PREFIX}:${encodeURIComponent(identity)}` : null;
  } catch {
    return null;
  }
}

const FIELD_CLASS =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const LABEL_CLASS = "mb-2 block text-sm font-semibold text-slate-800";

function formatLabel(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getHistoryBranchLabel(selectedBranches: string[], fallbackBranch: string): string {
  const selected = selectedBranches.filter(Boolean);
  if (selected.length === 0) return fallbackBranch.slice(0, 200);

  const fullLabel = selected.join(", ");
  if (fullLabel.length <= 200) return fullLabel;

  // The history API limits `branch` to 200 characters. Keep a readable summary
  // instead of sending the entire multi-select list and receiving a 422 error.
  const firstBranch = selected[0] ?? "Engineering branches";
  const secondBranch = selected[1];
  const remaining = selected.length - (secondBranch ? 2 : 1);

  const summary = secondBranch
    ? `${firstBranch}, ${secondBranch}${remaining > 0 ? `, +${remaining} more` : ""}`
    : `${firstBranch.slice(0, 160)}${remaining > 0 ? `, +${remaining} more` : ""}`;

  return summary.length <= 200 ? summary : `${summary.slice(0, 197)}...`;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not available";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function isWebUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value.trim());
}

const OFFICIAL_LINK_KEY =
  /website|web site|url|link|email|accreditation|mou|brochure|placement/i;

function chanceClasses(prediction: Prediction["prediction"]) {
  if (prediction === "More Chance") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (prediction === "Moderate") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function chanceBarClasses(prediction: Prediction["prediction"]) {
  if (prediction === "More Chance") return "bg-emerald-500";
  if (prediction === "Moderate") return "bg-amber-400";
  return "bg-rose-500";
}

function formatCutoff(value: number | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(4) : "—";
}

function countDecimals(value: number) {
  const part = String(value).split(".")[1];
  return Math.min(4, part ? part.length : 0);
}

/* ====================================================================== */
/*  Animations                                                             */
/* ====================================================================== */

const animationCss = `
@keyframes cp-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cp-pop { from { opacity: 0; transform: scale(.94) translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes cp-drop { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
@keyframes cp-float { 0%, 100% { transform: translate3d(0, 0, 0); } 50% { transform: translate3d(0, -18px, 0); } }
@keyframes cp-shine { from { background-position: 0% center; } to { background-position: 100% center; } }
@keyframes cp-shimmer { to { transform: translateX(100%); } }
@keyframes cp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.cp-fade-up { animation: cp-fade-up .7s cubic-bezier(.2,.7,.2,1) both; }
.cp-fade { animation: cp-fade .25s ease both; }
.cp-pop { animation: cp-pop .3s cubic-bezier(.2,.8,.2,1) both; }
.cp-drop { animation: cp-drop .2s ease both; }
.cp-row { animation: cp-fade-up .5s cubic-bezier(.2,.7,.2,1) both; }
.cp-float { animation: cp-float 9s ease-in-out infinite; }
.cp-float-slow { animation: cp-float 13s ease-in-out infinite reverse; }
.cp-shine { background-size: 200% auto; animation: cp-shine 5s ease-in-out infinite alternate; }
.cp-grow { transform-origin: left center; animation: cp-grow .9s cubic-bezier(.2,.7,.2,1) both; }

.cp-reveal { opacity: 0; transform: translateY(26px); transition: opacity .65s ease, transform .65s cubic-bezier(.2,.7,.2,1); }
.cp-reveal.cp-in { opacity: 1; transform: none; }

.cp-sheen { position: relative; overflow: hidden; }
.cp-sheen::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  transform: translateX(-130%) skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.38), transparent);
  transition: transform .75s ease;
}
.cp-sheen:hover::after { transform: translateX(130%) skewX(-20deg); }

.cp-skeleton { position: relative; overflow: hidden; }
.cp-skeleton::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
  animation: cp-shimmer 1.4s infinite;
}

/* Moving gradient border: a bright arc that travels around the card edge. */
@property --cp-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes cp-spin-angle { to { --cp-angle: 360deg; } }

.cp-border { position: relative; }
.cp-border::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  pointer-events: none;
  background: conic-gradient(
    from var(--cp-angle),
    transparent 0%,
    transparent 58%,
    #60a5fa 72%,
    #6366f1 84%,
    #a78bfa 94%,
    transparent 100%
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: cp-spin-angle 4.5s linear infinite;
}
/* Only shows (and moves) while hovered or focused. */
.cp-border-hover::before { opacity: 0; transition: opacity .35s ease; }
.cp-border-hover:hover::before,
.cp-border-hover:focus-within::before { opacity: 1; }

@media (prefers-reduced-motion: reduce) {
  .cp-border::before { animation: none; }
  .cp-reveal { opacity: 1; transform: none; transition: none; }
  .cp-fade-up, .cp-fade, .cp-pop, .cp-drop, .cp-row, .cp-float, .cp-float-slow, .cp-shine, .cp-grow, .cp-skeleton::after {
    animation: none !important;
  }
  .cp-sheen::after { display: none; }
}
`;

/** Fades and slides its children in the first time they scroll into view. */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`cp-reveal ${visible ? "cp-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** Counts a number up from zero when it first appears or changes. */
function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 900;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{Number.isFinite(value) ? display.toFixed(decimals) : "—"}</>;
}

/* ====================================================================== */
/*  Icons                                                                  */
/* ====================================================================== */

const ICONS = {
  cap: "m2 9 10-5 10 5-10 5L2 9Z M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5 M22 9v6",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  chart: "M4 20V10 M10 20V4 M16 20v-7 M22 20H2",
  building: "M3 21h18 M5 21V9l7-5 7 5v12 M9 21v-6h6v6",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M18 6 6 18",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.3-4.3",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  bookmark: "M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z",
  compare: "M7 4 3 8l4 4 M3 8h14 M17 20l4-4-4-4 M21 16H7",
  download: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
  chevron: "m6 9 6 6 6-6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  layers: "m12 3 9 5-9 5-9-5 9-5Z M3 13l9 5 9-5",
  user: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M4.5 20c.9-3.6 4-5.5 7.5-5.5s6.6 1.9 7.5 5.5",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 8h.01",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
} as const;

type IconName = keyof typeof ICONS;

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

/* ====================================================================== */
/*  Cutoff meter and multi-select dropdown                                 */
/* ====================================================================== */

/* Shows where the student's percentile sits relative to the historical cutoff. */
function CutoffMeter({
  diff,
  prediction,
  className = "",
}: {
  diff: number;
  prediction: Prediction["prediction"];
  className?: string;
}) {
  const value = Number.isFinite(Number(diff)) ? Number(diff) : 0;
  const clamped = Math.max(-10, Math.min(10, value));
  const position = 50 + (clamped / 10) * 50;
  const fillLeft = Math.min(50, position);
  const fillWidth = Math.abs(position - 50);

  return (
    <div
      className={className}
      title={`You are ${Math.abs(value)} percentile ${value >= 0 ? "above" : "below"} the cutoff`}
    >
      <div className="relative h-1.5 rounded-full bg-slate-100">
        <span
          className={`absolute top-0 h-full rounded-full opacity-40 ${chanceBarClasses(prediction)}`}
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
        />
        <span className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-y-1/2 bg-slate-400" />
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-[left] duration-700 ease-out ${chanceBarClasses(prediction)}`}
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        <span>Below</span>
        <span>Cutoff</span>
        <span>Above</span>
      </div>
    </div>
  );
}

type MultiSelectProps = {
  id: string;
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  emptyLabel?: string;
  searchPlaceholder: string;
  helper: string;
  className?: string;
};

function MultiSelect({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder,
  emptyLabel,
  searchPlaceholder,
  helper,
  className = "",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filtered = options.filter((item) =>
    item.toLowerCase().includes(search.trim().toLowerCase())
  );

  function toggle(item: string, checked: boolean) {
    if (checked) {
      if (!selected.includes(item)) onChange([...selected, item]);
    } else {
      onChange(selected.filter((value) => value !== item));
    }
  }

  const summary =
    selected.length === 0
      ? emptyLabel ?? placeholder
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>

      <button
        id={id}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className={`${FIELD_CLASS} flex items-center justify-between gap-3 py-3 text-left`}
      >
        <span className={selected.length ? "truncate" : "truncate text-slate-500"}>{summary}</span>
        <Icon
          name="chevron"
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="cp-drop absolute left-0 top-[calc(100%+0.5rem)] z-[100] w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/5 sm:min-w-[18rem]">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{selected.length === 0 && emptyLabel ? "No filter applied" : `${selected.length} selected`}</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Clear selection
              </button>
            </div>
          </div>

          <div
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            className="max-h-52 overflow-y-auto p-1.5"
          >
            {emptyLabel && (
              <button
                type="button"
                onClick={() => onChange([])}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selected.length === 0
                    ? "bg-blue-50 font-semibold text-blue-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {emptyLabel}
              </button>
            )}

            {filtered.map((item) => (
              <label
                key={item}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-blue-50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(item)}
                  onChange={(event) => toggle(item, event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                />
                <span>{item}</span>
              </label>
            ))}

            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No matches found.</p>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-100 bg-white p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-w-24 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Done <Icon name="check" className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {selected.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.slice(0, 3).map((item) => (
            <span
              key={item}
              className="cp-pop inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-blue-800"
            >
              <span className="truncate">{item}</span>
              <button
                type="button"
                onClick={() => toggle(item, false)}
                aria-label={`Remove ${item}`}
                className="grid h-4 w-4 place-items-center rounded-full hover:bg-blue-200"
              >
                <Icon name="close" className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selected.length > 3 && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              +{selected.length - 3} more
            </span>
          )}
        </div>
      )}

      <p className="mt-1.5 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

/* ====================================================================== */
/*  Small presentational pieces                                            */
/* ====================================================================== */


const NAV_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "#predict", label: "Predict Colleges", icon: "target" },
  { href: "/all-india-predictor", label: "All India Predictor", icon: "building" },
  { href: "/universities", label: "Universities", icon: "building" },
  { href: "/student-guide", label: "Student Guide", icon: "book" },
  { href: "/about", label: "About", icon: "info" },
];


function NavLink({
  href,
  className,
  onClick,
  children,
}: {
  href: string;
  className: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (href.startsWith("#")) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}

const HERO_FEATURES: { icon: IconName; title: string; text: string; tone: string }[] = [
  { icon: "layers", title: "Historical Cutoffs", text: "CAP data by year and round", tone: "bg-blue-100 text-blue-700" },
  { icon: "filter", title: "Category-wise Results", text: "Open, SC, ST, OBC, EWS and more", tone: "bg-violet-100 text-violet-700" },
  { icon: "building", title: "College Profiles", text: "Fees, facilities and placements", tone: "bg-emerald-100 text-emerald-700" },
  { icon: "compare", title: "Smart Comparison", text: "Compare options side by side", tone: "bg-orange-100 text-orange-700" },
];

const STEPS = [
  { n: "01", title: "Enter your preferences", text: "Add your percentile, category, branches and preferred cities.", tone: "border-blue-200 bg-blue-100 text-blue-900" },
  { n: "02", title: "Compare historical cutoffs", text: "Explore matching Maharashtra engineering admission records.", tone: "border-indigo-200 bg-indigo-100 text-indigo-900" },
  { n: "03", title: "Review and save options", text: "Open college profiles and save results for later reference.", tone: "border-sky-200 bg-sky-100 text-sky-900" },
];

/* ====================================================================== */
/*  Page                                                                   */
/* ====================================================================== */

export default function Home() {
  /* ---------- Account ---------- */
  const [loggedInName, setLoggedInName] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  /* ---------- Form ---------- */
  const [percentile, setPercentile] = useState("");
  const [category, setCategory] = useState("GOBCS");
  const [selectedBranches, setSelectedBranches] = useState<string[]>(["Computer Engineering"]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [round, setRound] = useState("4");
  const [selectedYear, setSelectedYear] = useState("2025");

  /* ---------- Dropdown data ---------- */
  const [categories, setCategories] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  /* ---------- Results ---------- */
  const [results, setResults] = useState<PredictionResponse | null>(null);
  const [lastSearch, setLastSearch] = useState<SearchContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [savingCollection, setSavingCollection] = useState(false);
  const [saveCollectionMessage, setSaveCollectionMessage] = useState("");

  /* ---------- Result filters ---------- */
  const [chanceFilter, setChanceFilter] = useState<ChanceFilter>("all");
  const [resultSearch, setResultSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* ---------- College profile ---------- */
  const [selectedCollege, setSelectedCollege] = useState<CollegeDetailsResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [showTop, setShowTop] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Restore this account's last search across refreshes and logins.  */
  /*  The storage key is scoped to the authenticated student identity. */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const userSessionKey = getPredictorSessionKey();
      const raw = userSessionKey ? window.localStorage.getItem(userSessionKey) : null;
      if (raw) {
        const saved = JSON.parse(raw) as {
          percentile?: unknown;
          category?: unknown;
          selectedBranches?: unknown;
          selectedCities?: unknown;
          round?: unknown;
          selectedYear?: unknown;
          results?: unknown;
          lastSearch?: unknown;
          chanceFilter?: unknown;
          resultSearch?: unknown;
          sortBy?: unknown;
        };

        if (typeof saved.percentile === "string") setPercentile(saved.percentile);
        if (typeof saved.category === "string") setCategory(saved.category);
        if (Array.isArray(saved.selectedBranches) && saved.selectedBranches.every((v) => typeof v === "string")) {
          setSelectedBranches(saved.selectedBranches as string[]);
        }
        if (Array.isArray(saved.selectedCities) && saved.selectedCities.every((v) => typeof v === "string")) {
          setSelectedCities(saved.selectedCities as string[]);
        }
        if (saved.round === "1" || saved.round === "2" || saved.round === "3" || saved.round === "4") {
          setRound(saved.round);
        }
        if (saved.selectedYear === "2025" || saved.selectedYear === "2026") {
          setSelectedYear(saved.selectedYear);
        }
        if (saved.results && typeof saved.results === "object" && Array.isArray((saved.results as PredictionResponse).predictions)) {
          setResults(saved.results as PredictionResponse);
        }
        if (saved.lastSearch && typeof saved.lastSearch === "object") {
          const context = saved.lastSearch as SearchContext;
          if (Array.isArray(context.branches) && Array.isArray(context.cities) && typeof context.year === "string") {
            setLastSearch(context);
          }
        }
        if (saved.chanceFilter === "all" || saved.chanceFilter === "More Chance" || saved.chanceFilter === "Moderate" || saved.chanceFilter === "Low Chances") {
          setChanceFilter(saved.chanceFilter);
        }
        if (typeof saved.resultSearch === "string") setResultSearch(saved.resultSearch);
        if (saved.sortBy === "name" || saved.sortBy === "cutoff-desc" || saved.sortBy === "cutoff-asc") {
          setSortBy(saved.sortBy);
        }
      }
    } catch (restoreError) {
      console.warn("Could not restore the previous college search:", restoreError);
    } finally {
      setSessionRestored(true);
    }
  }, []);

  /* Save form/results under the current student's private browser key. */
  useEffect(() => {
    if (!sessionRestored) return;
    try {
      const userSessionKey = getPredictorSessionKey();
      // Do not persist search state until an authenticated student's identity is available.
      if (!userSessionKey) return;
      window.localStorage.setItem(
        userSessionKey,
        JSON.stringify({
          percentile,
          category,
          selectedBranches,
          selectedCities,
          round,
          selectedYear,
          results,
          lastSearch,
          chanceFilter,
          resultSearch,
          sortBy,
        })
      );
    } catch (storageError) {
      // Storage can be unavailable or full; the predictor should still work.
      console.warn("Could not save the current college search:", storageError);
    }
  }, [sessionRestored, percentile, category, selectedBranches, selectedCities, round, selectedYear, results, lastSearch, chanceFilter, resultSearch, sortBy]);

  // Show the "back to top" button after scrolling down a little.
  useEffect(() => {
    function handleScroll() {
      setShowTop(window.scrollY > 700);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Auth: keep the main page public and show the student's name when */
  /*  a valid-looking browser session is present. Do not force guests  */
  /*  to /login just for visiting the main page.                       */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    try {
      const token = window.sessionStorage.getItem("collegePredictorToken");
      const rawStudent = window.sessionStorage.getItem("collegePredictorStudent");

      // A visitor without a session can still view the main page.
      if (!token || !rawStudent) {
        setLoggedInName("");
        return;
      }

      const student = JSON.parse(rawStudent) as {
        full_name?: string;
        name?: string;
        email?: string;
      };
      setLoggedInName(
        student.full_name?.trim() || student.name?.trim() || student.email?.trim() || "Student"
      );
    } catch {
      setLoggedInName("");
    }
  }, []);

  function confirmLogout() {
    window.sessionStorage.removeItem("collegePredictorStudent");
    window.sessionStorage.removeItem("collegePredictorToken");
    window.sessionStorage.removeItem("collegePredictorAccessToken");
    window.location.assign("/login");
  }

  // Close the logout dialog with Escape.
  useEffect(() => {
    if (!showLogoutModal) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowLogoutModal(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showLogoutModal]);

  /* ---------------------------------------------------------------- */
  /*  Save each successful prediction once for the signed-in student.  */
  /*  Uses the search context captured at submit time so changing the  */
  /*  form afterwards never triggers a duplicate save.                 */
  /*  Requires the backend POST /prediction-history endpoint.          */
  /* ---------------------------------------------------------------- */
  const lastSavedPrediction = useRef("");

  useEffect(() => {
    if (!results || results.predictions.length === 0 || !lastSearch) return;

    let student: { id?: number | string };
    try {
      const rawStudent = window.sessionStorage.getItem("collegePredictorStudent");
      if (!rawStudent) return;
      student = JSON.parse(rawStudent) as { id?: number | string };
    } catch {
      return;
    }

    const studentId = Number(student.id);
    if (!Number.isInteger(studentId) || studentId <= 0) return;

    const branchLabel = getHistoryBranchLabel(lastSearch.branches, results.branch);

    const signature = `${studentId}:${JSON.stringify({
      student_percentile: results.student_percentile,
      category: results.category,
      branch: branchLabel,
      cap_round: results.cap_round,
      city: lastSearch.cities,
      predictions: results.predictions,
    })}`;

    if (lastSavedPrediction.current === signature) return;
    lastSavedPrediction.current = signature;

    void (async () => {
      try {
        const token =
          window.sessionStorage.getItem("collegePredictorToken") ||
          window.sessionStorage.getItem("collegePredictorAccessToken");
        if (!token) {
          lastSavedPrediction.current = "";
          return;
        }

        const response = await fetch(`${API_URL}/prediction-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_percentile: results.student_percentile,
            category: results.category,
            branch: branchLabel,
            cap_round: results.cap_round,
            city: lastSearch.cities.length ? lastSearch.cities.join(", ") : null,
            predictions: results.predictions,
          }),
        });

        if (!response.ok) {
          lastSavedPrediction.current = "";
          console.error(
            `Could not save prediction history (${response.status}):`,
            await response.text()
          );
        }
      } catch (saveError) {
        lastSavedPrediction.current = "";
        console.error("Could not save prediction history:", saveError);
      }
    })();
  }, [results, lastSearch]);

  /* ---------------------------------------------------------------- */
  /*  Load categories, branches and cities                             */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      setOptionsLoading(true);
      setOptionsError("");

      try {
        const [categoryResponse, branchResponse, cityResponse] = await Promise.all([
          fetch(`${API_URL}/categories`),
          fetch(`${API_URL}/branches?limit=100&offset=0`),
          fetch(`${API_URL}/cities`),
        ]);

        if (!categoryResponse.ok) throw new Error(`Categories request failed (${categoryResponse.status}).`);
        if (!branchResponse.ok) throw new Error(`Branches request failed (${branchResponse.status}).`);
        if (!cityResponse.ok) throw new Error(`Cities request failed (${cityResponse.status}).`);

        const categoryData = await categoryResponse.json();
        const firstBranchData = await branchResponse.json();
        const cityData = await cityResponse.json();

        const categoryList: string[] = Array.isArray(categoryData)
          ? categoryData
          : (categoryData.categories ?? categoryData.category_codes ?? []);

        const allBranches: string[] = (firstBranchData.branches ?? []).map(
          (item: { branch_name: string }) => item.branch_name
        );

        let offset = allBranches.length;
        let pageHasMore = (firstBranchData.branches ?? []).length === 100;

        while (pageHasMore) {
          const response = await fetch(`${API_URL}/branches?limit=100&offset=${offset}`);
          if (!response.ok) throw new Error(`Could not load more branches (${response.status}).`);

          const data = await response.json();
          const page: { branch_name: string }[] = data.branches ?? [];
          if (page.length === 0) break;

          allBranches.push(...page.map((item) => item.branch_name));
          offset += page.length;
          pageHasMore = page.length === 100;
        }

        const uniqueCategories = [
          ...new Set(categoryList.map((item) => String(item).trim()).filter(Boolean)),
        ].sort();

        const uniqueBranches = [
          ...new Set(allBranches.map((item) => String(item).trim()).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b));

        const cityList: string[] = Array.isArray(cityData) ? cityData : (cityData.cities ?? []);
        const uniqueCities = [
          ...new Set(cityList.map((item) => String(item).trim()).filter(Boolean)),
        ].sort((a, b) => a.localeCompare(b));

        if (uniqueCategories.length === 0) {
          throw new Error("The categories API returned no category codes. Check the /categories endpoint.");
        }
        if (uniqueBranches.length === 0) {
          throw new Error("The branches API returned no branch names.");
        }

        if (cancelled) return;

        setCategories(uniqueCategories);
        setBranches(uniqueBranches);
        setCities(uniqueCities);
        setSelectedCities((current) => current.filter((item) => uniqueCities.includes(item)));
        setCategory((current) =>
          uniqueCategories.includes(current)
            ? current
            : uniqueCategories.includes("GOBCS")
              ? "GOBCS"
              : uniqueCategories[0]
        );
        setSelectedBranches((current) => {
          const valid = current.filter((item) => uniqueBranches.includes(item));
          return valid.length
            ? valid
            : [
                uniqueBranches.includes("Computer Engineering")
                  ? "Computer Engineering"
                  : uniqueBranches[0],
              ];
        });
      } catch (err) {
        if (!cancelled) {
          setOptionsError(err instanceof Error ? err.message : "Could not load dropdown options.");
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResults(null);
    setSelectedCollege(null);
    setDetailsError("");
    setSaveCollectionMessage("");
    setChanceFilter("all");
    setResultSearch("");
    setSortBy("name");

    try {
      if (selectedBranches.length === 0) {
        throw new Error("Select at least one preferred engineering branch.");
      }

      const branchesToSearch = selectedBranches;
      // No selected cities means search all cities.
      const citiesToSearch = selectedCities.length > 0 ? selectedCities : [""];

      const searchPairs = branchesToSearch.flatMap((branchName) =>
        citiesToSearch.map((cityName) => ({ branchName, cityName }))
      );

      const responses = await Promise.all(
        searchPairs.map(async ({ branchName, cityName }) => {
          const params = new URLSearchParams({
            percentile,
            category,
            branch: branchName,
            cap_round: round,
            academic_year: selectedYear,
            limit: "50",
          });
          if (cityName) params.set("city", cityName);

          const response = await fetch(`${API_URL}/predict?${params.toString()}`);
          if (!response.ok) {
            const message = await response.text();
            throw new Error(
              `Prediction request failed for ${branchName}${cityName ? ` in ${cityName}` : ""} (${response.status}): ${message}`
            );
          }
          return (await response.json()) as PredictionResponse;
        })
      );

      const firstResponse = responses[0];
      const allPredictions = responses.flatMap((item) => item.predictions);

      const uniquePredictionMap = new Map<string, Prediction>();
      for (const item of allPredictions) {
        const key = `${item.institute_code}-${item.branch_name}-${item.cap_round}-${item.category}`;
        uniquePredictionMap.set(key, item);
      }

      const predictions = Array.from(uniquePredictionMap.values()).sort(
        (a, b) =>
          a.college_name.localeCompare(b.college_name) ||
          a.branch_name.localeCompare(b.branch_name)
      );

      const data: PredictionResponse = {
        ...firstResponse,
        branch: branchesToSearch.join(", "),
        total_results: predictions.length,
        predictions,
      };

      setLastSearch({ branches: branchesToSearch, cities: selectedCities, year: selectedYear });
      setResults(data);

      if (data.total_results === 0) {
        setError("No matching records were found. Try another city, branch, category, or CAP round.");
      }

      window.setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Check that the FastAPI backend is running.`
          : "Could not connect to the prediction API."
      );
    } finally {
      setLoading(false);
    }
  }

  async function viewCollegeDetails(instituteCode: string | number) {
    setDetailsLoading(true);
    setDetailsError("");
    setSelectedCollege(null);

    try {
      const code = encodeURIComponent(String(instituteCode));
      const response = await fetch(`${API_URL}/colleges/${code}/details`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(`Could not load college details (${response.status}): ${message}`);
      }

      const data: CollegeDetailsResponse = await response.json();
      setSelectedCollege(data);

      window.setTimeout(() => {
        document.getElementById("college-profile")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Could not load college details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function saveAllColleges() {
    if (!results || results.predictions.length === 0) {
      setSaveCollectionMessage("Generate predictions before saving.");
      return;
    }

    const token = window.sessionStorage.getItem("collegePredictorToken");
    if (!token) {
      setSaveCollectionMessage("Please log in again to save your colleges.");
      return;
    }

    setSavingCollection(true);
    setSaveCollectionMessage("");

    try {
      const searchBranches = lastSearch?.branches ?? selectedBranches;
      const searchCities = lastSearch?.cities ?? selectedCities;

      const response = await fetch(`${API_URL}/saved-college-collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          student_percentile: results.student_percentile,
          category: results.category,
          branch: getHistoryBranchLabel(searchBranches, results.branch),
          cap_round: results.cap_round,
          city: searchCities.length ? searchCities.join(", ") : null,
          predictions: results.predictions,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Could not save colleges (${response.status}).`
        );
      }

      setSaveCollectionMessage(
        `Saved successfully! ${data.saved_colleges ?? results.predictions.length} colleges added to My Saved Colleges.`
      );
    } catch (saveError) {
      setSaveCollectionMessage(
        saveError instanceof Error ? saveError.message : "Could not save colleges. Please try again."
      );
    } finally {
      setSavingCollection(false);
    }
  }

  async function downloadResultsPdf() {
    if (!results || results.predictions.length === 0) return;

    setExportingPdf(true);
    setError("");

    try {
      await generateCollegeResultsPdf({
        results,
        apiUrl: API_URL,
        logoUrl: "/images/knowletive-logo.png",
        cutoffYear: Number(lastSearch?.year ?? selectedYear),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not generate PDF: ${err.message}`
          : "Could not generate the PDF. Please try again."
      );
    } finally {
      setExportingPdf(false);
    }
  }

  function clearResults() {
    setResults(null);
    setLastSearch(null);
    setSelectedCollege(null);
    setError("");
    setDetailsError("");
    setSaveCollectionMessage("");
  }

  function closeCollegeDetails() {
    setSelectedCollege(null);
    setDetailsError("");
  }

  /* ---------------------------------------------------------------- */
  /*  Derived result data                                              */
  /* ---------------------------------------------------------------- */
  const chanceCounts = useMemo(() => {
    const counts = { "More Chance": 0, Moderate: 0, "Low Chances": 0 };
    for (const item of results?.predictions ?? []) counts[item.prediction] += 1;
    return counts;
  }, [results]);

  const filteredPredictions = useMemo(() => {
    if (!results) return [];
    const term = resultSearch.trim().toLowerCase();

    const list = results.predictions.filter((item) => {
      if (chanceFilter !== "all" && item.prediction !== chanceFilter) return false;
      if (!term) return true;
      return (
        item.college_name.toLowerCase().includes(term) ||
        item.branch_name.toLowerCase().includes(term) ||
        String(item.institute_code).toLowerCase().includes(term)
      );
    });

    if (sortBy === "cutoff-desc") {
      return [...list].sort(
        (a, b) => Number(b.historical_cutoff_percentile) - Number(a.historical_cutoff_percentile)
      );
    }
    if (sortBy === "cutoff-asc") {
      return [...list].sort(
        (a, b) => Number(a.historical_cutoff_percentile) - Number(b.historical_cutoff_percentile)
      );
    }
    return list;
  }, [results, chanceFilter, resultSearch, sortBy]);

  // Start from the first page whenever the visible list changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results, chanceFilter, resultSearch, sortBy]);

  const visiblePredictions = filteredPredictions.slice(0, visibleCount);
  const totalCount = results?.predictions.length ?? 0;
  const resultYear = lastSearch?.year ?? selectedYear;

  /* Short labels for the results header so long branch lists never stretch the layout. */
  const searchedBranches = lastSearch?.branches?.length
    ? lastSearch.branches
    : results?.branch
      ? [results.branch]
      : [];
  const branchChipText =
    searchedBranches.length <= 2
      ? searchedBranches.join(", ")
      : `${searchedBranches[0]} +${searchedBranches.length - 1} more`;
  const searchedCities = lastSearch?.cities ?? [];
  const cityChipText =
    searchedCities.length === 0
      ? "All cities"
      : searchedCities.length <= 2
        ? searchedCities.join(", ")
        : `${searchedCities.length} cities`;

  const officialLinks = selectedCollege
    ? Object.entries(selectedCollege.details ?? {}).filter(
        ([key, value]) => isWebUrl(value) && OFFICIAL_LINK_KEY.test(key)
      )
    : [];

  const canSubmit =
    !loading &&
    !optionsLoading &&
    categories.length > 0 &&
    branches.length > 0 &&
    selectedBranches.length > 0;

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  return (
    <main
      className="min-h-screen overflow-x-clip bg-[#f4f7fc] text-slate-900 antialiased"
      style={{ fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif" }}
    >
      <style>{animationCss}</style>

      {/* ------------------------------ Navigation ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          
          <a
            href="#top"
            className="inline-flex shrink-0 items-center gap-3"
            aria-label="CollegePredictor home"
          >
            <CollegePredictorLogo
              size={56}
              className="rounded-xl transition-transform duration-300 hover:scale-105"
            />

            <span className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight text-slate-950">
                College<span className="text-blue-700">Predictor</span>
              </span>

              <span className="mt-1 hidden text-[10px] font-medium tracking-wide text-slate-500 xl:block">
                Your College. Our Data. Your Future.
              </span>
            </span>
          </a>


          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700"
              >
                <Icon name={item.icon} className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {loggedInName && (
              <div
                className="flex items-center gap-2.5 border-l border-slate-200 pl-3"
                title={`Logged in as ${loggedInName}`}
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-extrabold text-white"
                  aria-hidden="true"
                >
                  {loggedInName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden flex-col leading-tight xl:flex">
                  <span className="text-[10px] font-medium text-slate-500">Welcome back,</span>
                  <span className="max-w-36 truncate text-sm font-bold text-slate-900">{loggedInName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                  aria-label="Log out of your account"
                >
                  <Icon name="logout" className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}

            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? "close" : "menu"} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="cp-drop border-t border-slate-200 bg-white px-4 py-3 shadow-lg sm:px-6 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <Icon name={item.icon} className="h-5 w-5 text-blue-600" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------ Hero + form ------------------------------ */}
      <section
        id="top"
        className="relative isolate z-20 scroll-mt-20 border-b border-blue-100/80"
        style={{
          backgroundImage: "url('/images/college-campus-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#f8fbff]/98 via-white/92 to-[#eaf3ff]/62" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_28%,rgba(59,130,246,0.18),transparent_42%),radial-gradient(ellipse_at_78%_72%,rgba(99,102,241,0.10),transparent_40%)]"
          aria-hidden="true"
        />

        {/* Decorative dotted grid and softly floating colour blobs */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
          aria-hidden="true"
        />
        <div className="cp-float pointer-events-none absolute -right-24 top-10 -z-10 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" aria-hidden="true" />
        <div className="cp-float-slow pointer-events-none absolute -left-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" aria-hidden="true" />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-14 lg:px-8 lg:py-16">
          {/* Left: message */}
          <div className="min-w-0">
            <span
              className="cp-fade-up inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-800 shadow-sm sm:text-xs"
            >
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              Maharashtra MHT-CET · Admission planner
            </span>

            <h1
              className="cp-fade-up mt-5 max-w-2xl text-[2.4rem] font-black leading-[1.05] tracking-[-0.04em] text-[#10264f] sm:text-5xl lg:text-[3.4rem]"
              style={{ animationDelay: "100ms" }}
            >
              Your CET Percentile.
              <br />
              <span className="cp-shine bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                Your College Possibilities.
              </span>
            </h1>

            <p
              className="cp-fade-up mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base"
              style={{ animationDelay: "200ms" }}
            >
              Use historical CAP cutoff data to discover engineering colleges that match your
              percentile. Compare branches, fees, placements, and college details before building
              your shortlist.
            </p>

            <div className="mt-7 grid max-w-2xl grid-cols-2 gap-3 lg:grid-cols-4">
              {HERO_FEATURES.map((item, index) => (
                <div
                  key={item.title}
                  className="cp-border cp-border-hover cp-fade-up rounded-2xl border border-white bg-white/80 p-3.5 shadow-[0_8px_25px_rgba(30,64,175,0.05)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10"
                  style={{ animationDelay: `${300 + index * 90}ms` }}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}>
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <p className="mt-2.5 text-sm font-extrabold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>

            <ul
              className="cp-fade-up mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-700"
              style={{ animationDelay: "700ms" }}
            >
              {["Free to use", "All admission categories", "CAP rounds 1–4"].map((text) => (
                <li key={text} className="inline-flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <div
              className="cp-fade-up mt-7 flex flex-wrap items-center gap-4"
              style={{ animationDelay: "800ms" }}
            >
              <p className="font-serif text-lg italic text-blue-800 sm:text-xl">Make your next move with data.</p>
              <a
                href="#predict"
                className="cp-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-700/25 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                Start Your Search <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Right: prediction form */}
          <div
            id="predict"
            className="cp-border cp-fade-up relative z-30 min-w-0 scroll-mt-24 rounded-[1.6rem] border border-white/90 bg-white/95 p-5 shadow-[0_28px_90px_rgba(30,64,175,0.17)] ring-1 ring-blue-950/5 backdrop-blur-xl sm:p-7"
            style={{ animationDelay: "250ms" }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-[1.6rem] bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" aria-hidden="true" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-700 sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
                Admission predictor
              </span>
              <span className="text-[10px] font-bold tracking-wide text-slate-400 sm:text-xs">
                MHT-CET · {selectedYear} DATA
              </span>
            </div>

            <h2 className="mt-4 text-xl font-extrabold tracking-tight sm:text-2xl">Build your college shortlist</h2>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              Set your percentile and preferences to find relevant colleges.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="percentile" className={LABEL_CLASS}>
                  MHT-CET Percentile
                </label>
                <input
                  id="percentile"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  required
                  value={percentile}
                  onChange={(event) => setPercentile(event.target.value)}
                  placeholder="Example: 97.25"
                  className={FIELD_CLASS}
                />
                <p className="mt-1.5 text-xs leading-5 text-slate-500">Enter a value between 0 and 100.</p>
              </div>

              <div>
                <label htmlFor="category" className={LABEL_CLASS}>
                  Admission Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={FIELD_CLASS}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  Select the exact category code applicable to you.
                </p>
              </div>

              <MultiSelect
                id="branch-dropdown"
                label="Preferred Engineering Branch"
                options={branches}
                selected={selectedBranches}
                onChange={setSelectedBranches}
                placeholder="Select engineering branches"
                searchPlaceholder="Search branches..."
                helper="Choose one or more branches from the dropdown."
                className="sm:col-span-2"
              />

              <MultiSelect
                id="city-dropdown"
                label="Filter by City"
                options={cities}
                selected={selectedCities}
                onChange={setSelectedCities}
                placeholder="All Cities"
                emptyLabel="All Cities (no city filter)"
                searchPlaceholder="Search cities..."
                helper="Choose multiple cities, or keep All Cities to search without a filter."
              />

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1 sm:gap-4">
                <div>
                  <label htmlFor="academicYear" className={LABEL_CLASS}>
                    Admission Year
                  </label>
                  <select
                    id="academicYear"
                    value={selectedYear}
                    onChange={(event) => {
                      const year = event.target.value;
                      setSelectedYear(year);
                      setRound(year === "2026" ? "1" : "4");
                      setResults(null);
                      setError("");
                    }}
                    className={FIELD_CLASS}
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="round" className={LABEL_CLASS}>
                    CAP Round
                  </label>
                  <select
                    id="round"
                    value={round}
                    onChange={(event) => setRound(event.target.value)}
                    className={FIELD_CLASS}
                  >
                    {[1, 2, 3, 4].map((item) => (
                      <option key={item} value={String(item)}>
                        Round {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="cp-sheen inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-700/25 transition duration-200 hover:-translate-y-0.5 hover:from-blue-800 hover:to-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:col-span-2"
              >
                {loading ? (
                  <>
                    <Spinner /> Finding Colleges...
                  </>
                ) : (
                  <>
                    Find My Colleges <Icon name="arrow" className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {optionsLoading && (
              <p className="mt-3 flex items-center gap-2 text-sm text-blue-700" role="status">
                <Spinner /> Loading admission categories, branches and cities...
              </p>
            )}

            {optionsError && (
              <p className="cp-fade mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
                {optionsError} Make sure the backend is running and the /categories endpoint exists.
              </p>
            )}

            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Predictions are based on available historical cutoff records and do not guarantee admission.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------ How it works ------------------------------ */}
      <section aria-label="How the college predictor works" className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-7 sm:grid-cols-3 sm:px-6 lg:px-8">
          {STEPS.map((step, index) => (
            <Reveal key={step.n} delay={index * 110} className="h-full">
              <div className="cp-border cp-border-hover flex h-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/5 sm:p-5">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-sm font-extrabold ${step.tone}`}>
                  {step.n}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold leading-5 text-slate-950 sm:text-base">{step.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Results ------------------------------ */}
      <section id="results" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        {loading && (
          <div className="space-y-4" role="status" aria-label="Searching historical cutoff records">
            <div className="cp-fade flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <Spinner className="h-5 w-5 text-blue-700" />
              <p className="font-semibold text-blue-800">Searching historical cutoff records...</p>
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="cp-skeleton rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-3 h-3 w-1/3 rounded bg-slate-100" />
                <div className="mt-5 h-3 w-full rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="cp-fade-up mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900"
          >
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {results && results.total_results > 0 && (
          <>
            {/* Heading and actions */}
            <div className="cp-border cp-fade-up rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0 xl:flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Your search results</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Your College Predictions</h2>
                  <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{results.category}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">CAP Round {results.cap_round}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Year {resultYear}</span>
                    <span
                      className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1"
                      title={searchedBranches.join(", ")}
                    >
                      {branchChipText}
                    </span>
                    <span
                      className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1"
                      title={searchedCities.length ? searchedCities.join(", ") : "All cities"}
                    >
                      {cityChipText}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-xl xl:justify-end">
                  <button
                    type="button"
                    onClick={saveAllColleges}
                    disabled={savingCollection || !results.predictions.length}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCollection ? <Spinner /> : <Icon name="bookmark" className="h-4 w-4" />}
                    {savingCollection ? "Saving..." : "Save All"}
                  </button>
                  <Link
                    href="/saved-colleges"
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 transition hover:-translate-y-0.5 hover:bg-blue-100"
                  >
                    My Saved Colleges
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("college-comparison")?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-800 transition hover:-translate-y-0.5 hover:bg-orange-100"
                  >
                    <Icon name="compare" className="h-4 w-4" /> Compare
                  </button>
                  <button
                    type="button"
                    onClick={downloadResultsPdf}
                    disabled={exportingPdf}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                  >
                    {exportingPdf ? <Spinner /> : <Icon name="download" className="h-4 w-4" />}
                    {exportingPdf ? "Preparing PDF..." : "Download PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={clearResults}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <Icon name="trash" className="h-4 w-4" /> Clear
                  </button>
                </div>
              </div>

              {saveCollectionMessage && (
                <p
                  role="status"
                  className={`cp-fade mt-4 rounded-lg px-3 py-2 text-sm ${
                    saveCollectionMessage.startsWith("Saved successfully")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {saveCollectionMessage}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <Reveal className="h-full">
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm text-slate-500">Your percentile</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-blue-700">
                    <CountUp
                      value={Number(results.student_percentile)}
                      decimals={countDecimals(Number(results.student_percentile))}
                    />
                  </p>
                </div>
              </Reveal>
              <Reveal delay={90} className="h-full">
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm text-slate-500">Matching records</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums">
                    <CountUp value={results.total_results} />
                  </p>
                </div>
              </Reveal>
              <Reveal delay={180} className="h-full">
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm text-slate-500">Cutoff data year</p>
                  <p className="mt-2 text-3xl font-extrabold">{resultYear}</p>
                </div>
              </Reveal>
              <Reveal delay={270} className="h-full">
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <p className="text-sm text-slate-500">Chance mix</p>
                  <div className="cp-grow mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
                    {(["More Chance", "Moderate", "Low Chances"] as const).map((key) =>
                      chanceCounts[key] > 0 ? (
                        <span
                          key={key}
                          className={chanceBarClasses(key)}
                          style={{ width: `${(chanceCounts[key] / totalCount) * 100}%` }}
                          title={`${key}: ${chanceCounts[key]}`}
                        />
                      ) : null
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    <span className="font-bold text-emerald-700">{chanceCounts["More Chance"]}</span> high ·{" "}
                    <span className="font-bold text-amber-700">{chanceCounts.Moderate}</span> moderate ·{" "}
                    <span className="font-bold text-rose-700">{chanceCounts["Low Chances"]}</span> low
                  </p>
                </div>
              </Reveal>
            </div>

            {/* Filters */}
            <div className="z-40 mt-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur lg:sticky lg:top-[4.5rem]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative lg:w-80">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={resultSearch}
                    onChange={(event) => setResultSearch(event.target.value)}
                    placeholder="Search college, branch or code..."
                    aria-label="Search results"
                    className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { key: "all", label: "All", count: totalCount },
                      { key: "More Chance", label: "More Chance", count: chanceCounts["More Chance"] },
                      { key: "Moderate", label: "Moderate", count: chanceCounts.Moderate },
                      { key: "Low Chances", label: "Low Chances", count: chanceCounts["Low Chances"] },
                    ] as { key: ChanceFilter; label: string; count: number }[]
                  ).map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={() => setChanceFilter(chip.key)}
                      aria-pressed={chanceFilter === chip.key}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition duration-200 active:scale-95 ${
                        chanceFilter === chip.key
                          ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {chip.label}
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          chanceFilter === chip.key ? "bg-white/20" : "bg-slate-100"
                        }`}
                      >
                        {chip.count}
                      </span>
                    </button>
                  ))}
                </div>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortBy)}
                  aria-label="Sort results"
                  className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="name">Sort: College name</option>
                  <option value="cutoff-desc">Sort: Cutoff high → low</option>
                  <option value="cutoff-asc">Sort: Cutoff low → high</option>
                </select>
              </div>
            </div>

            <p className="mt-4 text-sm text-slate-500" aria-live="polite">
              Showing <span className="font-bold text-slate-800">{Math.min(visibleCount, filteredPredictions.length)}</span> of{" "}
              <span className="font-bold text-slate-800">{filteredPredictions.length}</span> results
            </p>

            {filteredPredictions.length === 0 ? (
              <div className="cp-fade-up mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-bold text-slate-800">No colleges match these filters.</p>
                <p className="mt-1 text-sm text-slate-500">Try a different search term or choose “All”.</p>
                <button
                  type="button"
                  onClick={() => {
                    setChanceFilter("all");
                    setResultSearch("");
                  }}
                  className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="mt-3 hidden w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/50 md:block">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="p-4 font-bold">College and Branch</th>
                        <th className="p-4 font-bold">Cutoff Percentile</th>
                        <th className="p-4 font-bold">Closing Rank</th>
                        <th className="p-4 font-bold">Institute Status</th>
                        <th className="p-4 font-bold">Preliminary Estimate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePredictions.map((item, index) => (
                        <tr
                          key={`${item.institute_code}-${item.branch_name}-${index}`}
                          className="cp-row border-t border-slate-100 align-top transition-colors hover:bg-blue-50/50"
                          style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                        >
                          <td className="max-w-sm p-4">
                            <p className="font-bold text-slate-900">{item.college_name}</p>
                            <p className="mt-1 text-slate-600">{item.branch_name}</p>
                            <p className="mt-1 text-xs text-slate-500">Institute Code: {item.institute_code}</p>
                            <button
                              type="button"
                              onClick={() => viewCollegeDetails(item.institute_code)}
                              disabled={detailsLoading}
                              className="group mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                            >
                              View College Details{" "}
                              <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          </td>
                          <td className="p-4 tabular-nums">
                            <p className="font-semibold">{formatCutoff(item.historical_cutoff_percentile)}</p>
                            <CutoffMeter diff={item.percentile_difference} prediction={item.prediction} className="mt-2 w-36" />
                          </td>
                          <td className="p-4 tabular-nums">{item.historical_closing_rank ?? "—"}</td>
                          <td className="max-w-xs p-4 text-xs leading-5 text-slate-600">{item.status ?? "Not available"}</td>
                          <td className="p-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${chanceClasses(item.prediction)}`}
                            >
                              {item.prediction}
                            </span>
                            <p className="mt-2 text-xs text-slate-500">
                              Difference: {item.percentile_difference > 0 ? "+" : ""}
                              {item.percentile_difference}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="mt-3 space-y-3 md:hidden">
                  {visiblePredictions.map((item, index) => (
                    <article
                      key={`${item.institute_code}-${item.branch_name}-m-${index}`}
                      className="cp-row rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold leading-snug text-slate-900">{item.college_name}</h3>
                          <p className="mt-1 text-sm text-slate-600">{item.branch_name}</p>
                        </div>
                        <span
                          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${chanceClasses(item.prediction)}`}
                        >
                          {item.prediction}
                        </span>
                      </div>

                      <CutoffMeter diff={item.percentile_difference} prediction={item.prediction} className="mt-4" />

                      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cutoff</dt>
                          <dd className="mt-1 text-sm font-bold tabular-nums">{formatCutoff(item.historical_cutoff_percentile)}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Rank</dt>
                          <dd className="mt-1 text-sm font-bold tabular-nums">{item.historical_closing_rank ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Diff</dt>
                          <dd className="mt-1 text-sm font-bold tabular-nums">
                            {item.percentile_difference > 0 ? "+" : ""}
                            {item.percentile_difference}
                          </dd>
                        </div>
                      </dl>

                      <p className="mt-3 text-xs text-slate-500">
                        Code: {item.institute_code} · {item.status ?? "Status not available"}
                      </p>

                      <button
                        type="button"
                        onClick={() => viewCollegeDetails(item.institute_code)}
                        disabled={detailsLoading}
                        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                      >
                        View College Details <Icon name="arrow" className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  ))}
                </div>

                {visibleCount < filteredPredictions.length && (
                  <div className="mt-5 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      className="rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 active:scale-[0.98]"
                    >
                      Show {Math.min(PAGE_SIZE, filteredPredictions.length - visibleCount)} more
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Comparison tool */}
            <Reveal className="mt-10">
              <div id="college-comparison" className="scroll-mt-24">
                <CollegeComparison colleges={results.predictions} />
              </div>
            </Reveal>

            <p className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                {results.notice} More Chance, Moderate, and Low Chances are preliminary labels based on
                historical cutoff differences, not statistically validated admission probabilities. Verify
                the applicable category, seat type, and official CAP rules before making admission choices.
              </span>
            </p>
          </>
        )}

        {!results && !loading && !error && (
          <Reveal>
            <div className="cp-border rounded-3xl border border-slate-200/80 bg-white px-6 py-14 text-center shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:px-10">
              <span className="cp-float mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon name="cap" className="h-8 w-8" />
              </span>
              <h2 className="mt-5 text-2xl font-bold">Find your future college</h2>
              <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">
                Submit your preferences to explore matching historical cutoff records. Open any college
                profile to view the master-data information available for that institute.
              </p>
              <a
                href="#predict"
                className="cp-sheen mt-6 inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-800"
              >
                Go to the predictor <Icon name="arrow" className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        )}

        {/* College profile: loading and errors */}
        {detailsLoading && (
          <div className="cp-fade mt-8 flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-6 text-blue-800" role="status">
            <Spinner className="h-5 w-5" /> Loading college profile...
          </div>
        )}

        {detailsError && (
          <div role="alert" className="cp-fade mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
            {detailsError}
          </div>
        )}

        {/* College profile */}
        {selectedCollege && (
          <div
            id="college-profile"
            className="cp-fade-up mt-10 scroll-mt-24 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"
          >
            <div className="bg-gradient-to-r from-blue-950 to-blue-700 p-6 text-white sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Complete College Profile</p>
                  <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{selectedCollege.college_name}</h2>
                  <p className="mt-3 text-sm text-blue-100">Institute Code: {selectedCollege.institute_code}</p>
                </div>
                <button
                  type="button"
                  onClick={closeCollegeDetails}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  Close <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-8 p-5 sm:p-8">
              <div>
                <h3 className="text-xl font-bold">College Information</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Information below is loaded from the master-data record stored in your database.
                </p>

                {Object.keys(selectedCollege.details ?? {}).length > 0 ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(selectedCollege.details ?? {}).map(([key, value], index) => (
                      <div
                        key={key}
                        className="cp-row min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                      >
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{formatLabel(key)}</p>
                        {isWebUrl(value) ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 break-all text-sm font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900"
                          >
                            Open official link <Icon name="external" className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-800">
                            {displayValue(value)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                    No additional master-data fields are available for this college.
                  </p>
                )}
              </div>

              {officialLinks.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold">Official Websites and Resources</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {officialLinks.map(([key, value]) => (
                      <a
                        key={key}
                        href={value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 transition hover:-translate-y-0.5 hover:bg-blue-100"
                      >
                        {formatLabel(key)} <Icon name="external" className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">Available Engineering Branches</h3>
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                    {selectedCollege.branches?.length ?? 0} branches
                  </span>
                </div>

                {selectedCollege.branches?.length > 0 ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedCollege.branches.map((item, index) => (
                      <div
                        key={`${item.branch_code}-${index}`}
                        className="cp-row rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40"
                        style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
                      >
                        <p className="font-semibold leading-6 text-slate-800">{item.branch_name}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Branch Code: {item.branch_code ?? "Not available"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">
                    No branch information is available for this institute.
                  </p>
                )}
              </div>

              <p className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <strong>Note:</strong> College information is shown as recorded in the available master
                  data. Verify current fees, placement figures, facilities, and admission requirements with
                  the college before making a decision.
                </span>
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------ Feature cards ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-700">Explore with confidence</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">More than just cutoff predictions</h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">
              Compare historical admission records and explore the college information available in your
              master data.
            </p>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {(
            [
              {
                icon: "target",
                title: "Personalised Predictions",
                text: "Compare your percentile with historical cutoffs for your selected category, branch, and CAP round.",
              },
              {
                icon: "building",
                title: "Complete College Profiles",
                text: "View stored college information, official links, fees, facilities, and other available fields.",
              },
              {
                icon: "chart",
                title: "Historical Cutoff Data",
                text: "Review available closing ranks, percentile cutoffs, and institute status for your selected CAP round.",
              },
            ] as { icon: IconName; title: string; text: string }[]
          ).map((card, index) => (
            <Reveal key={card.title} delay={index * 120} className="h-full">
              <article className="cp-border cp-border-hover group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-900/10">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700 transition duration-300 group-hover:scale-110 group-hover:bg-blue-700 group-hover:text-white">
                  <Icon name={card.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-xl font-bold">{card.title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{card.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Logout dialog ------------------------------ */}
      {showLogoutModal && (
        <div
          className="cp-fade fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowLogoutModal(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="cp-pop relative my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_30px_100px_rgba(2,6,23,0.38)]"
          >
            <div className="relative bg-gradient-to-br from-[#102b68] via-blue-700 to-indigo-600 px-6 pb-8 pt-6 text-white">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Close logout dialog"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>

              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/25 bg-white/15">
                <Icon name="logout" className="h-7 w-7" />
              </span>
              <h2 id="logout-dialog-title" className="mt-5 text-2xl font-black tracking-tight">
                Thank You for Being With Us!
              </h2>
              <p className="mt-2 text-sm leading-6 text-blue-50/95">
                We’re glad to be part of your college discovery journey. Your saved colleges and prediction history will be waiting for you when you return.
              </p>
              <p className="mt-3 text-sm font-semibold text-white">Thank you for choosing CollegePredictor. See you again soon!</p>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                autoFocus
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Continue Exploring
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-rose-600/25 transition hover:from-rose-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                <Icon name="logout" className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </section>
        </div>
      )}

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="cp-pop fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-blue-700 text-white shadow-xl shadow-blue-700/30 transition hover:-translate-y-1 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Back to top"
        >
          <Icon name="arrow" className="h-5 w-5 -rotate-90" />
        </button>
      )}

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="bg-[#0f1b36] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2.5 text-lg font-black tracking-tight text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Icon name="cap" className="h-5 w-5" />
              </span>
              College<span className="text-blue-400">Predictor</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Explore MHT-CET engineering admissions with historical CAP cutoff data. Your college. Our data.
              Your future.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Explore</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} className="transition hover:text-white">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Your account</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link href="/saved-colleges" className="transition hover:text-white">
                  My Saved Colleges
                </Link>
              </li>
              <li>
                <button type="button" onClick={() => setShowLogoutModal(true)} className="transition hover:text-white">
                  Log out
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>Historical cutoffs are guidance, not admission guarantees.</p>
            <p>College details depend on the information in the imported master-data file.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}