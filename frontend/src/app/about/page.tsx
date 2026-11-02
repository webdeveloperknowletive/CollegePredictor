"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* ====================================================================== */
/*  Icons                                                                  */
/* ====================================================================== */

const ICONS = {
  cap: "m2 9 10-5 10 5-10 5L2 9Z M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5 M22 9v6",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.3-4.3",
  layers: "m12 3 9 5-9 5-9-5 9-5Z M3 13l9 5 9-5",
  compare: "M7 4 3 8l4 4 M3 8h14 M17 20l4-4-4-4 M21 16H7",
  building: "M3 21h18 M5 21V9l7-5 7 5v12 M9 21v-6h6v6",
  bookmark: "M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z",
  download: "M12 3v12 M7 10l5 5 5-5 M4 21h16",
  check: "m5 12.5 4.5 4.5L19 7.5",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 8h.01",
  warning: "M12 4 3 20h18L12 4Z M12 10v4 M12 17h.01",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z",
  trend: "m3 17 6-6 4 4 8-8 M15 7h6v6",
  calendar: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20c.6-3.4 3.3-5 6.5-5s5.9 1.6 6.5 5 M17 4.5a3.2 3.2 0 0 1 0 6.2 M18.5 15.2c1.7.6 2.7 2.2 3 4.8",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z M4 19.5A2.5 2.5 0 0 1 6.5 17H20",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M18 6 6 18",
  chevron: "m6 9 6 6 6-6",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z",
  lock: "M5 10.5h14v10H5Z M8 10.5V8a4 4 0 0 1 8 0v2.5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2",
  file: "M6 3h8l4 4v14H6Z M14 3v4h4 M9 12h6 M9 16h6",
  scale: "M12 4v16 M7 20h10 M5 7h14 M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7Z M19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7Z",
  tool: "M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5Z",
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

/* ====================================================================== */
/*  Animations                                                             */
/* ====================================================================== */

const animationCss = `
@property --cp-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
@keyframes cp-spin-angle { to { --cp-angle: 360deg; } }
@keyframes cp-fade-up { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes cp-float { 0%, 100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-16px,0); } }
@keyframes cp-shine { from { background-position: 0% center; } to { background-position: 100% center; } }
@keyframes cp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

.cp-fade-up { animation: cp-fade-up .7s cubic-bezier(.2,.7,.2,1) both; }
.cp-float { animation: cp-float 9s ease-in-out infinite; }
.cp-float-slow { animation: cp-float 13s ease-in-out infinite reverse; }
.cp-shine { background-size: 200% auto; animation: cp-shine 5s ease-in-out infinite alternate; }

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

.cp-grow { transform-origin: left center; animation: cp-grow .9s cubic-bezier(.2,.7,.2,1) both; }

@media (prefers-reduced-motion: reduce) {
  .cp-reveal { opacity: 1; transform: none; transition: none; }
  .cp-fade-up, .cp-float, .cp-float-slow, .cp-shine, .cp-grow, .cp-border::before { animation: none !important; }
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
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1000;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}

/* ====================================================================== */
/*  Content                                                                */
/* ====================================================================== */

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/predict", label: "Predict Colleges" },
  { href: "/universities", label: "Universities" },
  { href: "/student-guide", label: "Student Guide" },
  { href: "/about", label: "About" },
];

const glance: { value: number; suffix?: string; label: string; icon: IconName; tone: string }[] = [
  { value: 6, label: "Search filters", icon: "search", tone: "bg-blue-50 text-blue-700" },
  { value: 4, label: "CAP rounds supported", icon: "layers", tone: "bg-violet-50 text-violet-700" },
  { value: 2, label: "Admission years (2025, 2026)", icon: "calendar", tone: "bg-emerald-50 text-emerald-700" },
  { value: 3, label: "Chance labels explained", icon: "scale", tone: "bg-orange-50 text-orange-700" },
];

const features: { icon: IconName; number: string; title: string; description: string; color: string; light: string }[] = [
  { icon: "search", number: "01", title: "Smart College Search", description: "Explore engineering colleges using your MHT-CET percentile, category, preferred branch, city, academic year and CAP round.", color: "from-blue-500 to-cyan-400", light: "bg-blue-50 text-blue-700" },
  { icon: "layers", number: "02", title: "Historical Cutoff Insights", description: "Review available previous admission cutoffs to understand trends and discover colleges worth considering.", color: "from-indigo-500 to-violet-400", light: "bg-indigo-50 text-indigo-700" },
  { icon: "compare", number: "03", title: "College Comparison", description: "Compare shortlisted colleges using available details such as fees, placements, hostel facilities and other college information.", color: "from-violet-500 to-fuchsia-400", light: "bg-violet-50 text-violet-700" },
  { icon: "building", number: "04", title: "Detailed College Profiles", description: "Discover available college, branch, location, intake and other relevant information to support further research.", color: "from-cyan-500 to-blue-400", light: "bg-cyan-50 text-cyan-700" },
  { icon: "bookmark", number: "05", title: "Saved Colleges", description: "Use available account features to revisit saved colleges and organise your admission research more conveniently.", color: "from-rose-500 to-pink-400", light: "bg-rose-50 text-rose-700" },
  { icon: "download", number: "06", title: "Downloadable Results", description: "Export results as a PDF where supported, making it easier to discuss your shortlist with family or counsellors.", color: "from-emerald-500 to-teal-400", light: "bg-emerald-50 text-emerald-700" },
];

const roadmap = [
  { phase: "Continuous", title: "Better admission data", description: "Improve data quality and incorporate reliable admission-year datasets as they become available." },
  { phase: "Planned", title: "Advanced college insights", description: "Enhance comparison summaries and visual explanations of historical cutoff trends." },
  { phase: "Planned", title: "CollegeGuide AI", description: "Explore a locally run guidance assistant that can answer common admission questions using verified project information." },
  { phase: "Planned", title: "A better student experience", description: "Continue improving accessibility, mobile usability and the college shortlisting journey." },
];

const admissionSteps: { icon: IconName; title: string; text: string }[] = [
  { icon: "file", title: "Register and prepare documents", text: "Create your CAP registration and keep scanned copies of your certificates, marksheets and identity documents ready." },
  { icon: "check", title: "Document verification", text: "Your documents are verified through the official process, after which merit lists are published." },
  { icon: "scale", title: "Check the merit list", text: "Review your listing carefully and raise any correction through the official channel before the deadline." },
  { icon: "layers", title: "Fill your option form", text: "List colleges and branches in your true order of preference. This is where a balanced shortlist helps most." },
  { icon: "calendar", title: "Seat allotment rounds", text: "Seats are allotted in rounds. Cutoffs often shift between rounds, so check more than one." },
  { icon: "building", title: "Accept and confirm", text: "Follow the official instructions to accept a seat, report to the college or move on to the next round." },
];

const shortlistTiers: { title: string; tag: string; text: string; tone: string; bar: string }[] = [
  { title: "Ambitious", tag: "Cutoff above your percentile", text: "A few dream options you would love but are less likely to get. Keep these at the top of your preference order.", tone: "bg-rose-50 text-rose-700 ring-rose-200", bar: "from-rose-500 to-orange-400" },
  { title: "Realistic", tag: "Cutoff close to your percentile", text: "Colleges where your percentile is near the historical cutoff. These usually form the core of a good list.", tone: "bg-amber-50 text-amber-700 ring-amber-200", bar: "from-amber-500 to-yellow-400" },
  { title: "Safe", tag: "Cutoff below your percentile", text: "Options you are comfortable with and likely to be offered. Always include a few so you are never left without a choice.", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", bar: "from-emerald-500 to-teal-400" },
];

const tips: { icon: IconName; title: string; text: string }[] = [
  { icon: "layers", title: "Look at more than one round", text: "A college that looks out of reach in Round 1 may be closer in a later round, and the reverse can also happen." },
  { icon: "compare", title: "Compare branch and college together", text: "A strong branch at a lesser-known college and a different branch at a top college are different trade-offs. Weigh both." },
  { icon: "building", title: "Look beyond the cutoff", text: "Fees, location, hostel facilities, faculty and placement records all matter. Verify them with the college directly." },
  { icon: "users", title: "Talk it through", text: "Share your downloaded shortlist with family, teachers or a counsellor and ask for their view." },
];

const glossary: [string, string][] = [
  ["Percentile", "Your MHT-CET score expressed relative to other candidates. Higher percentiles generally open more options."],
  ["Cutoff", "The lowest percentile at which a seat was allotted in a previous admission round for a given college, branch and category."],
  ["Closing rank", "The merit rank of the last candidate admitted to a seat, shown where the record is available."],
  ["CAP round", "One stage of the Centralised Admission Process. Cutoffs can change from round to round."],
  ["Category code", "The code for your admission category and seat type, such as the ones listed in the predictor's category dropdown. Choose the exact code that applies to you."],
  ["Institute code", "A unique number identifying a college in the admission records, useful for searching and comparing."],
];

const faq: [string, string][] = [
  ["Is CollegePredictor an official admission tool?", "No. It is an independent research aid built on historical data. Your actual admission happens only through the official CAP process, so always follow official notices."],
  ["How are the chance labels decided?", "More Chance, Moderate and Low Chances are preliminary labels based on the difference between your percentile and the historical cutoff. They are not statistically validated admission probabilities."],
  ["Why can results differ between rounds or years?", "Cutoffs depend on how many candidates apply, how many seats exist and how earlier rounds went. They can change every year and every round."],
  ["Can I search several branches or cities together?", "Yes. You can select more than one branch and more than one city, or leave the city filter open to search everywhere."],
  ["Is the data complete?", "Results are limited to the records available in the project's data. Some colleges, branches or years may be missing or out of date, so always verify with official sources."],
  ["Can I keep my shortlist?", "Yes. After logging in you can save colleges to revisit later, and you can download your results as a PDF where supported."],
];

/* ====================================================================== */
/*  Small components                                                       */
/* ====================================================================== */

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <Reveal>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-700">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
        <p className="mt-4 leading-7 text-slate-600">{text}</p>
      </div>
    </Reveal>
  );
}

/** Illustrative meter used to explain how to read the results. */
function SampleMeter({ diff, label, tone, dot }: { diff: number; label: string; tone: string; dot: string }) {
  const position = 50 + (Math.max(-10, Math.min(10, diff)) / 10) * 50;
  const left = Math.min(50, position);
  const width = Math.abs(position - 50);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-800">Example college</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${tone}`}>{label}</span>
      </div>
      <div className="relative mt-5 h-1.5 rounded-full bg-slate-100">
        <span className={`absolute top-0 h-full rounded-full opacity-40 ${dot}`} style={{ left: `${left}%`, width: `${width}%` }} />
        <span className="absolute left-1/2 top-1/2 h-3.5 w-px -translate-y-1/2 bg-slate-400" />
        <span className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${dot}`} style={{ left: `${position}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
        <span>Below</span>
        <span>Cutoff</span>
        <span>Above</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Your percentile is {Math.abs(diff)} {diff >= 0 ? "above" : "below"} the cutoff.
      </p>
    </div>
  );
}

