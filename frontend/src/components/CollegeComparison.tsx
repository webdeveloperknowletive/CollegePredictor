"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

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

type Props = { colleges: Prediction[] };
type CollegeDetailsResponse = {
  institute_code?: string | number;
  college_name?: string;
  details?: Record<string, unknown> | null;
  branches?: Array<{ branch_code?: string | number; branch_name?: string }>;
};
type ComparisonField = {
  label: string;
  aliases: string[];
  format?: "money" | "number" | "year" | "url" | "text";
};

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const FIELD_GROUPS: { title: string; fields: ComparisonField[] }[] = [
  {
    title: "💰 Fees & campus facilities",
    fields: [
      { label: "Fees", aliases: ["fees", "fee", "annual fees", "tuition fees", "total fees", "course fees", "fees structure", "fee structure", "tuition fee"], format: "money" },
      { label: "Hostel availability", aliases: ["hostel y n", "hostel", "hostel availability", "hostel available", "hostel facility", "hostel facilities"] },
      { label: "Hostel capacity", aliases: ["hostel strength", "hostel capacity", "hostel intake", "hostel students capacity"], format: "number" },
      { label: "Nearby PG availability", aliases: ["near by area pg y n", "nearby pg", "nearby pgs", "pg availability", "nearby accommodation", "paying guest"] },
    ],
  },
  {
    title: "🚀 Placements & career outcomes",
    fields: [
      { label: "Students placed (last year)", aliases: ["how many students got placed last year", "students placed", "students placed last year", "number of students placed", "placed students", "placement count", "students_placed"], format: "number" },
      { label: "Average package", aliases: ["average package", "avg package", "average salary package", "average placement package", "average_package"], format: "money" },
      { label: "Highest package", aliases: ["highesht package", "highest package", "highest salary package", "maximum package", "highest_package"], format: "money" },
      { label: "Companies visited", aliases: ["no of compnies visited for placement", "no of companies visited for placement", "companies visited", "number of companies visited", "companies for placement", "placement companies", "companies_visited"], format: "number" },
      { label: "Placement officer", aliases: ["tpo name", "training and placement officer", "placement officer", "tpo_name"] },
      { label: "Placement email", aliases: ["tpo email", "placement email", "placement contact email", "tpo_email"] },
      { label: "Placement companies link", aliases: ["link of companies page", "companies link", "placement link", "placement website", "companies_link"], format: "url" },
    ],
  },
  {
    title: "🏛️ College profile & quality",
    fields: [
      { label: "College status", aliases: ["status", "college status", "institute status", "institution status"] },
      { label: "Established year", aliases: ["established", "established year", "year of establishment", "establishment year", "established_year", "year established"], format: "year" },
      { label: "Total intake", aliases: ["intake", "total intake", "approved intake", "sanctioned intake", "total sanctioned intake", "intake capacity"], format: "number" },
      { label: "NAAC rating", aliases: ["naac rating", "naac grade", "naac", "naac_rating"] },
    ],
  },
  {
    title: "📍 Official contact & location",
    fields: [
      { label: "Place / address", aliases: ["place", "address", "college address", "location", "full address", "institute address"] },
      { label: "Official website", aliases: ["official website", "website", "college website", "web site", "website url", "institute website"], format: "url" },
      { label: "Official email", aliases: ["official mail id", "official email", "email", "college email", "contact email"] },
      { label: "College contact number", aliases: ["contact no 1 2", "contact number", "college phone", "telephone", "mobile", "phone"] },
      { label: "Resource person", aliases: ["resource person name", "resource person", "contact person", "resource_person"] },
    ],
  },
];

function getKey(item: Prediction): string {
  return [item.institute_code, item.branch_name, item.cap_round, item.category].join("::");
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && ["", "-", "na", "n/a", "null", "not available", "not applicable"].includes(value.trim().toLowerCase()));
}

function flattenEntries(details: Record<string, unknown> | undefined): Array<[string, unknown]> {
  if (!details) return [];
  const output: Array<[string, unknown]> = [];
  const visit = (value: unknown, prefix = "") => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output.push([key, child]);
      if (child && typeof child === "object" && !Array.isArray(child)) visit(child, prefix ? `${prefix}.${key}` : key);
    }
  };
  visit(details);
  return output;
}

