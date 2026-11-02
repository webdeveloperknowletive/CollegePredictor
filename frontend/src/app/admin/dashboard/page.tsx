"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

/* ====================================================================== */
/*  Types                                                                  */
/* ====================================================================== */

type Prediction = {
  institute_code?: string | number;
  college_name?: string;
  institute_name?: string;
  location?: string | null;
  branch_name?: string;
  prediction?: string;
  historical_cutoff_percentile?: number;
  percentile_difference?: number;
};

type History = {
  id: number;
  student_percentile: number;
  category: string;
  branch: string;
  cap_round: number;
  city?: string | null;
  predictions: Prediction[];
  created_at: string;
};

type Student = {
  id: number;
  full_name: string;
  email: string;
  mobile: string;
  created_at: string;
  prediction_count: number;
  prediction_history: History[];
};

type DashboardData = {
  total_students: number;
  students: Student[];
};

type SortKey = "newest" | "name" | "predictions";

/* ====================================================================== */
/*  Helpers                                                                */
/* ====================================================================== */

const PAGE_SIZE = 10;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "S"
  );
}

const AVATAR_TONES = [
  "from-blue-600 to-indigo-700",
  "from-violet-600 to-purple-700",
  "from-emerald-600 to-teal-700",
  "from-orange-500 to-rose-600",
  "from-sky-500 to-blue-700",
  "from-pink-500 to-fuchsia-700",
];

function avatarTone(id: number) {
  return AVATAR_TONES[Math.abs(id) % AVATAR_TONES.length];
}

