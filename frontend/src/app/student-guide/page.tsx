"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
  arrow: "M5 12h14 M13 6l6 6-6 6",
  check: "m5 12.5 4.5 4.5L19 7.5",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 11v5 M12 8h.01",
  warning: "M12 4 3 20h18L12 4Z M12 10v4 M12 17h.01",
  bulb: "M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z",
  shield: "M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z",
  edit: "M4 20h4L19 9l-4-4L4 16v4Z M13.5 6.5l4 4",
  calendar: "M4 6h16v14H4Z M4 10h16 M8 3v4 M16 3v4",
  code: "m8 8-4 4 4 4 M16 8l4 4-4 4 M13.5 5 10.5 19",
  briefcase: "M4 8h16v11H4Z M9 8V5h6v3 M4 13h16",
  folder: "M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20c.6-3.4 3.3-5 6.5-5s5.9 1.6 6.5 5 M17 4.5a3.2 3.2 0 0 1 0 6.2 M18.5 15.2c1.7.6 2.7 2.2 3 4.8",
  tool: "M14.7 6.3a4 4 0 0 0-5 5L3 18l3 3 6.7-6.7a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5 2.5-2.5Z",
  refresh: "M4 4v6h6 M20 20v-6h-6 M5.5 14a7 7 0 0 0 12 2.5 M18.5 10a7 7 0 0 0-12-2.5",
  down: "M12 5v14 M6 13l6 6 6-6",
  reset: "M4 4v6h6 M4.5 15a8 8 0 1 0 2-8.3L4 10",
  plus: "M12 5v14 M5 12h14",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  chevron: "m6 9 6 6 6-6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z M21 21l-4.3-4.3",
  calculator: "M6 3h12v18H6Z M9 7h6 M9 12h.01 M12 12h.01 M15 12h.01 M9 16h.01 M12 16h.01 M15 16h.01",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M12 7v5l3 2",
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
/*  Content                                                                */
/* ====================================================================== */

const NAV_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/predict", label: "Predict Colleges", icon: "target" },
  { href: "/about", label: "About", icon: "info" },
  { href: "/universities", label: "Universities", icon: "building" },
  { href: "/student-guide", label: "Student Guide", icon: "book" },
];

const sections: { n: string; title: string; desc: string; icon: IconName; tone: string }[] = [
  { n: "01", title: "Understand engineering", desc: "Explore engineering branches, what you study, and the careers each path can lead to.", icon: "cap", tone: "bg-blue-50 text-blue-700" },
  { n: "02", title: "College & university system", desc: "Learn the difference between autonomous and affiliated colleges, and where to verify rules.", icon: "building", tone: "bg-indigo-50 text-indigo-700" },
  { n: "03", title: "Credits, SGPA & CGPA", desc: "Understand credits, grade points, semester performance, and how CGPA is calculated.", icon: "chart", tone: "bg-violet-50 text-violet-700" },
  { n: "04", title: "Exams, passing & backlogs", desc: "Plan for internal exams, end-semester exams, practicals, and backlog recovery.", icon: "edit", tone: "bg-sky-50 text-sky-700" },
  { n: "05", title: "Study routines & practicals", desc: "Build a realistic weekly routine and keep journals, viva preparation, and assignments on track.", icon: "calendar", tone: "bg-emerald-50 text-emerald-700" },
  { n: "06", title: "Coding & technical skills", desc: "Follow a beginner-friendly path from programming fundamentals to projects and GitHub.", icon: "code", tone: "bg-cyan-50 text-cyan-700" },
  { n: "07", title: "Resume & internships", desc: "Build evidence of your skills through projects, teamwork, communication, and relevant certificates.", icon: "briefcase", tone: "bg-orange-50 text-orange-700" },
  { n: "08", title: "Scholarships & documents", desc: "Prepare admission documents and check official scholarship portals and deadlines.", icon: "folder", tone: "bg-amber-50 text-amber-700" },
  { n: "09", title: "Well-being & student safety", desc: "Manage time, budget, sleep, stress, and know where to seek help if you face harassment.", icon: "heart", tone: "bg-rose-50 text-rose-700" },
];

const TOC = [
  ...sections.map((s) => ({ id: `section-${s.n}`, n: s.n, label: s.title })),
  { id: "section-10", n: "10", label: "Glossary & FAQ" },
  { id: "section-11", n: "11", label: "First-year checklist" },
];

const branches = [
  ["Computer / IT", "Programming, algorithms, databases, operating systems", "Software, cloud, data engineering"],
  ["AI / ML / Data Science", "Statistics, Python, machine learning, neural networks", "AI/ML engineering, analytics"],
  ["Electronics & Telecom", "Circuits, embedded systems, signals, IoT", "Embedded, telecom, hardware"],
  ["Mechanical", "Mechanics, thermodynamics, CAD/CAM, manufacturing", "Design, automotive, manufacturing"],
  ["Civil", "Structures, surveying, materials, construction", "Structural design, construction, planning"],
  ["Electrical", "Power systems, machines, control systems", "Power, EV systems, automation"],
];