function findDetail(details: Record<string, unknown> | undefined, aliases: string[]): unknown {
  if (!details) return undefined;
  const entries = flattenEntries(details);
  const wanted = aliases.map(normalizeKey).filter(Boolean);
  // First prefer exact normalized heading matches, including Excel headings with trailing spaces and punctuation.
  for (const alias of wanted) {
    const match = entries.find(([key, value]) => normalizeKey(key) === alias && !isEmpty(value));
    if (match) return match[1];
  }
  // Then match normalized aliases against common database key variations.
  for (const alias of wanted) {
    const match = entries.find(([key, value]) => {
      const normalized = normalizeKey(key);
      return !isEmpty(value) && normalized.length > 2 && (normalized.includes(alias) || alias.includes(normalized));
    });
    if (match) return match[1];
  }
  return undefined;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "Not available";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

function numericValue(value: unknown): number | null {
  if (isEmpty(value)) return null;
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function packageInLpa(value: unknown): number | null {
  if (isEmpty(value)) return null;
  const text = String(value).toLowerCase().replace(/,/g, "").trim();
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return null;
  if (/crore|crores|\bcr\b/.test(text)) return amount * 100;
  if (/lpa|lakh|lakhs|\bl\b/.test(text)) return amount;
  if (/₹|inr|rupee|rupees/.test(text)) return amount / 100000;
  return null;
}

function compactPackage(value: unknown): string {
  if (isEmpty(value)) return "Not listed";
  return String(value).trim();
}

function formatValue(value: unknown, format: ComparisonField["format"] = "text"): string {
  if (isEmpty(value)) return "Not listed in master data";
  if (typeof value === "number") {
    if (format === "money") return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  const text = String(value).trim();
  if (format === "money") {
    if (/\d/.test(text)) return `₹${text.replace(/^₹/, "")}`;
  }
  return text;
}

function safeUrl(value: unknown): string | null {
  if (isEmpty(value)) return null;
  const text = String(value).trim();
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function getChanceStyle(prediction: Prediction["prediction"]): string {
  if (prediction === "More Chance") return "bg-green-100 text-green-800";
  if (prediction === "Moderate") return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

export default function CollegeComparison({ colleges }: Props) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [masterData, setMasterData] = useState<Record<string, Record<string, unknown>>>({});
  const [loadingCodes, setLoadingCodes] = useState<string[]>([]);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});

  const selectedColleges = useMemo(
    () => selectedKeys.map((key) => colleges.find((college) => getKey(college) === key)).filter((college): college is Prediction => college !== undefined),
    [selectedKeys, colleges]
  );

  useEffect(() => {
    let cancelled = false;
    const codes = Array.from(new Set(selectedColleges.map((college) => String(college.institute_code))));
    const missingCodes = codes.filter((code) => !Object.prototype.hasOwnProperty.call(masterData, code) && !detailErrors[code]);
    if (missingCodes.length === 0) return;

    setLoadingCodes((current) => Array.from(new Set([...current, ...missingCodes])));
    Promise.all(missingCodes.map(async (code) => {
      try {
        const response = await fetch(`${API_URL}/colleges/${encodeURIComponent(code)}/details`, { cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 404 ? "College master-data record was not found." : `Details request failed (${response.status}).`);
        const data: CollegeDetailsResponse = await response.json();
        return { code, details: data.details ?? {} as Record<string, unknown>, error: "" };
      } catch (error) {
        return { code, details: {} as Record<string, unknown>, error: error instanceof Error ? error.message : "Could not load college details." };
      }
    })).then((results) => {
      if (cancelled) return;
      setMasterData((current) => {
        const next = { ...current };
        for (const result of results) next[result.code] = result.details;
        return next;
      });
      setDetailErrors((current) => {
        const next = { ...current };
        for (const result of results) if (result.error) next[result.code] = result.error;
        return next;
      });
      setLoadingCodes((current) => current.filter((code) => !missingCodes.includes(code)));
    });

    return () => { cancelled = true; };
  }, [selectedColleges, masterData, detailErrors]);

  function toggleCollege(key: string) {
    setSelectedKeys((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= 3) return current;
      return [...current, key];
    });
  }

  if (!colleges.length) return null;

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 px-5 py-6 text-white sm:px-7 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-indigo-100">✨ SMART COLLEGE DECISION TOOL</span>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">🎓 Compare Colleges</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">Compare admission trends, fees, campus facilities, placements and college quality side by side — all in one place.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-medium text-blue-100">COLLEGES TO COMPARE</p>
            <p className="mt-1 text-2xl font-extrabold">Up to 3 <span className="text-lg">🏆</span></p>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6">

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">🧭 Choose colleges to compare</h3>
          <p className="mt-1 text-xs text-slate-500">Select up to three colleges from your prediction results.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-bold text-indigo-800">{selectedColleges.length} / 3 selected</span>
          <button type="button" onClick={() => setSelectedKeys([])} disabled={selectedKeys.length === 0} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">↺ Clear</button>
        </div>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        {colleges.map((college) => {
          const key = getKey(college);
          const isSelected = selectedKeys.includes(key);
          const limitReached = selectedKeys.length >= 3 && !isSelected;
          return (
            <label key={key} className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all duration-200 ${isSelected ? "border-indigo-400 bg-white shadow-md shadow-indigo-100 ring-1 ring-indigo-100" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm"} ${limitReached ? "cursor-not-allowed opacity-60" : ""}`}>
              <input type="checkbox" checked={isSelected} disabled={limitReached} onChange={() => toggleCollege(key)} className="mt-1 h-4 w-4 accent-indigo-600" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-5 text-slate-900">🏫 {college.college_name}</span>
                <span className="mt-1.5 inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">🏷️ Institute code: {college.institute_code}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold shadow-sm ${getChanceStyle(college.prediction)}`}>{college.prediction === "More Chance" ? "🟢 " : college.prediction === "Moderate" ? "🟡 " : "🔴 "}{college.prediction}</span>
            </label>
          );
        })}
      </div>

      {selectedColleges.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">📊 Side-by-side comparison</h3>
              <p className="mt-1 text-xs text-slate-500">A clear view of the factors that matter when choosing your college.</p>
            </div>
            {loadingCodes.length > 0 && <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"><span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" /> Loading college details…</span>}
          </div>
          {selectedColleges.some((college) => detailErrors[String(college.institute_code)]) && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Some college master-data details could not be loaded. Admission data is still shown; check that the FastAPI backend is running at {API_URL}.</p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-gradient-to-r from-slate-950 to-indigo-950">
                <tr>
                  <th className="sticky left-0 z-10 min-w-52 bg-slate-950 p-4 font-bold text-white">🔎 Comparison factor</th>
                  {selectedColleges.map((college, index) => <th key={getKey(college)} className="min-w-56 border-l border-white/10 p-4 font-bold text-white"><span className="mb-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-100">College {index + 1}</span><span className="block leading-5">🏫 {college.college_name}</span><span className="mt-2 block text-xs font-medium text-indigo-200">ID: {college.institute_code}</span></th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr><td colSpan={selectedColleges.length + 1} className="bg-gradient-to-r from-indigo-50 via-blue-50 to-sky-50 p-3.5 font-extrabold tracking-wide text-indigo-950">Admission & prediction</td></tr>
                {[
                  { label: "Historical cutoff percentile", value: (c: Prediction) => formatNumber(c.historical_cutoff_percentile) },
                  { label: "Historical closing rank", value: (c: Prediction) => formatNumber(c.historical_closing_rank) },
                  { label: "Your percentile", value: (c: Prediction) => formatNumber(c.student_percentile) },
                  { label: "Percentile difference", value: (c: Prediction) => formatNumber(c.percentile_difference) },
                  { label: "Prediction estimate", value: (c: Prediction) => c.prediction },
                  { label: "Seat status", value: (c: Prediction) => c.status || "Not available" },
                  { label: "Level / stage", value: (c: Prediction) => [c.level, c.stage].filter(Boolean).join(" / ") || "Not available" },
                ].map((field) => (
                  <tr key={field.label} className="transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/70"><th className="sticky left-0 border-r border-slate-100 bg-inherit p-3.5 font-semibold text-slate-700">{field.label}</th>{selectedColleges.map((college) => <td key={getKey(college)} className="border-l border-slate-100 p-3.5 font-medium text-slate-800">{field.label === "Prediction estimate" ? <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${getChanceStyle(college.prediction)}`}>{field.value(college)}</span> : field.value(college)}</td>)}</tr>
                ))}
                {FIELD_GROUPS.map((group) => (
                  <Fragment key={group.title}>
                    <tr key={`${group.title}-heading`}><td colSpan={selectedColleges.length + 1} className="bg-gradient-to-r from-indigo-50 via-blue-50 to-sky-50 p-3.5 font-extrabold tracking-wide text-indigo-950">{group.title}</td></tr>
                    {group.fields.map((field) => (
                      <tr key={`${group.title}-${field.label}`} className="transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/70">
                        <th className="sticky left-0 border-r border-slate-100 bg-inherit p-3.5 font-semibold text-slate-700">{field.label}</th>
                        {selectedColleges.map((college) => {
                          const code = String(college.institute_code);
                          const rawValue = findDetail(masterData[code], field.aliases);
                          const display = formatValue(rawValue, field.format);
                          const url = field.format === "url" ? safeUrl(rawValue) : null;
                          return <td key={getKey(college)} className="border-l border-slate-100 p-3.5 font-medium text-slate-800">{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 font-bold text-blue-700 no-underline transition hover:bg-blue-100 hover:text-blue-900">🔗 Open link ↗</a> : display}</td>;
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs leading-5 text-slate-600"><span className="text-lg">💡</span><p>College profile details are loaded from the existing master-data endpoint. If a value shows “Not listed”, the selected college’s API response may not contain a matching field. Admission estimates are based on historical cutoff data and do not guarantee admission.</p></div>
        </div>
      )}
      {selectedColleges.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-4 py-8 text-center"><span className="text-3xl">👆</span><p className="mt-2 font-bold text-slate-800">Ready to compare?</p><p className="mt-1 text-sm text-slate-500">Select one or more colleges above to see their details side by side.</p></div>}
      </div>
    </section>
  );
}