function chanceClasses(label?: string) {
  const text = (label ?? "").toLowerCase();
  if (text.includes("more")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (text.includes("moderate")) return "bg-amber-50 text-amber-700 ring-amber-200";
  if (text.includes("low")) return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function countDecimals(value: number) {
  const part = String(value).split(".")[1];
  return Math.min(2, part ? part.length : 0);
}

/* ====================================================================== */
/*  Animations                                                             */
/* ====================================================================== */

const animationCss = `
@property --cp-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes cp-spin-angle { to { --cp-angle: 360deg; } }
@keyframes cp-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cp-slide { from { transform: translateX(100%); } to { transform: none; } }
@keyframes cp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cp-shimmer { to { transform: translateX(100%); } }
@keyframes cp-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-18px,0); } }

.cp-fade-up { animation: cp-fade-up .6s cubic-bezier(.2,.7,.2,1) both; }
.cp-fade { animation: cp-fade .25s ease both; }
.cp-slide { animation: cp-slide .38s cubic-bezier(.2,.8,.2,1) both; }
.cp-grow { transform-origin: left center; animation: cp-grow .9s cubic-bezier(.2,.7,.2,1) both; }
.cp-float { animation: cp-float 12s ease-in-out infinite; }
.cp-row { animation: cp-fade-up .45s cubic-bezier(.2,.7,.2,1) both; }

.cp-border { position: relative; }
.cp-border::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 2px; pointer-events: none;
  background: conic-gradient(from var(--cp-angle), transparent 0%, transparent 58%, #60a5fa 72%, #6366f1 84%, #a78bfa 94%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: cp-spin-angle 4.5s linear infinite;
}

.cp-skeleton { position: relative; overflow: hidden; }
.cp-skeleton::after {
  content: ""; position: absolute; inset: 0; transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent);
  animation: cp-shimmer 1.4s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .cp-fade-up, .cp-fade, .cp-slide, .cp-grow, .cp-float, .cp-row, .cp-border::before, .cp-skeleton::after { animation: none !important; }
}
`;

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
      setDisplay(value * (1 - Math.pow(1 - t, 3)));
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
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20c.6-3.4 3.3-5 6.5-5s5.9 1.6 6.5 5 M17 4.5a3.2 3.2 0 0 1 0 6.2 M18.5 15.2c1.7.6 2.7 2.2 3 4.8",
  trend: "m3 17 6-6 4 4 8-8 M15 7h6v6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2",
  layers: "m12 3 9 5-9 5-9-5 9-5Z M3 13l9 5 9-5",
  bookmark: "M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.3-4.3",
  download: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
  refresh: "M4 4v6h6 M20 20v-6h-6 M5.5 14a7 7 0 0 0 12 2.5 M18.5 10a7 7 0 0 0-12-2.5",
  close: "M6 6l12 12 M18 6 6 18",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  mail: "M3 5h18v14H3Z m1 2.5 8 6 8-6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  copy: "M9 9h11v11H9Z M5 15V4h11",
  chevron: "m6 9 6 6 6-6",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  home: "M3 11l9-8 9 8 M5 10v10h14V10",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 8h.01",
  alert: "M12 4 3 20h18L12 4Z M12 10v4 M12 17h.01",
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

function Avatar({ student, size = "h-10 w-10 text-sm" }: { student: Student; size?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-extrabold text-white shadow-sm ${avatarTone(student.id)} ${size}`}
      aria-hidden="true"
    >
      {initials(student.full_name)}
    </span>
  );
}

function BarList({
  title,
  icon,
  items,
  tone,
  empty,
}: {
  title: string;
  icon: IconName;
  items: { label: string; value: number }[];
  tone: string;
  empty: string;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-slate-700" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">{item.value}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`cp-grow h-full rounded-full ${tone}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  icon,
  tone,
  delay,
  children,
}: {
  label: string;
  icon: IconName;
  tone: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <div
      className="cp-fade-up rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight tabular-nums text-slate-950">{children}</p>
    </div>
  );
}

/* ====================================================================== */
/*  Page                                                                   */
/* ====================================================================== */

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  async function loadStudents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/students", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const result = await response.json();

      if (response.status === 401) {
        window.location.assign("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Could not load student records.");
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  /* Drawer: lock page scroll, close with Escape, focus the close button. */
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSelected(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const students = useMemo(() => data?.students ?? [], [data]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(students.flatMap((student) => student.prediction_history.map((history) => history.category)))
      ).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = students.filter((student) => {
      const matchesSearch =
        !term ||
        student.full_name.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term) ||
        student.mobile.includes(term);

      const matchesCategory =
        categoryFilter === "ALL" ||
        student.prediction_history.some((history) => history.category === categoryFilter);

      return matchesSearch && matchesCategory;
    });

    if (sortBy === "name") return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name));
    if (sortBy === "predictions") return [...list].sort((a, b) => b.prediction_count - a.prediction_count);
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [students, search, categoryFilter, sortBy]);

  const totalPredictions = students.reduce((sum, student) => sum + student.prediction_count, 0);
  const allHistory = useMemo(() => students.flatMap((student) => student.prediction_history), [students]);

  const averagePercentile =
    allHistory.length > 0
      ? allHistory.reduce((sum, history) => sum + Number(history.student_percentile), 0) / allHistory.length
      : null;

  /* Chart data */
  const categoryBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const history of allHistory) counts.set(history.category, (counts.get(history.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [allHistory]);

  const percentileBars = useMemo(() => {
    const buckets = [
      { label: "Below 70", min: -Infinity, max: 70, value: 0 },
      { label: "70 – 80", min: 70, max: 80, value: 0 },
      { label: "80 – 90", min: 80, max: 90, value: 0 },
      { label: "90 – 95", min: 90, max: 95, value: 0 },
      { label: "95 – 100", min: 95, max: Infinity, value: 0 },
    ];
    for (const history of allHistory) {
      const value = Number(history.student_percentile);
      if (!Number.isFinite(value)) continue;
      const bucket = buckets.find((item) => value >= item.min && value < item.max);
      if (bucket) bucket.value += 1;
    }
    return buckets.map(({ label, value }) => ({ label, value }));
  }, [allHistory]);

  const branchBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const history of allHistory) {
      for (const branch of history.branch.split(", ")) {
        const name = branch.trim();
        if (!name || /^\+\d+ more$/.test(name)) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [allHistory]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = search.trim() !== "" || categoryFilter !== "ALL" || sortBy !== "newest";

  const selectedHistory = useMemo(
    () =>
      selected
        ? [...selected.prediction_history].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        : [],
    [selected]
  );

  const selectedAverage =
    selectedHistory.length > 0
      ? selectedHistory.reduce((sum, history) => sum + Number(history.student_percentile), 0) /
        selectedHistory.length
      : null;

  function resetFilters() {
    setSearch("");
    setCategoryFilter("ALL");
    setSortBy("newest");
    setPage(1);
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked */
    }
  }

  function downloadCsv() {
    const headers = [
      "Student ID",
      "Full Name",
      "Email",
      "Mobile",
      "Registered At",
      "Prediction Count",
      "Percentile",
      "Category",
      "Branch",
      "CAP Round",
      "City",
      "Predicted Colleges",
    ];

    // Exports the students currently shown (all students when no filter is active).
    const rows = filteredStudents.flatMap((student) => {
      if (!student.prediction_history.length) {
        return [[student.id, student.full_name, student.email, student.mobile, student.created_at, student.prediction_count, "", "", "", "", "", ""]];
      }

      return student.prediction_history.map((history) => [
        student.id,
        student.full_name,
        student.email,
        student.mobile,
        student.created_at,
        student.prediction_count,
        history.student_percentile,
        history.category,
        history.branch,
        history.cap_round,
        history.city ?? "",
        history.predictions.map((p) => p.college_name ?? p.institute_name ?? "").join("; "),
      ]);
    });

    // Prefix risky leading characters so spreadsheet apps never treat text as a formula.
    const csvValue = (value: unknown) => {
      const text = String(value ?? "");
      const safe = typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };

    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "college-predictor-students.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */
  return (
    <main
      className="min-h-screen overflow-x-clip bg-[#f4f7fc] text-slate-900 antialiased"
      style={{ fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif" }}
    >
      <style>{animationCss}</style>

      {/* ------------------------------ Top bar ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-700/25">
              <Icon name="cap" className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-black tracking-tight text-slate-950">
                College<span className="text-blue-700">Predictor</span>
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-700">
                <Icon name="shield" className="h-3 w-3" /> Admin console
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadStudents()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-700 disabled:opacity-60"
            >
              {loading ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />}
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!filteredStudents.length}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              title={hasFilters ? "Exports the students currently shown" : "Exports all students"}
            >
              <Icon name="download" className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Icon name="home" className="h-4 w-4" />
              <span className="hidden sm:inline">Predictor</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative isolate">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-white to-transparent"
          aria-hidden="true"
        />
        <div className="cp-float pointer-events-none absolute -right-24 top-0 -z-10 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Title */}
          <div className="cp-fade-up flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">
                College Predictor / Admin
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[#10264f] sm:text-4xl">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Students, admission profiles and college prediction history
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="cp-fade-up mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <span className="flex items-start gap-3">
                <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
                {error}
              </span>
              <button
                type="button"
                onClick={() => void loadStudents()}
                className="rounded-lg bg-white px-3.5 py-2 text-sm font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 hover:bg-rose-100"
              >
                Try again
              </button>
            </div>
          )}

          {loading && !data ? (
            <div className="mt-8 space-y-6" role="status" aria-label="Loading student records">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="cp-skeleton h-28 rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
              <div className="cp-skeleton h-96 rounded-2xl border border-slate-200 bg-white" />
            </div>
          ) : (
            data && (
              <>
                {/* Stats */}
                <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
                  <StatCard label="Registered students" icon="users" tone="bg-blue-50 text-blue-700" delay={0}>
                    <CountUp value={data.total_students ?? 0} />
                  </StatCard>
                  <StatCard label="Saved predictions" icon="bookmark" tone="bg-violet-50 text-violet-700" delay={80}>
                    <CountUp value={totalPredictions} />
                  </StatCard>
                  <StatCard label="Prediction records" icon="layers" tone="bg-emerald-50 text-emerald-700" delay={160}>
                    <CountUp value={allHistory.length} />
                  </StatCard>
                  <StatCard label="Average recorded percentile" icon="trend" tone="bg-orange-50 text-orange-700" delay={240}>
                    {averagePercentile === null ? "—" : <CountUp value={averagePercentile} decimals={2} />}
                  </StatCard>
                </section>

                {/* Insights */}
                <section className="mt-6 grid gap-4 lg:grid-cols-3" aria-label="Insights">
                  <BarList title="Predictions by category" icon="filter" items={categoryBars} tone="bg-gradient-to-r from-blue-500 to-indigo-500" empty="No predictions recorded yet." />
                  <BarList title="Percentile distribution" icon="trend" items={percentileBars} tone="bg-gradient-to-r from-emerald-500 to-teal-500" empty="No percentile data yet." />
                  <BarList title="Most searched branches" icon="layers" items={branchBars} tone="bg-gradient-to-r from-violet-500 to-fuchsia-500" empty="No branch searches yet." />
                </section>

                {/* Students table */}
                <section className="cp-border cp-fade-up mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Student records">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight">Student records</h2>
                      <p className="mt-1 text-sm text-slate-500" aria-live="polite">
                        Showing{" "}
                        <strong className="text-slate-900">
                          {filteredStudents.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                          {Math.min(currentPage * PAGE_SIZE, filteredStudents.length)}
                        </strong>{" "}
                        of <strong className="text-slate-900">{filteredStudents.length}</strong> students
                      </p>
                    </div>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                      >
                        <Icon name="refresh" className="h-4 w-4" /> Reset filters
                      </button>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_200px]">
                    <div className="relative">
                      <Icon
                        name="search"
                        className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={search}
                        onChange={(event) => {
                          setSearch(event.target.value);
                          setPage(1);
                        }}
                        placeholder="Search name, email or mobile…"
                        aria-label="Search students"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <select
                      value={categoryFilter}
                      onChange={(event) => {
                        setCategoryFilter(event.target.value);
                        setPage(1);
                      }}
                      aria-label="Filter by category"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="ALL">All categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sortBy}
                      onChange={(event) => {
                        setSortBy(event.target.value as SortKey);
                        setPage(1);
                      }}
                      aria-label="Sort students"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="newest">Newest first</option>
                      <option value="name">Name A–Z</option>
                      <option value="predictions">Most predictions</option>
                    </select>
                  </div>

                  {/* Desktop table */}
                  <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          {["ID", "Student", "Mobile", "Registered", "Predictions", ""].map((label) => (
                            <th key={label || "actions"} className="p-4 font-bold">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleStudents.map((student, index) => (
                          <tr
                            key={student.id}
                            className="cp-row cursor-pointer border-t border-slate-100 transition-colors hover:bg-blue-50/50"
                            style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
                            onClick={() => setSelected(student)}
                          >
                            <td className="p-4 font-semibold tabular-nums text-slate-500">#{student.id}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar student={student} />
                                <div className="min-w-0">
                                  <p className="truncate font-bold text-slate-900">{student.full_name}</p>
                                  <p className="truncate text-xs text-slate-500">{student.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 tabular-nums text-slate-700">{student.mobile}</td>
                            <td className="p-4 text-slate-600">{formatDate(student.created_at)}</td>
                            <td className="p-4">
                              <span
                                className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                  student.prediction_count > 0
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {student.prediction_count}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelected(student);
                                }}
                                className="group inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                              >
                                <Icon name="eye" className="h-3.5 w-3.5" /> View details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="mt-5 space-y-3 md:hidden">
                    {visibleStudents.map((student, index) => (
                      <article
                        key={student.id}
                        className="cp-row rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar student={student} size="h-11 w-11 text-sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-slate-900">{student.full_name}</p>
                            <p className="truncate text-xs text-slate-500">{student.email}</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                            {student.prediction_count}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                          #{student.id} · {student.mobile} · {formatDate(student.created_at)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelected(student)}
                          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <Icon name="eye" className="h-3.5 w-3.5" /> View details
                        </button>
                      </article>
                    ))}
                  </div>

                  {filteredStudents.length === 0 && (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                        <Icon name="search" className="h-6 w-6" />
                      </span>
                      <p className="mt-3 font-bold text-slate-800">No matching students found.</p>
                      <p className="mt-1 text-sm text-slate-500">Try a different name, email, mobile number, or category.</p>
                    </div>
                  )}

                  {pageCount > 1 && (
                    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        Page <strong className="text-slate-900">{currentPage}</strong> of{" "}
                        <strong className="text-slate-900">{pageCount}</strong>
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={currentPage <= 1}
                          onClick={() => setPage(currentPage - 1)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icon name="left" className="h-4 w-4" /> Previous
                        </button>
                        <button
                          type="button"
                          disabled={currentPage >= pageCount}
                          onClick={() => setPage(currentPage + 1)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next <Icon name="right" className="h-4 w-4" />
                        </button>
                      </div>
                    </nav>
                  )}
                </section>
              </>
            )
          )}
        </div>
      </div>

      {/* ------------------------------ Student details drawer ------------------------------ */}
      {selected && (
        <div
          className="cp-fade fixed inset-0 z-[100] flex justify-end bg-slate-950/50 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-drawer-title"
            className="cp-slide flex h-full w-full max-w-3xl flex-col overflow-hidden bg-[#f4f7fc] shadow-2xl"
          >
            {/* Drawer header */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#102b5b] via-blue-800 to-indigo-700 px-5 pb-8 pt-5 text-white sm:px-8">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" aria-hidden="true" />
              <div className="relative flex items-start justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Student profile</p>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close student details"
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mt-5 flex items-center gap-4">
                <Avatar student={selected} size="h-16 w-16 text-xl ring-4 ring-white/20" />
                <div className="min-w-0">
                  <h2 id="student-drawer-title" className="truncate text-2xl font-black tracking-tight">
                    {selected.full_name}
                  </h2>
                  <p className="mt-1 text-sm text-blue-100">
                    Student ID #{selected.id} · Registered {formatDate(selected.created_at)}
                  </p>
                </div>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => void copyEmail(selected.email)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 transition hover:bg-white/20"
                  title="Copy email"
                >
                  <Icon name={copied ? "check" : "mail"} className="h-4 w-4" />
                  {copied ? "Copied!" : selected.email}
                </button>
                <a
                  href={`tel:${selected.mobile}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 transition hover:bg-white/20"
                >
                  <Icon name="phone" className="h-4 w-4" /> {selected.mobile}
                </a>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-6 p-5 sm:p-8">
              {/* Mini stats */}
              <div className="mt-0 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: "Predictions", value: String(selected.prediction_count) },
                  { label: "Records", value: String(selectedHistory.length) },
                  { label: "Avg percentile", value: selectedAverage === null ? "—" : selectedAverage.toFixed(2) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-md">
                    <p className="text-2xl font-black tabular-nums text-slate-950">{stat.value}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Admission and prediction history</h3>

                {selectedHistory.length === 0 ? (
                  <p className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600">
                    <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    No saved predictions yet. The student&apos;s earlier predictions cannot be displayed unless they
                    were previously stored.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {selectedHistory.map((history, index) => (
                      <details
                        key={history.id}
                        open={index === 0}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:shadow-md"
                      >
                        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 marker:hidden hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                              <Icon name="clock" className="h-4 w-4 text-slate-400" />
                              {formatDateTime(history.created_at)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                                {Number(history.student_percentile).toFixed(3)} percentile
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{history.category}</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Round {history.cap_round}</span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                {history.city || "Any city"}
                              </span>
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                {history.predictions.length} colleges
                              </span>
                            </div>
                          </div>
                          <Icon
                            name="chevron"
                            className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                          />
                        </summary>

                        <div className="border-t border-slate-100 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preferred branch</p>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{history.branch}</p>

                          <h4 className="mt-4 text-sm font-extrabold text-slate-900">
                            Predicted colleges ({history.predictions.length})
                          </h4>

                          {history.predictions.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">No colleges were returned for this prediction.</p>
                          ) : (
                            <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200">
                              <table className="w-full min-w-[620px] text-left text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                  <tr>
                                    {["College", "Code", "Branch", "Cutoff", "Estimate"].map((label) => (
                                      <th key={label} className="p-3 font-bold">
                                        {label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {history.predictions.map((college, i) => (
                                    <tr key={`${college.institute_code ?? i}-${i}`} className="border-t border-slate-100 align-top hover:bg-blue-50/40">
                                      <td className="p-3 font-semibold text-slate-900">
                                        {college.college_name ?? college.institute_name ?? "Not available"}
                                      </td>
                                      <td className="p-3 tabular-nums text-slate-600">{college.institute_code ?? "—"}</td>
                                      <td className="p-3 text-slate-600">{college.branch_name ?? history.branch}</td>
                                      <td className="p-3 tabular-nums text-slate-700">
                                        {college.historical_cutoff_percentile ?? "—"}
                                      </td>
                                      <td className="p-3">
                                        {college.prediction ? (
                                          <span
                                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${chanceClasses(college.prediction)}`}
                                          >
                                            {college.prediction}
                                          </span>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}