const successModel: { icon: IconName; title: string; desc: string; tone: string }[] = [
  { icon: "book", title: "Academics", desc: "Understand and revise", tone: "bg-blue-100 text-blue-700" },
  { icon: "code", title: "Skills", desc: "Practice consistently", tone: "bg-violet-100 text-violet-700" },
  { icon: "tool", title: "Projects", desc: "Build and demonstrate", tone: "bg-orange-100 text-orange-700" },
  { icon: "users", title: "Communication", desc: "Work well with others", tone: "bg-sky-100 text-sky-700" },
  { icon: "heart", title: "Well-being", desc: "Sleep, eat, recharge", tone: "bg-rose-100 text-rose-700" },
  { icon: "refresh", title: "Consistency", desc: "Small steps every week", tone: "bg-emerald-100 text-emerald-700" },
];

const practicalChecklist = [
  "Understand the experiment objective",
  "Complete observations carefully",
  "Verify calculations with faculty",
  "Finish the journal on time",
  "Prepare likely viva questions",
  "Keep a copy of required files",
];

const checklist = [
  "Download the latest syllabus from your official university or college portal",
  "Confirm the exam pattern and passing rules for your own institute",
  "Create a weekly plan for lectures, assignments, practicals, and revision",
  "Learn the fundamentals of one programming language",
  "Build one small project and save it in GitHub",
  "Prepare a one-page resume with honest, demonstrable skills",
  "Check scholarship eligibility and deadlines on official portals",
  "Keep scanned copies of admission and identity documents securely",
];

const STORAGE_KEY = "collegePredictorGuideProgress";

/* ====================================================================== */
/*  Reusable pieces                                                        */
/* ====================================================================== */