/* ====================================================================== */
/*  Page                                                                   */
/* ====================================================================== */

export default function AboutPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShowTop(window.scrollY > 700);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <main
      className="min-h-screen overflow-x-clip bg-[#f4f7fc] text-slate-900 antialiased"
      style={{ fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif" }}
    >
      <style>{animationCss}</style>

      {/* ------------------------------ Navigation ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-[0_4px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="CollegePredictor home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-700/25 transition-transform duration-300 hover:rotate-6 hover:scale-105">
              <Icon name="cap" className="h-5 w-5" />
            </span>
            <span className="text-lg font-black tracking-tight text-slate-950">
              College<span className="text-blue-700">Predictor</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {NAV_LINKS.map((item) => {
              const active = item.href === "/about";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
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
          <div className="cp-fade-up border-t border-slate-200 bg-white px-4 py-3 shadow-lg sm:px-6 lg:hidden">
            <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ------------------------------ Hero ------------------------------ */}
      <section className="relative isolate overflow-hidden border-b border-blue-100 bg-gradient-to-br from-[#f8fbff] via-white to-[#e8f0ff]">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          aria-hidden="true"
        />
        <div className="cp-float pointer-events-none absolute -right-24 -top-10 -z-10 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" aria-hidden="true" />
        <div className="cp-float-slow pointer-events-none absolute -left-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" aria-hidden="true" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-8 lg:py-24">
          <div className="min-w-0">
            <span className="cp-fade-up inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-blue-800 shadow-sm sm:text-xs">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Your engineering admission companion
            </span>

            <h1
              className="cp-fade-up mt-6 text-4xl font-black leading-[1.1] tracking-[-0.03em] text-[#10264f] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: "100ms" }}
            >
              Your percentile.
              <br />
              Your possibilities.
              <br />
              <span className="cp-shine bg-gradient-to-r from-blue-700 via-violet-500 to-indigo-600 bg-clip-text text-transparent">
                Your future.
              </span>
            </h1>

            <p className="cp-fade-up mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg" style={{ animationDelay: "200ms" }}>
              Discover engineering college options across Maharashtra, explore historical MHT-CET cutoffs, compare
              available college details and build a more informed admission shortlist.
            </p>

            <div className="cp-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "300ms" }}>
              <Link
                href="/#predict"
                className="cp-sheen inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 px-7 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-700/25 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                Explore My Colleges <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link
                href="/universities"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 transition hover:-translate-y-1 hover:border-blue-300 hover:text-blue-700"
              >
                Browse Universities
              </Link>
            </div>

            <ul className="cp-fade-up mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600" style={{ animationDelay: "400ms" }}>
              {["Student-focused search", "Historical cutoff context", "Informed comparisons"].map((text) => (
                <li key={text} className="inline-flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Journey card */}
          <div className="cp-fade-up relative mx-auto w-full max-w-lg" style={{ animationDelay: "250ms" }}>
            <div className="cp-border relative overflow-hidden rounded-[2rem] border border-white bg-white/95 p-5 shadow-2xl shadow-blue-900/10 sm:p-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Your admission journey</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">Find your direction</h2>
                </div>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <Icon name="sparkle" className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  { n: "01", title: "Your preferences", desc: "Percentile, category and branch", color: "bg-blue-600" },
                  { n: "02", title: "Relevant college options", desc: "Available cutoff records and filters", color: "bg-indigo-600" },
                  { n: "03", title: "Compare your shortlist", desc: "College details and available insights", color: "bg-violet-600" },
                  { n: "04", title: "Make an informed plan", desc: "Review and verify your options", color: "bg-emerald-600" },
                ].map((step, index) => (
                  <div key={step.n} className="relative flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${step.color} text-xs font-black text-white shadow-md`}>
                        {step.n}
                      </div>
                      {index < 3 && <div className="my-1 min-h-5 w-px flex-1 bg-gradient-to-b from-blue-200 to-indigo-100" />}
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-blue-200 hover:bg-white hover:shadow-md">
                      <p className="font-extrabold text-slate-800">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                <p className="text-sm font-bold text-blue-900">A clearer way to explore your options.</p>
                <p className="mt-1 text-xs leading-5 text-blue-800">Research, compare and verify before making admission choices.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ At a glance ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8" aria-label="At a glance">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {glance.map((item, index) => (
            <Reveal key={item.label} delay={index * 90} className="h-full">
              <div className="flex h-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/5">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${item.tone}`}>
                  <Icon name={item.icon} className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-3xl font-black tracking-tight tabular-nums text-slate-950">
                    <CountUp value={item.value} />
                  </p>
                  <p className="text-xs font-semibold text-slate-500">{item.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Purpose ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Why CollegePredictor?"
          title="Less confusion. More informed choices."
          text="Engineering admission research can involve many colleges, branches, categories and counselling rounds. CollegePredictor brings available information into one organised experience to help students investigate their options."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            { icon: "target" as IconName, title: "The challenge", text: "Finding and comparing relevant admission information across multiple sources can be time-consuming.", style: "from-blue-500 to-cyan-400" },
            { icon: "search" as IconName, title: "The solution", text: "Use filters and historical cutoff records to discover options and focus on colleges worth researching.", style: "from-indigo-500 to-violet-500" },
            { icon: "sparkle" as IconName, title: "The benefit", text: "Build a more organised shortlist and have better-informed conversations with family and counsellors.", style: "from-violet-500 to-fuchsia-400" },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 110} className="h-full">
              <article className="cp-border cp-border-hover group h-full rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${item.style} text-white shadow-lg transition duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon name={item.icon} className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-xl font-extrabold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Journey ------------------------------ */}
      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Your journey"
            title="From percentile to a confident shortlist"
            text="Follow a simple visual journey to explore available options, understand historical records and organise your college research."
          />

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              { n: "01", icon: "target" as IconName, title: "Set preferences", text: "Choose your percentile, category, branch, city, year and CAP round.", tint: "from-blue-600 to-cyan-500" },
              { n: "02", icon: "layers" as IconName, title: "Discover options", text: "Explore matching colleges and review the cutoff information available.", tint: "from-indigo-600 to-violet-500" },
              { n: "03", icon: "compare" as IconName, title: "Compare colleges", text: "Review available details and identify options worth researching further.", tint: "from-violet-600 to-fuchsia-500" },
              { n: "04", icon: "check" as IconName, title: "Plan your shortlist", text: "Organise your research and download results where supported.", tint: "from-emerald-600 to-teal-500" },
            ].map((step, index) => (
              <Reveal key={step.n} delay={index * 110} className="h-full">
                <article className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${step.tint} text-white shadow-lg`}>
                    <Icon name={step.icon} className="h-7 w-7" />
                  </div>
                  <p className="mt-6 text-xs font-black tracking-[0.18em] text-slate-400">STEP {step.n}</p>
                  <h3 className="mt-2 text-lg font-extrabold text-slate-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
                  <div className={`absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r ${step.tint}`} />
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-8">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white sm:p-9">
              <div className="grid items-center gap-7 lg:grid-cols-[1fr_1.1fr]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-cyan-300">A search shaped around you</p>
                  <h3 className="mt-3 text-2xl font-black sm:text-3xl">Your preferences guide the search.</h3>
                  <p className="mt-3 text-sm leading-7 text-blue-100">
                    Narrow the available records using relevant admission preferences, then review the matching
                    options carefully.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[["01", "Percentile"], ["02", "Category"], ["03", "Branch"], ["04", "City"], ["05", "CAP round"], ["06", "Academic year"]].map(([number, label]) => (
                    <div key={label} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/15">
                      <p className="text-xs font-black tracking-widest text-cyan-300">{number}</p>
                      <p className="mt-2 text-sm font-bold text-white">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ Features ------------------------------ */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Explore the platform"
          title="Powerful tools for smarter college research"
          text="Discover the key features that help students search, understand, compare and organise engineering college options in one student-focused experience."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.number} delay={(index % 3) * 100} className="h-full">
              <article className="cp-border cp-border-hover group h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                <div className="flex items-start justify-between">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl ${feature.light} transition duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon name={feature.icon} className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-slate-300">{feature.number}</span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-slate-900">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.description}</p>
                <div className={`mt-6 h-1 w-12 rounded-full bg-gradient-to-r ${feature.color} transition-all duration-300 group-hover:w-24`} />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Reading your results ------------------------------ */}
      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Reading your results"
            title="What the labels and the meter mean"
            text="Every result shows the college's historical cutoff, your percentile and a small meter. Here is how to read them."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Reveal className="h-full">
              <div className="h-full rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-7">
                <h3 className="text-lg font-extrabold text-slate-900">Three preliminary labels</h3>
                <ul className="mt-5 space-y-4">
                  {[
                    { label: "More Chance", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", text: "Your percentile is comfortably above the historical cutoff, so this option looked reachable in the past." },
                    { label: "Moderate", tone: "bg-amber-50 text-amber-700 ring-amber-200", text: "Your percentile is close to the historical cutoff. Outcomes could go either way, so it deserves a place in your list." },
                    { label: "Low Chances", tone: "bg-rose-50 text-rose-700 ring-rose-200", text: "Your percentile is below the historical cutoff. These are stretch options that need some luck or a change in cutoffs." },
                  ].map((item) => (
                    <li key={item.label} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                      <span className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${item.tone}`}>{item.label}</span>
                      <p className="text-sm leading-6 text-slate-600">{item.text}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-6 flex items-start gap-2 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-900">
                  <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" />
                  These labels are based only on the gap between your percentile and past cutoffs. They are not
                  probabilities and do not predict how a future round will go.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120} className="h-full">
              <div className="h-full space-y-3 rounded-3xl border border-slate-200 bg-slate-50/60 p-6 sm:p-7">
                <h3 className="text-lg font-extrabold text-slate-900">The cutoff meter</h3>
                <p className="text-sm leading-6 text-slate-600">
                  The dot shows where you stand against the cutoff line. Illustrative examples only, not real
                  colleges:
                </p>
                <SampleMeter diff={3.2} label="More Chance" tone="bg-emerald-50 text-emerald-700 ring-emerald-200" dot="bg-emerald-500" />
                <SampleMeter diff={-0.4} label="Moderate" tone="bg-amber-50 text-amber-700 ring-amber-200" dot="bg-amber-400" />
                <SampleMeter diff={-4.5} label="Low Chances" tone="bg-rose-50 text-rose-700 ring-rose-200" dot="bg-rose-500" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------ Admission process ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="The bigger picture"
          title="How engineering admission usually works in Maharashtra"
          text="A general overview of the Centralised Admission Process (CAP). Names, dates and rules change each year, so treat this as orientation and follow the official notices."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {admissionSteps.map((step, index) => (
            <Reveal key={step.title} delay={(index % 3) * 100} className="h-full">
              <article className="relative h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                <span className="absolute right-5 top-4 text-4xl font-black text-slate-100">{String(index + 1).padStart(2, "0")}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Icon name={step.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{step.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Shortlisting strategy ------------------------------ */}
      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Smart shortlisting"
            title="Build a balanced list, not a single bet"
            text="A good preference list mixes ambitious, realistic and safe options. Use the results here to sort colleges into these three groups."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {shortlistTiers.map((tier, index) => (
              <Reveal key={tier.title} delay={index * 110} className="h-full">
                <article className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:shadow-xl">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${tier.tone}`}>{tier.tag}</span>
                  <h3 className="mt-4 text-2xl font-black text-slate-950">{tier.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{tier.text}</p>
                  <div className={`absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r ${tier.bar}`} />
                </article>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {tips.map((tip, index) => (
              <Reveal key={tip.title} delay={(index % 2) * 100} className="h-full">
                <div className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:bg-white hover:shadow-md">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                    <Icon name={tip.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{tip.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{tip.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Glossary and privacy ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal className="h-full">
            <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">Key terms</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">A quick glossary</h2>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                {glossary.map(([term, definition]) => (
                  <div key={term} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <dt className="font-extrabold text-blue-800">{term}</dt>
                    <dd className="mt-1 text-sm leading-6 text-slate-600">{definition}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>

          <Reveal delay={120} className="h-full">
            <div className="h-full rounded-3xl border border-slate-200 bg-gradient-to-br from-[#102b5b] to-indigo-800 p-6 text-white shadow-sm sm:p-8">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/10">
                <Icon name="lock" className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-black tracking-tight">Your searches and saved colleges</h2>
              <p className="mt-3 text-sm leading-7 text-blue-100">
                When you create an account and log in, CollegePredictor can keep your recent search, your prediction
                history and the colleges you save, so you can pick up where you left off.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-blue-50">
                {[
                  "Your saved colleges stay linked to your account.",
                  "Use Logout when you are on a shared or public computer.",
                  "Never share your password with anyone.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/15">
                      <Icon name="check" className="h-3 w-3" />
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------ Responsible use ------------------------------ */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 sm:p-9">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                <Icon name="warning" className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Use predictions as guidance, not a guarantee</h2>
                <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-600">
                  Historical cutoffs can help you understand previous admission patterns, but they cannot guarantee a
                  future seat. Actual outcomes depend on the current admission rules, seat availability, category,
                  preferences and counselling rounds. Always verify important information through official admission
                  sources before making final choices.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------ FAQ ------------------------------ */}
      <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Questions"
            title="Frequently asked questions"
            text="Quick answers to things students often ask about CollegePredictor and its results."
          />

          <div className="mt-10 space-y-3">
            {faq.map(([question, answer], index) => (
              <Reveal key={question} delay={Math.min(index, 4) * 60}>
                <details className="group rounded-2xl border border-slate-200 bg-white open:border-blue-200 open:shadow-md">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-bold text-slate-900 marker:hidden hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    {question}
                    <Icon name="chevron" className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-sm leading-7 text-slate-600">{answer}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ Roadmap ------------------------------ */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="Looking ahead"
          title="Building a better admission experience"
          text="The roadmap highlights areas for future improvement. Planned ideas are not a claim that those features are already available."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {roadmap.map((item, index) => (
            <Reveal key={item.title} delay={(index % 2) * 100} className="h-full">
              <article className="relative h-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 pl-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-7">
                <div
                  className={`absolute bottom-0 left-0 top-0 w-1.5 ${
                    index === 0 ? "bg-gradient-to-b from-emerald-500 to-teal-400" : "bg-gradient-to-b from-blue-600 to-violet-500"
                  }`}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-extrabold text-slate-900">{item.title}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      item.phase === "Continuous" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                    }`}
                  >
                    {item.phase}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ------------------------------ Final call to action ------------------------------ */}
      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <Reveal>
          <div className="cp-border relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#102b68] via-blue-800 to-indigo-700 px-6 py-12 text-white shadow-2xl shadow-blue-900/15 sm:px-10 sm:py-14">
            <div className="cp-float-slow pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border-[40px] border-white/5" aria-hidden="true" />
            <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Your next step starts here</p>
                <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                  Explore your possibilities. Plan your future.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100">
                  Start exploring engineering college options, compare available information and prepare a shortlist
                  that reflects your preferences.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/#predict"
                  className="cp-sheen inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-extrabold text-blue-800 transition hover:-translate-y-1 hover:bg-blue-50"
                >
                  Predict Colleges <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <Link
                  href="/student-guide"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Student Guide
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-blue-700 text-white shadow-xl shadow-blue-700/30 transition hover:-translate-y-1 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Back to top"
        >
          <Icon name="arrow" className="h-5 w-5 -rotate-90" />
        </button>
      )}

      {/* ------------------------------ Footer ------------------------------ */}
      <footer className="bg-[#0f1b36] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2.5 text-lg font-black tracking-tight text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                <Icon name="cap" className="h-5 w-5" />
              </span>
              College<span className="text-blue-400">Predictor</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Built to support informed college research. Your college. Our data. Your future.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Explore</h3>
            <ul className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <p>© 2026 CollegePredictor · Built to support informed college research.</p>
            <p>Historical cutoffs are guidance, not admission guarantees.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}