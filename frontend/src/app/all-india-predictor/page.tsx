"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const PAGE_SIZE = 20;

/* ====================================================================== */
/*  Types                                                                  */
/* ====================================================================== */

type CutoffRecord = {
  institute_code: string;
  institute_name: string;
  choice_code: string;
  course_name: string;
  academic_year: string;
  cap_round: number;
  all_india_merit_rank: number;
  percentile: number | string;
  merit_exam: string;
  allotment_type: string;
  seat_type: string;
  source_file: string;
  student_percentile?: number;
  percentile_difference?: number;
  historical_comparison?: string;
};

type FilterOptions = {
  cities: string[];
  departments: string[];
};

type ApiResponse = {
  academic_year: string;
  exam: string;
  matched_exam_labels: string[];
  cap_round: number | null;
  branch: string | null;
  student_percentile: number | null;
  total_results: number;
  results: CutoffRecord[];
  disclaimer: string;
  cities: string[];
  departments: string[];
};

type CompareFilter = "all" | "above" | "below";
type SortBy = "default" | "percentile-desc" | "percentile-asc" | "rank-asc";

const ABOVE = "AT_OR_ABOVE_HISTORICAL_CUTOFF";

/* ====================================================================== */
/*  Helpers                                                                */
/* ====================================================================== */

const FIELD_CLASS =
  "min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

const LABEL_CLASS = "mb-2 block text-sm font-semibold text-slate-800";

function formatPercentile(value: number | string) {
  return Number(value).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

/* ====================================================================== */
/*  Animations                                                             */
/* ====================================================================== */

const animationCss = `
@property --cp-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes cp-spin-angle { to { --cp-angle: 360deg; } }
@keyframes cp-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes cp-pop { from { opacity: 0; transform: scale(.94) translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes cp-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-18px,0); } }
@keyframes cp-shine { from { background-position: 0% center; } to { background-position: 100% center; } }
@keyframes cp-shimmer { to { transform: translateX(100%); } }
@keyframes cp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.cp-fade-up { animation: cp-fade-up .7s cubic-bezier(.2,.7,.2,1) both; }
.cp-fade { animation: cp-fade .25s ease both; }
.cp-pop { animation: cp-pop .3s cubic-bezier(.2,.8,.2,1) both; }
.cp-row { animation: cp-fade-up .5s cubic-bezier(.2,.7,.2,1) both; }
.cp-float { animation: cp-float 9s ease-in-out infinite; }
.cp-float-slow { animation: cp-float 13s ease-in-out infinite reverse; }
.cp-shine { background-size: 200% auto; animation: cp-shine 5s ease-in-out infinite alternate; }
.cp-grow { transform-origin: left center; animation: cp-grow .9s cubic-bezier(.2,.7,.2,1) both; }

.cp-reveal { opacity: 0; transform: translateY(26px); transition: opacity .65s ease, transform .65s cubic-bezier(.2,.7,.2,1); }
.cp-reveal.cp-in { opacity: 1; transform: none; }

.cp-border { position: relative; }
.cp-border::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 2px; pointer-events: none;
  background: conic-gradient(from var(--cp-angle), transparent 0%, transparent 58%, #60a5fa 72%, #6366f1 84%, #a78bfa 94%, transparent 100%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
  animation: cp-spin-angle 4.5s linear infinite;
}
.cp-border-hover::before { opacity: 0; transition: opacity .35s ease; }
.cp-border-hover:hover::before, .cp-border-hover:focus-within::before { opacity: 1; }

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

@media (prefers-reduced-motion: reduce) {
  .cp-reveal { opacity: 1; transform: none; transition: none; }
  .cp-fade-up, .cp-fade, .cp-pop, .cp-row, .cp-float, .cp-float-slow, .cp-shine, .cp-grow, .cp-border::before, .cp-skeleton::after { animation: none !important; }
  .cp-sheen::after { display: none; }
}
`;

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
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

function CountUp({ value }: { value: number }) {
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
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display.toLocaleString("en-IN")}</>;
}

/* ====================================================================== */
/*  Icons                                                                  */
/* ====================================================================== */