function SectionCard({
  id,
  n,
  title,
  subtitle,
  icon,
  tone,
  children,
}: {
  id: string;
  n: string;
  title: string;
  subtitle: string;
  icon: IconName;
  tone: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:scroll-mt-24"
    >
      <div className="flex items-start gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
          <Icon name={icon} className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-700">Section {n}</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-3xl leading-7 text-slate-600">{subtitle}</p>
        </div>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

const CALLOUT_TONES = {
  info: { box: "border-blue-200 bg-blue-50", icon: "text-blue-600", title: "text-blue-950", text: "text-blue-950/80", name: "bulb" },
  warn: { box: "border-amber-200 bg-amber-50", icon: "text-amber-600", title: "text-amber-900", text: "text-amber-900/90", name: "warning" },
  danger: { box: "border-rose-200 bg-rose-50", icon: "text-rose-600", title: "text-rose-900", text: "text-rose-900/90", name: "shield" },
} as const;

function Callout({
  title,
  text,
  tone = "info",
  className = "mt-6",
}: {
  title: string;
  text: string;
  tone?: keyof typeof CALLOUT_TONES;
  className?: string;
}) {
  const t = CALLOUT_TONES[tone];
  return (
    <div className={`${className} flex gap-3.5 rounded-2xl border p-5 ${t.box}`}>
      <Icon name={t.name as IconName} className={`mt-0.5 h-5 w-5 shrink-0 ${t.icon}`} />
      <div>
        <h3 className={`font-extrabold ${t.title}`}>{title}</h3>
        <p className={`mt-1.5 text-sm leading-6 ${t.text}`}>{text}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-blue-200 hover:bg-white hover:shadow-md">
      <h3 className="font-extrabold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function CheckItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm leading-6 transition ${
        checked
          ? "border-emerald-200 bg-emerald-50/70 text-slate-500"
          : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50/50"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200 ${
          checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"
        }`}
      >
        <Icon name="check" className="h-3.5 w-3.5" />
      </span>
      <span className={checked ? "line-through decoration-slate-300" : ""}>{label}</span>
    </label>
  );
}

/* ====================================================================== */
/*  Page                                                                   */
/* ====================================================================== */

/* ====================================================================== */
/*  Glossary and FAQ content                                               */
/* ====================================================================== */

const GLOSSARY: [string, string][] = [
  ["Credit", "A number showing how much weight a subject carries in your programme. Higher-credit subjects affect your grade average more."],
  ["Grade point", "The numerical value linked to a letter grade. It is multiplied by credits when your semester score is calculated."],
  ["SGPA", "Semester Grade Point Average: the credit-weighted average of your grade points in one semester."],
  ["CGPA", "Cumulative Grade Point Average: your overall performance across completed semesters."],
  ["ATKT", "Allowed To Keep Terms. A provision that lets eligible students move to the next year with some pending subjects. Conditions differ by university."],
  ["Backlog", "A subject you have not yet cleared and need to attempt again."],
  ["Autonomous college", "A college that has approval to design its own syllabus and conduct its own exams within regulatory limits."],
  ["Affiliated college", "A college that follows the syllabus and exam framework of its affiliating university."],
  ["CAP", "Centralised Admission Process: the round-based online process used for engineering admissions in Maharashtra."],
  ["Viva", "A short oral exam, usually linked to a practical, where you explain your work and answer questions."],
  ["TPO", "Training and Placement Officer: the person or cell that coordinates campus placements and internships."],
  ["Internal assessment", "Marks awarded during the semester through tests, assignments, and practical work, before the final exam."],
];

const FAQ: [string, string][] = [
  ["Are the cutoff predictions a guarantee of admission?", "No. Predictions are based on historical cutoff records and are only a guide. Cutoffs change every year, so always check official CAP notices and your allotment results."],
  ["What is the difference between SGPA and CGPA?", "SGPA reflects a single semester, while CGPA combines your results across semesters. The exact method, including rounding and conversion to percentage, is set by your university."],
  ["Where should I find the official syllabus and exam rules?", "On your university's official website and your college's academic office or notice board. Rules shared by seniors or other colleges may not apply to you."],
  ["When should I start building projects?", "Once you are comfortable with the basics of one programming language, start with a small project. A simple, finished project you can explain is more useful than a long list of unfinished ones."],
  ["What should I do if I am falling behind in a subject?", "Speak to the subject faculty early, list the topics you find hard, and make a weekly plan to cover them. Asking for help early is much easier than recovering later."],
  ["How do I keep my documents safe?", "Keep scanned copies in a secure folder, share them only through official portals or channels, and avoid sending identity documents to unknown people or unofficial links."],
];

/* ====================================================================== */
/*  SGPA / CGPA calculator                                                 */
/* ====================================================================== */

type CalcRow = { id: number; label: string; credits: string; value: string };

function toNumber(value: string) {
  return value.trim() === "" ? NaN : Number(value);
}

function rowState(row: CalcRow): "empty" | "ok" | "bad" {
  if (row.credits.trim() === "" && row.value.trim() === "") return "empty";
  const credits = toNumber(row.credits);
  const value = toNumber(row.value);
  if (!Number.isFinite(credits) || !Number.isFinite(value) || credits <= 0 || value < 0 || value > 10) return "bad";
  return "ok";
}

function GradeCalculator() {
  const [mode, setMode] = useState<"sgpa" | "cgpa">("sgpa");
  const [subjects, setSubjects] = useState<CalcRow[]>([
    { id: 1, label: "", credits: "", value: "" },
    { id: 2, label: "", credits: "", value: "" },
    { id: 3, label: "", credits: "", value: "" },
  ]);
  const [semesters, setSemesters] = useState<CalcRow[]>([
    { id: 1, label: "", credits: "", value: "" },
    { id: 2, label: "", credits: "", value: "" },
  ]);
  const nextId = useRef(10);

  const isSgpa = mode === "sgpa";
  const rows = isSgpa ? subjects : semesters;
  const setRows = isSgpa ? setSubjects : setSemesters;

  function update(id: number, field: keyof Omit<CalcRow, "id">, value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }
  function addRow() {
    setRows((current) => [...current, { id: nextId.current++, label: "", credits: "", value: "" }]);
  }
  function removeRow(id: number) {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  }
  function resetRows() {
    setRows((current) => current.map((row) => ({ ...row, label: "", credits: "", value: "" })));
  }

  let totalCredits = 0;
  let weighted = 0;
  let counted = 0;
  let hasBad = false;
  for (const row of rows) {
    const state = rowState(row);
    if (state === "bad") hasBad = true;
    if (state !== "ok") continue;
    const credits = toNumber(row.credits);
    const value = toNumber(row.value);
    totalCredits += credits;
    weighted += credits * value;
    counted += 1;
  }
  const result = totalCredits > 0 ? weighted / totalCredits : null;

  const inputClass =
    "h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

  return (
    <div className="mt-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white shadow-md shadow-blue-700/25">
            <Icon name="calculator" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-900">Try it: grade calculator</h3>
            <p className="text-xs text-slate-500">Estimate your SGPA or CGPA on a 10-point scale.</p>
          </div>
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Calculator mode">
          {(["sgpa", "cgpa"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-bold uppercase transition ${
                mode === key ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 hidden grid-cols-[1.4fr_0.7fr_0.8fr_40px] gap-3 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:grid">
        <span>{isSgpa ? "Subject (optional)" : "Semester (optional)"}</span>
        <span>Credits</span>
        <span>{isSgpa ? "Grade points (0–10)" : "SGPA (0–10)"}</span>
        <span />
      </div>

      <div className="mt-2 space-y-3 sm:space-y-2">
        {rows.map((row, index) => {
          const state = rowState(row);
          const border = state === "bad" ? "border-rose-300 bg-rose-50/50" : "border-slate-200";
          return (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_40px] items-center gap-2 sm:grid-cols-[1.4fr_0.7fr_0.8fr_40px] sm:gap-3">
              <input
                value={row.label}
                onChange={(e) => update(row.id, "label", e.target.value)}
                placeholder={isSgpa ? `Subject ${index + 1}` : `Semester ${index + 1}`}
                aria-label={isSgpa ? `Subject ${index + 1} name` : `Semester ${index + 1} name`}
                className={`${inputClass} col-span-3 sm:col-span-1 ${border}`}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={row.credits}
                onChange={(e) => update(row.id, "credits", e.target.value)}
                placeholder="Credits"
                aria-label="Credits"
                className={`${inputClass} ${border}`}
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="10"
                step="any"
                value={row.value}
                onChange={(e) => update(row.id, "value", e.target.value)}
                placeholder={isSgpa ? "Grade points" : "SGPA"}
                aria-label={isSgpa ? "Grade points" : "SGPA"}
                className={`${inputClass} ${border}`}
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={rows.length <= 1}
                aria-label="Remove row"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
        >
          <Icon name="plus" className="h-4 w-4" /> Add {isSgpa ? "subject" : "semester"}
        </button>
        <button
          type="button"
          onClick={resetRows}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
        >
          <Icon name="reset" className="h-4 w-4" /> Clear
        </button>
      </div>

      {hasBad && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          Check the highlighted rows: credits must be above 0 and values must be between 0 and 10.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[#102b5b] to-indigo-700 p-5 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Your estimated {mode.toUpperCase()}</p>
          <p className="mt-1 text-4xl font-black tabular-nums" aria-live="polite">
            {result === null ? "—" : result.toFixed(2)}
          </p>
        </div>
        <p className="text-sm text-blue-100">
          {result === null
            ? "Enter credits and values to see your result."
            : `${totalCredits} total credits · ${counted} ${isSgpa ? "subject" : "semester"}${counted === 1 ? "" : "s"} counted`}
        </p>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {isSgpa ? "SGPA = Σ(credits × grade points) ÷ Σ credits." : "CGPA here is the credit-weighted average of your semester SGPAs."}{" "}
        This assumes a 10-point scale. Your university may use a different scale, rounding rule, or percentage
        conversion, so treat the result as an estimate.
      </p>
    </div>
  );
}

/* ====================================================================== */
/*  Weekly hours planner                                                   */
/* ====================================================================== */

const PLANNER = [
  { key: "lectures", label: "Lectures & labs", hours: 30, max: 60, bar: "bg-blue-500" },
  { key: "study", label: "Self-study & revision", hours: 10, max: 40, bar: "bg-violet-500" },
  { key: "skills", label: "Coding & skill practice", hours: 6, max: 30, bar: "bg-cyan-500" },
  { key: "sleep", label: "Sleep", hours: 49, max: 70, bar: "bg-indigo-400" },
  { key: "travel", label: "Travel & meals", hours: 21, max: 50, bar: "bg-amber-400" },
  { key: "rest", label: "Rest, hobbies & social", hours: 14, max: 50, bar: "bg-emerald-500" },
];

const HOURS_IN_WEEK = 168;

function WeekPlanner() {
  const [hours, setHours] = useState<Record<string, number>>(() =>
    Object.fromEntries(PLANNER.map((item) => [item.key, item.hours]))
  );

  const total = PLANNER.reduce((sum, item) => sum + (hours[item.key] ?? 0), 0);
  const free = HOURS_IN_WEEK - total;
  const scale = Math.max(total, HOURS_IN_WEEK);

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
            <Icon name="clock" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-slate-900">Try it: weekly hours planner</h3>
            <p className="text-xs text-slate-500">A week has {HOURS_IN_WEEK} hours. See how yours add up.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHours(Object.fromEntries(PLANNER.map((item) => [item.key, item.hours])))}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-100"
        >
          <Icon name="reset" className="h-4 w-4" /> Reset
        </button>
      </div>

      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-slate-200" role="img" aria-label="Weekly hours breakdown">
        {PLANNER.map((item) => (
          <span
            key={item.key}
            className={`${item.bar} transition-all duration-200`}
            style={{ width: `${((hours[item.key] ?? 0) / scale) * 100}%` }}
            title={`${item.label}: ${hours[item.key]} h`}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-2">
        {PLANNER.map((item) => (
          <div key={item.key}>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor={`planner-${item.key}`} className="inline-flex items-center gap-2 font-semibold text-slate-700">
                <span className={`h-2.5 w-2.5 rounded-full ${item.bar}`} aria-hidden="true" />
                {item.label}
              </label>
              <span className="tabular-nums text-slate-500">
                <strong className="text-slate-900">{hours[item.key]} h</strong> · {((hours[item.key] ?? 0) / 7).toFixed(1)} h/day
              </span>
            </div>
            <input
              id={`planner-${item.key}`}
              type="range"
              min={0}
              max={item.max}
              step={1}
              value={hours[item.key]}
              onChange={(e) => setHours((current) => ({ ...current, [item.key]: Number(e.target.value) }))}
              className="mt-2 w-full accent-blue-700"
            />
          </div>
        ))}
      </div>

      <p
        className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
          free >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
        }`}
        aria-live="polite"
      >
        {free >= 0
          ? `${total} of ${HOURS_IN_WEEK} hours planned. ${free} hours are left for projects, exams, or flexibility.`
          : `You have planned ${-free} hours more than a week contains. Reduce some activities to make the plan realistic.`}
      </p>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        These starting values are only an example. Adjust them to your own timetable, commute, and subjects.
      </p>
    </div>
  );
}

