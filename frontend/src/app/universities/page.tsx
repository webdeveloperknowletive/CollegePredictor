"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import institutionsData from "@/data/universities.json";

/* ====================================================================== */
/*  Types and data                                                         */
/* ====================================================================== */

type Institution = {
  serial: number | null;
  instituteCode: number | string | null;
  name: string | null;
  status: string | null;
  intake: number | null;
  established: number | null;
  website: string | null;
  place: string | null;
  city: string | null;
  email: string | null;
  resourcePerson: string | null;
  phone: string | null;
  naacRating: string | null;
  nep2020: string | null;
  fees: string | null;
  hostel: string | null;
  hostelFor: string | null;
  hostelStrength: number | null;
  nearbyPg: string | null;
  placementMentioned: string | null;
  tpoName: string | null;
  tpoPhone: string | number | null;
  tpoEmail: string | null;
  studentsPlaced: number | null;
  highestPackage: string | null;
  averagePackage: string | null;
  companiesVisited: number | null;
  companiesLink: string | null;
  accreditationLink: string | null;
};

type Row = Institution & { uid: number };

const institutions: Row[] = (institutionsData as Institution[])
  .filter((item) => Boolean(item.name?.trim()) && (item.serial != null || item.instituteCode != null))
  .map((item, uid) => ({ ...item, uid }));

const PAGE_SIZE = 12;
const ALL_CITIES = "All cities";
const ALL_TYPES = "All institution types";

type SortKey = "sheet" | "intake" | "newest" | "oldest" | "name";

/* ====================================================================== */
/*  Helpers                                                                */
/* ====================================================================== */

function isEmpty(value: unknown) {
  return value === null || value === undefined || String(value).trim() === "";
}

function show(value: unknown) {
  return isEmpty(value) ? "Not listed" : String(value);
}

function yes(value: string | null) {
  if (!value) return "Not listed";
  const v = value.trim().toLowerCase();
  if (["y", "yes", "true"].includes(v)) return "Available";
  if (["n", "no", "false"].includes(v)) return "Not listed";
  return value;
}

function isYes(value: string | null) {
  return !!value && ["y", "yes", "true"].includes(value.trim().toLowerCase());
}