const ICONS = {
  cap: "m2 9 10-5 10 5-10 5L2 9Z M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5 M22 9v6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.3-4.3",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  left: "m15 6-6 6 6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 8h.01",
  warning: "M12 4 3 20h18L12 4Z M12 10v4 M12 17h.01",
  layers: "m12 3 9 5-9 5-9-5 9-5Z M3 13l9 5 9-5",
  building: "M3 21h18 M5 21V9l7-5 7 5v12 M9 21v-6h6v6",
  pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
  trend: "m3 17 6-6 4 4 8-8 M15 7h6v6",
  calendar: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4",
  reset: "M4 4v6h6 M4.5 15a8 8 0 1 0 2-8.3L4 10",
  filter: "M3 5h18l-7 8v6l-4 2v-8L3 5Z",
  award: "M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z M8.5 14 7 21l5-3 5 3-1.5-7",
  close: "M6 6l12 12 M18 6 6 18",
  chevron: "m6 9 6 6 6-6",
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

/** Shows where the student's percentile sits against the historical cutoff. */
function CutoffMeter({ diff, above }: { diff: number; above: boolean }) {
  const value = Number.isFinite(diff) ? diff : 0;
  const position = 50 + (Math.max(-10, Math.min(10, value)) / 10) * 50;
  const left = Math.min(50, position);
  const width = Math.abs(position - 50);
  const tone = above ? "bg-emerald-500" : "bg-amber-400";

  return (
    <div className="min-w-0 flex-1" title={`You are ${Math.abs(value).toFixed(3)} percentile ${above ? "above" : "below"} the cutoff`}>
      <div className="relative h-1.5 rounded-full bg-slate-100">
        <span className={`absolute top-0 h-full rounded-full opacity-40 ${tone}`} style={{ left: `${left}%`, width: `${width}%` }} />
        <span className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-y-1/2 bg-slate-400" />
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-[left] duration-700 ease-out ${tone}`}
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

/* ====================================================================== */
/*  Page                                                                   */
/* ====================================================================== */

export default function AllIndiaPredictorPage() {
  /* ---------- Search form ---------- */
  const [exam, setExam] = useState("JEE");
  const [percentile, setPercentile] = useState("");
  const [round, setRound] = useState("");
  const [branch, setBranch] = useState("");
  const [city, setCity] = useState("");
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ cities: [], departments: [] });
  const [filtersLoading, setFiltersLoading] = useState(true);

  /* ---------- Results ---------- */
  const [results, setResults] = useState<CutoffRecord[]>([]);
  const [responseInfo, setResponseInfo] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  /* ---------- Result tools ---------- */
  const [resultSearch, setResultSearch] = useState("");
  const [compareFilter, setCompareFilter] = useState<CompareFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("default");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showTop, setShowTop] = useState(false);

  /* Load the city and department lists once. */
  useEffect(() => {
    let cancelled = false;

    async function loadFilterOptions() {
      try {
        const response = await fetch(`${API_URL}/api/all-india/filters?academic_year=2025`);
        if (!response.ok) throw new Error("Unable to load filter options.");

        const data: FilterOptions = await response.json();
        if (!cancelled) {
          setFilterOptions({
            cities: data.cities || [],
            departments: data.departments || [],
          });
        }
      } catch (err) {
        console.error("Filter options error:", err);
      } finally {
        if (!cancelled) setFiltersLoading(false);
      }
    }

    loadFilterOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 700);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      percentile.trim() &&
      (!Number.isFinite(Number(percentile)) || Number(percentile) < 0 || Number(percentile) > 100)
    ) {
      setError("Enter a valid percentile between 0 and 100.");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);
    setResults([]);
    setResponseInfo(null);
    setResultSearch("");
    setCompareFilter("all");
    setSortBy("default");

    const params = new URLSearchParams({
      exam,
      academic_year: "2025",
      limit: "500",
    });

    if (round) params.set("cap_round", round);
    if (branch) params.set("branch", branch);
    if (city) params.set("city", city);
    if (percentile.trim()) params.set("student_percentile", percentile.trim());

    try {
      const response = await fetch(`${API_URL}/api/all-india/cutoffs?${params.toString()}`);

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setResults(data.results || []);
      setResponseInfo(data);

      window.setTimeout(() => {
        document.getElementById("all-india-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to connect to the All India Predictor API."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setExam("JEE");
    setPercentile("");
    setRound("");
    setBranch("");
    setCity("");
    setResults([]);
    setResponseInfo(null);
    setError("");
    setSearched(false);
    setResultSearch("");
    setCompareFilter("all");
    setSortBy("default");
  }

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */
  const hasComparison = results.some((item) => item.historical_comparison !== undefined);
  const aboveCount = results.filter((item) => item.historical_comparison === ABOVE).length;
  const belowCount = results.filter(
    (item) => item.historical_comparison !== undefined && item.historical_comparison !== ABOVE
  ).length;
  const collegeCount = useMemo(
    () => new Set(results.map((item) => item.institute_code)).size,
    [results]
  );

  const filteredResults = useMemo(() => {
    const term = resultSearch.trim().toLowerCase();

    const list = results.filter((item) => {
      if (compareFilter === "above" && item.historical_comparison !== ABOVE) return false;
      if (compareFilter === "below" && (item.historical_comparison === undefined || item.historical_comparison === ABOVE)) {
        return false;
      }
      if (!term) return true;
      return (
        item.institute_name.toLowerCase().includes(term) ||
        item.course_name.toLowerCase().includes(term) ||
        String(item.institute_code).toLowerCase().includes(term) ||
        String(item.choice_code).toLowerCase().includes(term)
      );
    });

    if (sortBy === "percentile-desc") return [...list].sort((a, b) => Number(b.percentile) - Number(a.percentile));
    if (sortBy === "percentile-asc") return [...list].sort((a, b) => Number(a.percentile) - Number(b.percentile));
    if (sortBy === "rank-asc") return [...list].sort((a, b) => Number(a.all_india_merit_rank) - Number(b.all_india_merit_rank));
    return list;
  }, [results, resultSearch, compareFilter, sortBy]);

  // Start from the first page whenever the visible list changes.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results, resultSearch, compareFilter, sortBy]);

  const visibleResults = filteredResults.slice(0, visibleCount);
  const resultTotal = responseInfo?.total_results ?? results.length;

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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="/" className="inline-flex items-center gap-2.5" aria-label="CollegePredictor home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-700/25 transition-transform duration-300 hover:rotate-6 hover:scale-105">
              <Icon name="cap" className="h-5 w-5" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-950">
              College<span className="text-blue-700">Predictor</span>
            </span>
          </a>

          <a
            href="/predict"
            className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-700"
          >
            <Icon name="left" className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Main Predictor</span>
            <span className="sm:hidden">Back</span>
          </a>
        </div>
      </header>

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="relative isolate overflow-hidden border-b border-blue-100 bg-gradient-to-br from-[#f8fbff] via-white to-[#e8f0ff]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          aria-hidden="true"
        />
        <div className="cp-float pointer-events-none absolute -right-24 -top-10 -z-10 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" aria-hidden="true" />
        <div className="cp-float-slow pointer-events-none absolute -left-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" aria-hidden="true" />

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:px-8">
          <div className="min-w-0">
            <span className="cp-fade-up inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-blue-800 shadow-sm sm:text-xs">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
              </span>
              All India CAP admissions · 2025 data
            </span>

            <h1
              className="cp-fade-up mt-5 text-[2.3rem] font-black leading-[1.07] tracking-[-0.04em] text-[#10264f] sm:text-5xl lg:text-[3.3rem]"
              style={{ animationDelay: "100ms" }}
            >
              All India Engineering
              <br />
              <span className="cp-shine bg-gradient-to-r from-blue-700 via-violet-500 to-indigo-600 bg-clip-text text-transparent">
                College Predictor
              </span>
            </h1>

            <p className="cp-fade-up mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base" style={{ animationDelay: "200ms" }}>
              Explore historical All India CAP cutoff records for JEE and MHT-CET. Compare your percentile with
              previous admission trends and discover colleges and courses.
            </p>

            <ul className="cp-fade-up mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-700" style={{ animationDelay: "300ms" }}>
              {["JEE and MHT-CET records", "Filter by round, city and course", "Compare with your percentile"].map((text) => (
                <li key={text} className="inline-flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { value: "6,480", label: "Source records", icon: "layers" as IconName, tone: "bg-blue-50 text-blue-700" },
              { value: "4", label: "CAP rounds", icon: "trend" as IconName, tone: "bg-violet-50 text-violet-700" },
              { value: "2025", label: "Academic year", icon: "calendar" as IconName, tone: "bg-emerald-50 text-emerald-700" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="cp-fade-up rounded-2xl border border-white bg-white/85 p-4 shadow-[0_8px_25px_rgba(30,64,175,0.07)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10"
                style={{ animationDelay: `${250 + index * 100}ms` }}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${stat.tone}`}>
                  <Icon name={stat.icon} className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{stat.value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Main content ------------------------------ */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[370px_minmax(0,1fr)] lg:px-8">
        {/* Search panel */}
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="cp-border cp-fade-up relative z-20 rounded-3xl border border-white bg-white p-5 shadow-[0_24px_70px_rgba(30,64,175,0.12)] ring-1 ring-blue-950/5 sm:p-6">
              <div className="absolute inset-x-0 top-0 h-1.5 rounded-t-3xl bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" aria-hidden="true" />

              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Prediction search</p>
              <h2 className="mt-2 text-xl font-extrabold tracking-tight">Student details</h2>
              <p className="mt-1 text-sm text-slate-500">Enter your exam details to explore historical cutoffs.</p>

              <form onSubmit={handleSearch} className="mt-6 space-y-5">
                {/* Exam */}
                <div>
                  <span className={LABEL_CLASS} id="exam-label">
                    Select entrance exam
                  </span>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-labelledby="exam-label">
                    {["JEE", "MHT-CET"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={exam === item}
                        onClick={() => setExam(item)}
                        className={`rounded-lg px-3 py-2.5 text-sm font-bold transition duration-200 ${
                          exam === item
                            ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Percentile */}
                <div>
                  <label htmlFor="percentile" className={LABEL_CLASS}>
                    Your percentile <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="percentile"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="100"
                    step="0.000001"
                    placeholder="Example: 95.456789"
                    value={percentile}
                    onChange={(e) => {
                      setPercentile(e.target.value);
                      if (error) setError("");
                    }}
                    className={FIELD_CLASS}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Enter a percentile between 0 and 100 to compare with each cutoff.</p>
                </div>

                {/* CAP round */}
                <div>
                  <label htmlFor="round" className={LABEL_CLASS}>
                    CAP round
                  </label>
                  <select id="round" value={round} onChange={(e) => setRound(e.target.value)} className={FIELD_CLASS}>
                    <option value="">All CAP rounds</option>
                    <option value="1">CAP Round 1</option>
                    <option value="2">CAP Round 2</option>
                    <option value="3">CAP Round 3</option>
                    <option value="4">CAP Round 4</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className={LABEL_CLASS}>
                    Select city <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  </label>
                  <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className={FIELD_CLASS}>
                    <option value="">All cities</option>
                    {filterOptions.cities.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                  {filtersLoading ? (
                    <p className="mt-1.5 flex items-center gap-2 text-xs text-blue-700">
                      <Spinner className="h-3 w-3" /> Loading cities...
                    </p>
                  ) : (
                    filterOptions.cities.length === 0 && (
                      <p className="mt-1.5 text-xs text-amber-600">Verified city data is not available yet.</p>
                    )
                  )}
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="branch" className={LABEL_CLASS}>
                    Department / course <span className="ml-1 font-normal text-slate-400">(optional)</span>
                  </label>
                  <select id="branch" value={branch} onChange={(e) => setBranch(e.target.value)} className={FIELD_CLASS}>
                    <option value="">All departments</option>
                    {filterOptions.departments.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="cp-sheen inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-700/25 transition duration-200 hover:-translate-y-0.5 hover:from-blue-800 hover:to-indigo-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <>
                        <Spinner /> Searching colleges...
                      </>
                    ) : (
                      <>
                        Find Colleges <Icon name="arrow" className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Icon name="reset" className="h-4 w-4" /> Reset filters
                  </button>
                </div>
              </form>
            </div>

            {/* How it works */}
            <div className="mt-5 hidden rounded-2xl border border-blue-100 bg-blue-50/70 p-5 lg:block">
              <h3 className="font-extrabold text-blue-900">How it works</h3>
              <ol className="mt-3 space-y-2.5 text-sm leading-6 text-blue-900/80">
                {[
                  "Select JEE or MHT-CET.",
                  "Enter your percentile if available.",
                  "Select a CAP round or search all rounds.",
                  "Explore historical college cutoff records.",
                ].map((step, index) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-200 text-[11px] font-black text-blue-900">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </aside>

        {/* Results */}
        <section id="all-india-results" className="min-w-0 scroll-mt-24" aria-label="College results">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">Historical admission data</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">College results</h2>
              <p className="mt-1 text-sm text-slate-500">Explore verified 2025 All India CAP cutoff records.</p>
            </div>

            {responseInfo && (
              <div className="cp-pop rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">
                {resultTotal.toLocaleString("en-IN")} records returned
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="cp-fade-up mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0" />
              <span>
                <strong>Something went wrong:</strong> {error}
              </span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="mt-6 space-y-4" role="status" aria-label="Finding historical college records">
              <div className="cp-fade flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <Spinner className="h-5 w-5 text-blue-700" />
                <div>
                  <p className="font-semibold text-blue-800">Finding historical college records...</p>
                  <p className="text-xs text-slate-500">Please wait.</p>
                </div>
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="cp-skeleton rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="mt-4 h-4 w-3/5 rounded bg-slate-200" />
                  <div className="mt-3 h-3 w-2/5 rounded bg-slate-100" />
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="h-14 rounded-xl bg-slate-100" />
                    <div className="h-14 rounded-xl bg-slate-100" />
                    <div className="h-14 rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Initial state */}
          {!loading && !searched && (
            <Reveal className="mt-6">
              <div className="cp-border rounded-3xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:px-10">
                <span className="cp-float mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon name="cap" className="h-8 w-8" />
                </span>
                <h3 className="mt-5 text-2xl font-bold">Start your college search</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
                  Choose your entrance exam, enter your percentile and apply filters to discover historical All
                  India CAP college cutoffs.
                </p>
                <a
                  href="#exam-label"
                  className="cp-sheen mt-6 inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-blue-800 lg:hidden"
                >
                  Go to the search form <Icon name="arrow" className="h-4 w-4 -rotate-90" />
                </a>
              </div>
            </Reveal>
          )}

          {/* Empty state */}
          {!loading && searched && !error && results.length === 0 && (
            <div className="cp-fade-up mt-6 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <Icon name="search" className="h-7 w-7" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-slate-900">No matching records found</h3>
              <p className="mt-2 text-sm text-slate-500">Try changing your exam, CAP round, city or course filter.</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-5 rounded-xl bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <>
              {/* Applied filters */}
              <div className="cp-fade mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-800">{exam}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">Academic year 2025</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                  {round ? `CAP Round ${round}` : "All rounds"}
                </span>
                <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                  {city || "All cities"}
                </span>
                <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1.5 text-slate-700" title={branch || "All departments"}>
                  {branch || "All departments"}
                </span>
              </div>

              {/* Summary */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Records returned", value: results.length, tone: "text-slate-950" },
                  { label: "Colleges", value: collegeCount, tone: "text-blue-700" },
                  { label: "At / above cutoff", value: aboveCount, tone: "text-emerald-700", hide: !hasComparison },
                  { label: "Below cutoff", value: belowCount, tone: "text-amber-600", hide: !hasComparison },
                ]
                  .filter((card) => !card.hide)
                  .map((card, index) => (
                    <Reveal key={card.label} delay={index * 90} className="h-full">
                      <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                        <p className="text-sm text-slate-500">{card.label}</p>
                        <p className={`mt-2 text-3xl font-extrabold tabular-nums ${card.tone}`}>
                          <CountUp value={card.value} />
                        </p>
                      </div>
                    </Reveal>
                  ))}

                {!hasComparison && (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-5 sm:col-span-2">
                    <p className="flex items-start gap-2 text-sm leading-6 text-blue-900">
                      <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                      Add your percentile in the search form to see how you compare with each cutoff.
                    </p>
                  </div>
                )}
              </div>

              {/* Tools */}
              <div className="z-30 mt-5 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur lg:sticky lg:top-[4.5rem]">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative xl:w-72">
                    <Icon
                      name="search"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="search"
                      value={resultSearch}
                      onChange={(e) => setResultSearch(e.target.value)}
                      placeholder="Search college, course or code..."
                      aria-label="Search results"
                      className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  {hasComparison && (
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          { key: "all", label: "All", count: results.length },
                          { key: "above", label: "At / above", count: aboveCount },
                          { key: "below", label: "Below", count: belowCount },
                        ] as { key: CompareFilter; label: string; count: number }[]
                      ).map((chip) => (
                        <button
                          key={chip.key}
                          type="button"
                          onClick={() => setCompareFilter(chip.key)}
                          aria-pressed={compareFilter === chip.key}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition duration-200 active:scale-95 ${
                            compareFilter === chip.key
                              ? "border-blue-700 bg-blue-700 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                          }`}
                        >
                          {chip.label}
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${compareFilter === chip.key ? "bg-white/20" : "bg-slate-100"}`}>
                            {chip.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    aria-label="Sort results"
                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="default">Sort: Default order</option>
                    <option value="percentile-desc">Sort: Percentile high → low</option>
                    <option value="percentile-asc">Sort: Percentile low → high</option>
                    <option value="rank-asc">Sort: Best merit rank first</option>
                  </select>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-500" aria-live="polite">
                Showing <span className="font-bold text-slate-800">{Math.min(visibleCount, filteredResults.length)}</span> of{" "}
                <span className="font-bold text-slate-800">{filteredResults.length}</span> records
              </p>

              {filteredResults.length === 0 ? (
                <div className="cp-fade-up mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="font-bold text-slate-800">No records match these filters.</p>
                  <p className="mt-1 text-sm text-slate-500">Try a different search term or choose “All”.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setResultSearch("");
                      setCompareFilter("all");
                    }}
                    className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {visibleResults.map((college, index) => {
                    const comparison = college.historical_comparison;
                    const difference = college.percentile_difference;
                    const isAbove = comparison === ABOVE;

                    return (
                      <article
                        key={`${college.choice_code}-${college.cap_round}-${index}`}
                        className="cp-row group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 md:p-6"
                        style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
                                {college.choice_code}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                CAP Round {college.cap_round}
                              </span>
                            </div>

                            <h3 className="text-lg font-bold leading-7 text-slate-900">{college.institute_name}</h3>
                            <p className="mt-1 flex items-start gap-2 text-sm text-slate-600">
                              <Icon name="book" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                              {college.course_name}
                            </p>
                          </div>

                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-800">
                            <Icon name="award" className="h-3.5 w-3.5" /> All India Quota
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">Historical merit rank</p>
                            <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">
                              {Number(college.all_india_merit_rank).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <div className="rounded-xl bg-blue-50/70 p-3">
                            <p className="text-xs text-slate-500">Historical percentile</p>
                            <p className="mt-1 text-lg font-extrabold tabular-nums text-blue-800">
                              {formatPercentile(college.percentile)}
                            </p>
                          </div>
                          <div className="col-span-2 rounded-xl bg-slate-50 p-3 md:col-span-1">
                            <p className="text-xs text-slate-500">Merit exam</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{college.merit_exam}</p>
                          </div>
                        </div>

                        {comparison && difference !== undefined && (
                          <div
                            className={`mt-4 rounded-xl border p-4 ${
                              isAbove ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-500">Your percentile comparison</p>
                                <p className="mt-1 text-sm font-bold text-slate-800">
                                  Difference: {difference >= 0 ? "+" : ""}
                                  {difference.toFixed(6)}
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                  isAbove ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isAbove ? "At / above historical cutoff" : "Below historical cutoff"}
                              </span>
                            </div>
                            <div className="mt-4">
                              <CutoffMeter diff={difference} above={isAbove} />
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                          <span>Institute code: {college.institute_code}</span>
                          <span>Seat type: {college.seat_type}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {visibleCount < filteredResults.length && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className="rounded-xl border border-blue-200 bg-white px-6 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 active:scale-[0.98]"
                  >
                    Show {Math.min(PAGE_SIZE, filteredResults.length - visibleCount)} more
                  </button>
                </div>
              )}

              <p className="mt-5 text-center text-xs text-slate-500">
                Showing up to 500 matching records. Refine your filters to narrow your search.
              </p>
            </>
          )}

          {/* Disclaimer */}
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Icon name="warning" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">Important admission disclaimer</p>
              <p className="mt-1 text-xs leading-6 text-amber-900/80">
                {responseInfo?.disclaimer ||
                  "This tool provides historical cutoff comparisons based on 2025 data. Historical results do not guarantee admission in future CAP rounds. Actual allotment depends on merit, seat availability, category, eligibility and admission rules."}
              </p>
            </div>
          </div>
        </section>
      </div>

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
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="inline-flex items-center gap-2.5 text-lg font-black tracking-tight text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <Icon name="cap" className="h-5 w-5" />
            </span>
            College<span className="text-blue-400">Predictor</span>
          </p>
          <p className="text-xs text-slate-400">© 2026 CollegePredictor. All rights reserved.</p>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 transition hover:text-white">
            Back to Main Predictor <Icon name="arrow" className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </main>
  );
}