export default function StudentGuidePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState(TOC[0].id);
  const [scrollPct, setScrollPct] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");

  /* Load saved checklist progress (browser only). */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setDone(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      /* storage may be unavailable */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {
      /* ignore */
    }
  }, [done, loaded]);

  function toggle(item: string) {
    setDone((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  }

  /* Reading progress bar and back-to-top button. */
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0);
      setShowTop(window.scrollY > 700);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Highlight the section currently in view. */
  useEffect(() => {
    const elements = TOC.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const doneCount = checklist.filter((item) => done.includes(item)).length;
  const donePct = Math.round((doneCount / checklist.length) * 100);
  const practicalKey = (item: string) => `practical:${item}`;

  const filteredSections = sections.filter((s) => {
    const q = topicQuery.trim().toLowerCase();
    return !q || s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
  });

  return (
    <main
      className="min-h-screen bg-[#f4f7fc] text-slate-900 antialiased"
      style={{ fontFamily: "Inter, 'Segoe UI', system-ui, -apple-system, Arial, sans-serif" }}
    >
      {/* Reading progress */}
      <div className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 transition-[width] duration-100"
          style={{ width: `${scrollPct}%` }}
        />
      </div>

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
              const active = item.href === "/student-guide";
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

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-blue-800 shadow-sm sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Maharashtra · Student resource
            </span>

            <h1 className="mt-5 max-w-3xl text-[2.3rem] font-black leading-[1.07] tracking-[-0.04em] text-[#10264f] sm:text-5xl lg:text-[3.4rem]">
              Your first-year engineering journey,{" "}
              <span className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                made clearer.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              A practical guide to college academics, exams, skills, scholarships, and career
              preparation, organized into simple steps you can act on.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#guide-topics"
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 px-7 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-700/25 transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                Explore the guide <Icon name="down" className="h-4 w-4" />
              </a>
              <Link
                href="/#predict"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-extrabold text-slate-800 shadow-sm transition hover:border-blue-300 hover:text-blue-700"
              >
                Find colleges <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-5 flex max-w-xl items-start gap-2 text-xs leading-5 text-slate-500">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Rules and examples are general guidance. Always confirm current regulations with your
              university and college.
            </p>
          </div>

          <div className="rounded-3xl border border-white bg-white/85 p-5 shadow-[0_28px_90px_rgba(30,64,175,0.14)] ring-1 ring-blue-950/5 backdrop-blur-xl sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-700">The engineering success model</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {successModel.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${item.tone}`}>
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-extrabold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-[#102b5b] to-indigo-700 p-4 text-center text-sm font-extrabold text-white">
              Academics + Skills + Projects + Communication + Health
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ Topic grid ------------------------------ */}
      <section id="guide-topics" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">Your roadmap</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Everything you need to get started</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Choose a topic to jump directly to its practical notes, diagrams, and checklists.
          </p>
        </div>

        <div className="relative mt-6 max-w-md">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={topicQuery}
            onChange={(event) => setTopicQuery(event.target.value)}
            placeholder="Search topics, e.g. SGPA, backlog, resume..."
            aria-label="Search guide topics"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        {filteredSections.length === 0 && (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No topics match &ldquo;{topicQuery}&rdquo;. Try another word.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSections.map((s) => (
            <a
              key={s.n}
              href={`#section-${s.n}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5"
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${s.tone}`}>
                  <Icon name={s.icon} className="h-6 w-6" />
                </span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-extrabold text-slate-500">{s.n}</span>
              </div>
              <h3 className="mt-4 text-lg font-extrabold text-slate-950 group-hover:text-blue-700">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{s.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700">
                Read section <Icon name="arrow" className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Mobile section chips */}
      <div className="sticky top-16 z-40 mt-10 border-y border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6" role="navigation" aria-label="Guide sections">
          {TOC.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                activeId === item.id ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {item.n}
            </a>
          ))}
        </div>
      </div>

      {/* ------------------------------ Content with sticky contents list ------------------------------ */}
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <aside className="hidden lg:block">
          <nav aria-label="Guide contents" className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="px-3 pb-2 pt-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
              On this page
            </p>
            <ul className="space-y-0.5">
              {TOC.map((item) => {
                const active = activeId === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={active ? "true" : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-extrabold ${
                          active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.n}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Checklist progress</span>
                <span className="text-blue-700">{donePct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all" style={{ width: `${donePct}%` }} />
              </div>
            </div>
          </nav>
        </aside>

        <div className="min-w-0 space-y-8">
          {/* 01 */}
          <SectionCard id="section-01" n="01" icon="cap" tone="bg-blue-50 text-blue-700" title="Understand engineering and branches" subtitle="Engineering connects science, mathematics, design, and practical problem-solving. Your branch influences the subjects you study, but you can explore skills across fields.">
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-4 font-bold">Branch</th>
                    <th className="p-4 font-bold">Main learning areas</th>
                    <th className="p-4 font-bold">Possible career directions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b, i) => (
                    <tr key={b[0]} className={`${i % 2 ? "bg-slate-50" : "bg-white"} transition hover:bg-blue-50/60`}>
                      <td className="p-4 font-bold text-slate-900">{b[0]}</td>
                      <td className="p-4 text-slate-600">{b[1]}</td>
                      <td className="p-4 text-slate-600">{b[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {branches.map((b) => (
                <div key={b[0]} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <h3 className="font-extrabold text-slate-900">{b[0]}</h3>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">Learning areas</p>
                  <p className="text-sm leading-6 text-slate-600">{b[1]}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">Career directions</p>
                  <p className="text-sm leading-6 text-slate-600">{b[2]}</p>
                </div>
              ))}
            </div>

            <Callout title="Choose with curiosity, not only trends" text="Look at the actual syllabus, the kind of problems you enjoy, available facilities, and career paths. No branch guarantees a particular job; skills and experience matter." />
          </SectionCard>

          {/* 02 */}
          <SectionCard id="section-02" n="02" icon="building" tone="bg-indigo-50 text-indigo-700" title="Understand your college and university" subtitle="Autonomous colleges generally manage their own curriculum and examinations under applicable regulations. Affiliated colleges generally follow their affiliating university's academic framework.">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoCard title="Autonomous college" text="May set its syllabus and examination schedule within its approved autonomy and regulatory framework. Confirm rules from the college's official academic office." />
              <InfoCard title="Affiliated college" text="Usually follows the affiliating university's syllabus and examination framework. Check the latest ordinance and academic calendar." />
            </div>

            <div className="mt-6 rounded-2xl bg-gradient-to-br from-[#102b5b] to-indigo-800 p-5 text-white sm:p-7">
              <h3 className="font-extrabold">Your verification path</h3>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {["Official university portal", "College academic section", "Latest syllabus / ordinance", "Confirm with exam cell"].map((x, i) => (
                  <div key={x} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-300 font-black text-blue-950">{i + 1}</span>
                    <span className="text-sm font-semibold">{x}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* 03 */}
          <SectionCard id="section-03" n="03" icon="chart" tone="bg-violet-50 text-violet-700" title="Credits, SGPA and CGPA" subtitle="Credits represent a subject's weight in the academic programme. Grade points are combined with credits to calculate a weighted semester score.">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                <p className="text-sm font-bold text-slate-500">SGPA — semester performance</p>
                <div className="my-5 rounded-xl bg-white p-5 text-center font-mono text-sm font-bold text-blue-800 shadow-sm ring-1 ring-slate-100 sm:text-base">
                  Σ (Credits × Grade Points) ÷ Σ Credits
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Example: multiply each subject's credit by its grade point, add the results, then divide by total
                  credits. Use your university's official method.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-6">
                <p className="text-sm font-bold text-slate-500">How the calculation flows</p>
                <div className="mt-4 flex flex-col items-center gap-1.5 text-center text-sm font-bold">
                  <div className="w-full rounded-xl bg-blue-50 p-3 text-blue-900">Subject marks → grade</div>
                  <Icon name="down" className="h-4 w-4 text-blue-400" />
                  <div className="w-full rounded-xl bg-indigo-50 p-3 text-indigo-900">Grade → grade points</div>
                  <Icon name="down" className="h-4 w-4 text-blue-400" />
                  <div className="w-full rounded-xl bg-cyan-50 p-3 text-cyan-900">Credits × grade points</div>
                  <Icon name="down" className="h-4 w-4 text-blue-400" />
                  <div className="w-full rounded-xl bg-blue-700 p-3 text-white">Weighted SGPA</div>
                </div>
              </div>
            </div>

            <GradeCalculator />

            <Callout title="Improve strategically" text="Identify high-credit subjects early, practice throughout the semester, and ask faculty about weak concepts before exam season. Exact grading and CGPA rules vary by institute." />
          </SectionCard>

          {/* 04 */}
          <SectionCard id="section-04" n="04" icon="edit" tone="bg-sky-50 text-sky-700" title="Exams, passing rules and backlogs" subtitle="Know your own institute's rules before planning around them. Minimum marks, practical requirements, ATKT eligibility, grace marks, and backlog limits can differ.">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard title="In-semester" text="Revise each unit weekly, keep concise notes, and practice likely question formats." />
              <InfoCard title="End-semester" text="Start early, solve previous papers where available, show formulas and steps in numericals." />
              <InfoCard title="Backlog recovery" text="Find the exact failed component, confirm the next exam opportunity, and make a weekly recovery plan." />
            </div>
            <Callout tone="warn" title="Verify before you rely on a rule" text="Use your official university ordinance, college examination notices, and exam cell—not only advice from students at another institution." />
          </SectionCard>

          {/* 05 */}
          <SectionCard id="section-05" n="05" icon="calendar" tone="bg-emerald-50 text-emerald-700" title="Study routine and practical checklist" subtitle="A steady routine is more useful than last-minute marathons. Adjust these example time blocks to your actual timetable and commute.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["College hours", "Lectures, labs, questions"],
                ["Rest & reset", "Meal, travel, recharge"],
                ["Focused study", "Assignments and revision"],
                ["Skill practice", "Coding, reading, project work"],
              ].map((x, i) => (
                <div key={x[0]} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-blue-700">Block {i + 1}</div>
                  <h3 className="mt-2 font-extrabold text-slate-900">{x[0]}</h3>
                  <p className="mt-1 text-sm text-slate-600">{x[1]}</p>
                </div>
              ))}
            </div>

            <WeekPlanner />

            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900">Before submitting a practical</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {practicalChecklist.map((item) => (
                  <CheckItem
                    key={item}
                    label={item}
                    checked={done.includes(practicalKey(item))}
                    onToggle={() => toggle(practicalKey(item))}
                  />
                ))}
              </div>
            </div>
          </SectionCard>

          {/* 06 */}
          <SectionCard id="section-06" n="06" icon="code" tone="bg-cyan-50 text-cyan-700" title="Beginner coding roadmap" subtitle="Pick one language first. Learn the fundamentals, practice problem-solving, use version control, then build small projects.">
            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["1", "Fundamentals", "Variables, conditions, loops, functions"],
                ["2", "Problem solving", "Small exercises and easy challenges"],
                ["3", "Git & GitHub", "Save work, track changes, explain projects"],
                ["4", "Build a project", "Create something useful and document it"],
              ].map((x, i) => (
                <div key={x[0]} className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-700 font-black text-white shadow-md shadow-blue-700/25">{x[0]}</span>
                  <h3 className="mt-4 font-extrabold text-slate-900">{x[1]}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{x[2]}</p>
                  {i < 3 && (
                    <span className="absolute -right-3 top-8 z-10 hidden h-6 w-6 place-items-center rounded-full bg-white text-blue-500 shadow ring-1 ring-slate-200 md:grid">
                      <Icon name="arrow" className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Callout title="Project ideas" text="Try a student expense tracker, a timetable planner, a simple data dashboard, a campus FAQ page, or a small sensor/IoT prototype. Start small and describe what you learned." />
          </SectionCard>

          {/* 07 */}
          <SectionCard id="section-07" n="07" icon="briefcase" tone="bg-orange-50 text-orange-700" title="Resume, communication and internships" subtitle="A strong first-year profile shows evidence of learning—not a long list of tools.">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Build your one-page resume",
                  items: [
                    "Education and relevant coursework",
                    "Skills you can explain and demonstrate",
                    "Projects with your contribution and outcome",
                    "Relevant certifications and activities",
                    "Working GitHub or portfolio links",
                  ],
                },
                {
                  title: "Grow professional habits",
                  items: [
                    "Write clear, respectful emails",
                    "Practice short presentations",
                    "Contribute reliably to team projects",
                    "Keep a record of project decisions",
                    "Look for internships that match your current level",
                  ],
                },
              ].map((block) => (
                <div key={block.title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <h3 className="font-extrabold text-slate-900">{block.title}</h3>
                  <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-600">
                    {block.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700">
                          <Icon name="check" className="h-2.5 w-2.5" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 08 */}
          <SectionCard id="section-08" n="08" icon="folder" tone="bg-amber-50 text-amber-700" title="Scholarships and important documents" subtitle="Eligibility, required documents, and deadlines change. Verify every requirement on the official scheme portal before applying.">
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard title="MahaDBT" text="Check Maharashtra state scheme eligibility and current application dates." />
              <InfoCard title="National Scholarship Portal" text="Check central and participating scholarship schemes." />
              <InfoCard title="Tuition Fee Waiver Scheme" text="Review eligibility and admission-stage rules in the current official guidance." />
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 p-5">
              <h3 className="font-extrabold text-slate-900">Keep secure copies of</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Admission/allotment letter, fee receipt, marksheets, leaving or transfer certificate, identity
                document, domicile/nationality certificate, applicable caste and income certificates, bank details
                required by the scheme, and passport-size photographs. Share sensitive documents only through
                trusted official channels.
              </p>
            </div>
          </SectionCard>

          {/* 09 */}
          <SectionCard id="section-09" n="09" icon="heart" tone="bg-rose-50 text-rose-700" title="Well-being, budgeting and safety" subtitle="Your health is part of your academic plan. Build routines that are realistic and ask for support early when something is not manageable.">
            <div className="grid gap-4 sm:grid-cols-3">
              <InfoCard title="Sleep & food" text="Aim for consistent sleep, regular meals, hydration, and breaks." />
              <InfoCard title="Money habits" text="Track monthly expenses and set aside money for travel, food, and study needs." />
              <InfoCard title="Get support" text="Contact a trusted faculty member, campus counsellor, or college support service when overwhelmed." />
            </div>
            <Callout tone="danger" title="Ragging and harassment" text="Ragging is prohibited. If you face it, seek immediate help from your college anti-ragging committee and consult the current official national anti-ragging resources. If you are in immediate danger, contact local emergency services." />
          </SectionCard>

          {/* 10 */}
          <SectionCard id="section-10" n="10" icon="info" tone="bg-slate-100 text-slate-700" title="Glossary and common questions" subtitle="Short explanations of terms you will hear in your first semester, plus answers to questions students often ask.">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">Key terms</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {GLOSSARY.map(([term, definition]) => (
                <div key={term} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <dt className="font-extrabold text-blue-800">{term}</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">{definition}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-8 text-sm font-extrabold uppercase tracking-wider text-slate-500">Frequently asked questions</h3>
            <div className="mt-4 space-y-3">
              {FAQ.map(([question, answer]) => (
                <details key={question} className="group rounded-xl border border-slate-200 bg-white open:border-blue-200 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3.5 font-bold text-slate-900 marker:hidden hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    {question}
                    <Icon name="chevron" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-6 text-slate-600">{answer}</p>
                </details>
              ))}
            </div>
          </SectionCard>

          {/* 11 */}
          <SectionCard id="section-11" n="11" icon="check" tone="bg-emerald-50 text-emerald-700" title="Your first-year action checklist" subtitle="Tick items as you complete them. Your progress is saved in this browser.">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-700">
                    {doneCount} of {checklist.length} completed
                  </p>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300" style={{ width: `${donePct}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDone((current) => current.filter((item) => !checklist.includes(item)))}
                  disabled={doneCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="reset" className="h-4 w-4" /> Reset
                </button>
              </div>

              {doneCount === checklist.length && (
                <p className="mt-4 rounded-xl bg-emerald-100 px-4 py-3 text-sm font-bold text-emerald-800">
                  Great work! You have completed every item on your first-year checklist.
                </p>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {checklist.map((item) => (
                  <CheckItem key={item} label={item} checked={done.includes(item)} onToggle={() => toggle(item)} />
                ))}
              </div>
            </div>

            <div className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-r from-[#102b5b] to-indigo-700 p-6 text-white sm:p-9">
              <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[28px] border-white/10" aria-hidden="true" />
              <h2 className="relative text-2xl font-black">Your next step starts here.</h2>
              <p className="relative mt-2 max-w-2xl leading-7 text-blue-100">
                Use the College Predictor to explore historical Maharashtra CAP cutoff records, then use this guide
                to plan your next academic steps.
              </p>
              <Link
                href="/#predict"
                className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
              >
                Explore college predictions <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Academic disclaimer: This guide is educational and general in nature. Examples of marks, grading,
                attendance, ATKT, scholarship eligibility, and procedures are not universal rules. Verify current
                information with your own university, college administration, and official government portals.
              </span>
            </p>
          </SectionCard>
        </div>
      </div>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-blue-700 text-white shadow-xl shadow-blue-700/30 transition hover:-translate-y-0.5 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
          <p className="text-xs text-slate-400">Student Guide · Maharashtra engineering students</p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-blue-300 transition hover:text-white">
            Back to predictor <Icon name="arrow" className="h-4 w-4 -rotate-90" />
          </Link>
        </div>
      </footer>
    </main>
  );
}