function externalUrl(value: string | null) {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function singleEmail(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(trimmed) ? trimmed : null;
}

function singlePhone(value: unknown) {
  if (isEmpty(value)) return null;
  const digits = String(value).replace(/[^\d+]/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

function initials(name: string | null) {
  return (name ?? "")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "CP";
}

function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
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
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M18 6 6 18",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.3-4.3",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  chevron: "m6 9 6 6 6-6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  rupee: "M6 4h12 M6 9h12 M9 4c5 0 5 7 0 7H6l8 9",
  calendar: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20c.6-3.4 3.3-5 6.5-5s5.9 1.6 6.5 5 M17 4.5a3.2 3.2 0 0 1 0 6.2 M18.5 15.2c1.7.6 2.7 2.2 3 4.8",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  mail: "M3 5h18v14H3Z m1 2.5 8 6 8-6",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  award: "M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z M8.5 14 7 21l5-3 5 3-1.5-7",
  bed: "M3 18V8 M3 14h18v4 M21 14v-2a3 3 0 0 0-3-3h-7v5",
  briefcase: "M4 8h16v11H4Z M9 8V5h6v3 M4 13h16",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 8h.01",
  reset: "M4 4v6h6 M4.5 15a8 8 0 1 0 2-8.3L4 10",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
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

const NAV_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/predict", label: "Predict Colleges", icon: "target" },
  { href: "/about", label: "About", icon: "info" },
  { href: "/universities", label: "Universities", icon: "building" },
  { href: "/student-guide", label: "Student Guide", icon: "book" },
];

const SELECT_CLASS =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

/* ====================================================================== */
/*  Page                                                                   */
/* ====================================================================== */

export default function UniversitiesPage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(ALL_CITIES);
  const [type, setType] = useState(ALL_TYPES);
  const [sort, setSort] = useState<SortKey>("sheet");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const cities = useMemo(
    () =>
      Array.from(new Set(institutions.map((item) => item.city).filter((v): v is string => Boolean(v)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    []
  );
  const types = useMemo(
    () =>
      Array.from(new Set(institutions.map((item) => item.status).filter((v): v is string => Boolean(v)))).sort((a, b) =>
        a.localeCompare(b)
      ),
    []
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = institutions.filter((item) => {
      const haystack = [item.name, item.instituteCode, item.city, item.place, item.status, item.naacRating, item.website]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return (
        (!q || haystack.includes(q)) &&
        (city === ALL_CITIES || item.city === city) &&
        (type === ALL_TYPES || item.status === type)
      );
    });

    if (sort === "intake") result.sort((a, b) => (b.intake ?? -1) - (a.intake ?? -1));
    if (sort === "newest") result.sort((a, b) => (b.established ?? 0) - (a.established ?? 0));
    if (sort === "oldest") result.sort((a, b) => (a.established ?? 9999) - (b.established ?? 9999));
    if (sort === "name") result.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (sort === "sheet") result.sort((a, b) => (a.serial ?? 99999) - (b.serial ?? 99999));
    return result;
  }, [query, city, type, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFilters = query.trim() !== "" || city !== ALL_CITIES || type !== ALL_TYPES || sort !== "sheet";

  // Close the mobile menu with Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  function resetFilters() {
    setQuery("");
    setCity(ALL_CITIES);
    setType(ALL_TYPES);
    setSort("sheet");
    setPage(1);
    setExpanded(null);
  }

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), pageCount));
    setExpanded(null);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main
      className="min-h-screen bg-[#f4f7fc] text-slate-900 antialiased"
      style={{ fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif" }}
    >
      {/* ------------------------------ Navigation ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CollegePredictor home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-700/25">
              <Icon name="cap" className="h-5 w-5" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-950">
              College<span className="text-blue-700">Predictor</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((item) => {
              const active = item.href === "/universities";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-lg sm:px-6 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <Icon name={item.icon} className="h-5 w-5 text-blue-600" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#f8fbff] via-white to-[#e8f0ff]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -right-24 -top-10 -z-10 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" aria-hidden="true" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end lg:px-8 lg:pb-28 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-800 shadow-sm sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Maharashtra institution directory
            </span>

            <h1 className="mt-5 max-w-3xl text-[2.3rem] font-black leading-[1.07] tracking-[-0.04em] text-[#10264f] sm:text-5xl lg:text-[3.4rem]">
              Find the right{" "}
              <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                college or university.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Explore engineering institutions with their location, intake, fees, facilities, accreditation,
              and placement information, all in one place.
            </p>

            <ul className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold text-slate-700">
              {[
                { icon: "globe", text: "Official website links" },
                { icon: "rupee", text: "Fees and hostel details" },
                { icon: "briefcase", text: "Placement information" },
              ].map((chip) => (
                <li
                  key={chip.text}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 shadow-sm"
                >
                  <Icon name={chip.icon as IconName} className="h-4 w-4 text-blue-600" />
                  {chip.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { label: "Institutions", value: institutions.length, icon: "building" },
              { label: "Cities", value: cities.length, icon: "pin" },
              { label: "Types", value: types.length, icon: "award" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white bg-white/85 p-4 shadow-[0_8px_25px_rgba(30,64,175,0.07)] backdrop-blur"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <Icon name={stat.icon as IconName} className="h-[18px] w-[18px]" />
                </span>
                <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{stat.value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Filters + list ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-14 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(240px,1.6fr)_1fr_1fr_1fr]">
            <div>
              <label htmlFor="uni-search" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Search institutions
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-400">
                  <Icon name="search" className="h-[18px] w-[18px]" />
                </span>
                <input
                  id="uni-search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                    setExpanded(null);
                  }}
                  placeholder="Name, code, city, or status..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-10 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="uni-city" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                City / place
              </label>
              <select
                id="uni-city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setPage(1);
                  setExpanded(null);
                }}
                className={SELECT_CLASS}
              >
                <option>{ALL_CITIES}</option>
                {cities.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="uni-type" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Institution type
              </label>
              <select
                id="uni-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                  setExpanded(null);
                }}
                className={SELECT_CLASS}
              >
                <option>{ALL_TYPES}</option>
                {types.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="uni-sort" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Sort by
              </label>
              <select
                id="uni-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as SortKey);
                  setPage(1);
                  setExpanded(null);
                }}
                className={SELECT_CLASS}
              >
                <option value="sheet">Default order</option>
                <option value="intake">Largest intake</option>
                <option value="newest">Recently established</option>
                <option value="oldest">Oldest established</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600" aria-live="polite">
              Showing{" "}
              <strong className="text-slate-950">
                {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
              </strong>{" "}
              of <strong className="text-slate-950">{filtered.length}</strong> matching institutions
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {city !== ALL_CITIES && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-blue-800">
                  {city}
                  <button
                    type="button"
                    onClick={() => setCity(ALL_CITIES)}
                    aria-label={`Remove city filter ${city}`}
                    className="grid h-5 w-5 place-items-center rounded-full hover:bg-blue-200"
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </span>
              )}
              {type !== ALL_TYPES && (
                <span className="inline-flex max-w-xs items-center gap-1 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-blue-800">
                  <span className="truncate">{type}</span>
                  <button
                    type="button"
                    onClick={() => setType(ALL_TYPES)}
                    aria-label={`Remove type filter ${type}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-blue-200"
                  >
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                </span>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  <Icon name="reset" className="h-4 w-4" /> Reset filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div ref={listRef} className="scroll-mt-24">
          {visible.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                <Icon name="search" className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-slate-900">No matching institutions</p>
              <p className="mt-2 text-sm text-slate-500">Try another name, city, or institution type.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-xl bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="mt-8 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((item) => {
                const isOpen = expanded === item.uid;
                const website = externalUrl(item.website);
                const email = singleEmail(item.email);
                const phone = singlePhone(item.phone);
                const hostelAvailable = isYes(item.hostel);
                const placementInfo =
                  isYes(item.placementMentioned) || item.studentsPlaced != null || !isEmpty(item.highestPackage);

                const details: [string, unknown][] = [
                  ["Official email", item.email],
                  ["Phone", item.phone],
                  ["Resource person", item.resourcePerson],
                  ["NEP 2020", item.nep2020],
                  ["Hostel", `${yes(item.hostel)}${item.hostelFor ? ` (${item.hostelFor})` : ""}`],
                  ["Hostel strength", item.hostelStrength],
                  ["Nearby PG", yes(item.nearbyPg)],
                  ["TPO / placement contact", item.tpoName],
                  ["TPO phone", item.tpoPhone],
                  ["TPO email", item.tpoEmail],
                  ["Students placed", item.studentsPlaced],
                  ["Highest package", item.highestPackage],
                  ["Average package", item.averagePackage],
                  ["Companies visited", item.companiesVisited],
                ];

                return (
                  <article
                    key={item.uid}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
                  >
                    <div className="h-1.5 bg-gradient-to-r from-blue-700 via-indigo-500 to-cyan-400" />

                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      {/* Title row */}
                      <div className="flex items-start gap-3.5">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-black tracking-tight text-white shadow-md shadow-blue-700/20">
                          {initials(item.name)}
                        </span>
                        <div className="min-w-0">
                          <h2 className="break-words text-[17px] font-extrabold leading-snug tracking-tight text-slate-950">
                            {show(item.name)}
                          </h2>
                          <p className="mt-1 text-xs font-semibold text-slate-500">Code: {show(item.instituteCode)}</p>
                        </div>
                      </div>

                      {/* Meta chips */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.status && (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold leading-4 text-indigo-700">
                            {item.status}
                          </span>
                        )}
                        {item.city && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <Icon name="pin" className="h-3 w-3" /> {item.city}
                          </span>
                        )}
                        {item.established && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            <Icon name="calendar" className="h-3 w-3" /> Est. {item.established}
                          </span>
                        )}
                      </div>

                      {/* Key numbers */}
                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-blue-50/80 p-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            <Icon name="users" className="h-3.5 w-3.5" /> Intake
                          </p>
                          <p className="mt-1 text-lg font-extrabold text-slate-900">{show(item.intake)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <Icon name="award" className="h-3.5 w-3.5" /> NAAC
                          </p>
                          <p className="mt-1 break-words text-sm font-extrabold text-slate-900">{show(item.naacRating)}</p>
                        </div>
                      </div>

                      {/* Location + fees */}
                      <div className="mt-4 space-y-2.5 text-sm text-slate-600">
                        <p className="flex gap-2.5">
                          <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span className="break-words">{show(item.place)}</span>
                        </p>
                        <p className="flex gap-2.5">
                          <Icon name="rupee" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span className="break-words">{show(item.fees)}</span>
                        </p>
                      </div>

                      {/* Highlights */}
                      {(hostelAvailable || isYes(item.nep2020) || placementInfo) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {hostelAvailable && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              <Icon name="bed" className="h-3.5 w-3.5" /> Hostel
                            </span>
                          )}
                          {isYes(item.nep2020) && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
                              <Icon name="check" className="h-3.5 w-3.5" /> NEP 2020
                            </span>
                          )}
                          {placementInfo && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                              <Icon name="briefcase" className="h-3.5 w-3.5" /> Placements
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : item.uid)}
                          aria-expanded={isOpen}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                          {isOpen ? "Hide details" : "View details"}
                          <Icon name="chevron" className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        {website && (
                          <a
                            href={website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"
                          >
                            Website <Icon name="external" className="h-4 w-4" />
                          </a>
                        )}
                      </div>

                      {/* Expanded details */}
                      {isOpen && (
                        <div className="mt-5 border-t border-slate-100 pt-5">
                          {(email || phone) && (
                            <div className="mb-4 flex flex-wrap gap-2">
                              {email && (
                                <a
                                  href={`mailto:${email}`}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Icon name="mail" className="h-4 w-4" /> Email
                                </a>
                              )}
                              {phone && (
                                <a
                                  href={`tel:${phone}`}
                                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                >
                                  <Icon name="phone" className="h-4 w-4" /> Call
                                </a>
                              )}
                            </div>
                          )}

                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            Institution details
                          </h3>
                          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                            {details.map(([label, value]) => (
                              <div key={label} className="min-w-0 rounded-lg bg-slate-50 p-3">
                                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
                                <dd
                                  className={`mt-1 break-words text-sm font-semibold ${
                                    isEmpty(value) || value === "Not listed" ? "text-slate-400" : "text-slate-800"
                                  }`}
                                >
                                  {show(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>

                          {(item.companiesLink || item.accreditationLink) && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.companiesLink && (
                                <a
                                  href={externalUrl(item.companiesLink) ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  Companies / placements <Icon name="external" className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {item.accreditationLink && (
                                <a
                                  href={externalUrl(item.accreditationLink) ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  Accreditation / MoU <Icon name="external" className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          )}

                          <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-500">
                            <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Placement and fee details are shown as recorded and may need confirmation with the institution.
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && pageCount > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">
              Page <strong className="text-slate-900">{currentPage}</strong> of{" "}
              <strong className="text-slate-900">{pageCount}</strong>
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon name="left" className="h-4 w-4" /> Previous
              </button>

              <div className="hidden items-center gap-1.5 sm:flex">
                {pageWindow(currentPage, pageCount).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p)}
                      aria-current={p === currentPage ? "page" : undefined}
                      className={`h-10 min-w-10 rounded-xl px-3 text-sm font-bold transition ${
                        p === currentPage
                          ? "bg-blue-700 text-white shadow-sm"
                          : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => goToPage(currentPage + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <Icon name="right" className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}

        <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs leading-5 text-slate-500">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Source: Master Data – Engineering workbook supplied for this project. Missing values are shown as
            “Not listed” rather than guessed. Listing order is not an official ranking.
          </span>
        </p>
      </section>

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="bg-[#0f1b36] text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="inline-flex items-center gap-2.5 text-lg font-black tracking-tight text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <Icon name="cap" className="h-5 w-5" />
            </span>
            College<span className="text-blue-400">Predictor</span>
          </p>
          <p className="text-xs text-slate-400">
            Institution information sourced from the supplied Master Data – Engineering workbook.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 transition hover:text-white"
          >
            Back to predictor <Icon name="arrow" className="h-4 w-4 -rotate-90" />
          </Link>
        </div>
      </footer>
    </main>
  );
}