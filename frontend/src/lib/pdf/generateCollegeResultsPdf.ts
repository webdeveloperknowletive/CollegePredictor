import jsPDF from "jspdf";

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

type CollegeProfile = {
  institute_code?: string | number;
  college_name?: string;
  details?: Record<string, unknown>;
  branches?: {
    branch_code?: string | number | null;
    branch_name: string;
  }[];
};

type PredictionResults = {
  student_percentile: number;
  category: string;
  branch: string;
  cap_round: number;
  total_results: number;
  notice?: string;
  predictions: Prediction[];
};

type PdfOptions = {
  results: PredictionResults;
  apiUrl: string;
  logoUrl?: string;
  cutoffYear?: string | number;
};

const COLORS = {
  navy: [7, 22, 56] as [number, number, number],
  blue: [36, 84, 216] as [number, number, number],
  orange: [240, 107, 27] as [number, number, number],
  text: [27, 39, 61] as [number, number, number],
  muted: [96, 108, 128] as [number, number, number],
  pale: [243, 247, 253] as [number, number, number],
  border: [220, 228, 240] as [number, number, number],
  green: [22, 131, 93] as [number, number, number],
  amber: [169, 104, 0] as [number, number, number],
  red: [178, 58, 72] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const MARGIN = 15;
const FOOTER_LIMIT = 278;

function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPredictionColor(
  prediction: string
): [number, number, number] {
  if (prediction === "More Chance") return COLORS.green;
  if (prediction === "Moderate") return COLORS.amber;
  return COLORS.red;
}

async function loadLogo(logoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(
          typeof reader.result === "string" ? reader.result : null
        );
      };

      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadCollegeProfiles(
  predictions: Prediction[],
  apiUrl: string
): Promise<Map<string, CollegeProfile | null>> {
  const codes = [
    ...new Set(
      predictions.map((item) => String(item.institute_code))
    ),
  ];

  const entries = await Promise.all(
    codes.map(async (code) => {
      try {
        const response = await fetch(
          `${apiUrl}/colleges/${encodeURIComponent(code)}/details`
        );

        if (!response.ok) return [code, null] as const;

        const profile = (await response.json()) as CollegeProfile;
        return [code, profile] as const;
      } catch {
        return [code, null] as const;
      }
    })
  );

  return new Map(entries);
}

export async function generateCollegeResultsPdf({
  results,
  apiUrl,
  logoUrl = "/images/knowletive-logo.png",
  cutoffYear = 2025,
}: PdfOptions): Promise<void> {
  if (!results.predictions?.length) {
    throw new Error("No college predictions are available to export.");
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  const [logo, profiles] = await Promise.all([
    loadLogo(logoUrl),
    loadCollegeProfiles(results.predictions, apiUrl),
  ]);

  let y = 20;

  function addPageHeader(section: string) {
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(0, 0, pageWidth, 14, "F");

    pdf.setFillColor(...COLORS.orange);
    pdf.rect(0, 14, pageWidth, 1.5, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.white);
    pdf.text("KNOWLETIVE", MARGIN, 9);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(section, pageWidth - MARGIN, 9, {
      align: "right",
    });

    y = 24;
  }

  function addFooter() {
    const pageCount = pdf.getNumberOfPages();

    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);

      pdf.setDrawColor(...COLORS.orange);
      pdf.setLineWidth(0.8);
      pdf.line(
        MARGIN,
        FOOTER_LIMIT,
        pageWidth - MARGIN,
        FOOTER_LIMIT
      );

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.muted);

      pdf.text(
        "Knowletive | MHT-CET College Predictor",
        MARGIN,
        FOOTER_LIMIT + 5
      );

      pdf.text(
        "Historical estimates only. Admission is not guaranteed.",
        MARGIN,
        FOOTER_LIMIT + 9
      );

      pdf.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - MARGIN,
        FOOTER_LIMIT + 5,
        { align: "right" }
      );
    }
  }

  function ensureSpace(requiredHeight: number) {
    if (y + requiredHeight > FOOTER_LIMIT - 5) {
      pdf.addPage();
      addPageHeader("College prediction report");
    }
  }

  function addSectionTitle(title: string) {
    ensureSpace(13);

    pdf.setFillColor(...COLORS.pale);
    pdf.roundedRect(
      MARGIN,
      y - 4,
      contentWidth,
      9,
      1.5,
      1.5,
      "F"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.navy);
    pdf.text(title, MARGIN + 3, y + 2);

    y += 11;
  }

  function addRow(label: string, value: unknown) {
    const labelWidth = 48;
    const valueWidth = contentWidth - labelWidth - 5;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    const labelLines = pdf.splitTextToSize(
      label,
      labelWidth - 5
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    const valueLines = pdf.splitTextToSize(
      valueText(value),
      valueWidth
    );

    const lineCount = Math.max(
      labelLines.length,
      valueLines.length
    );
    const rowHeight = Math.max(8, lineCount * 3.7 + 4);

    ensureSpace(rowHeight);

    if (Math.floor(y / 8) % 2 === 0) {
      pdf.setFillColor(...COLORS.pale);
      pdf.rect(MARGIN, y - 2, contentWidth, rowHeight, "F");
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(labelLines, MARGIN + 2, y + 2.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...COLORS.text);
    pdf.text(valueLines, MARGIN + labelWidth, y + 2.5);

    pdf.setDrawColor(...COLORS.border);
    pdf.line(
      MARGIN,
      y + rowHeight - 2,
      pageWidth - MARGIN,
      y + rowHeight - 2
    );

    y += rowHeight;
  }

  // PAGE 1: Branded cover and student summary.
  pdf.setFillColor(...COLORS.navy);
  pdf.rect(0, 0, pageWidth, 8, "F");

  pdf.setFillColor(...COLORS.orange);
  pdf.rect(0, 8, pageWidth, 2, "F");

  if (logo) {
    try {
      // The wide logo is scaled to fit without filling the whole page.
      pdf.addImage(logo, "PNG", (pageWidth - 85) / 2, 22, 85, 57);
    } catch {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(24);
      pdf.setTextColor(...COLORS.navy);
      pdf.text("Knowletive", pageWidth / 2, 45, {
        align: "center",
      });
    }
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(...COLORS.navy);
    pdf.text("Knowletive", pageWidth / 2, 43, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(
      "Training Minds, Placing Talents",
      pageWidth / 2,
      51,
      { align: "center" }
    );
  }

  pdf.setDrawColor(...COLORS.orange);
  pdf.setLineWidth(1.2);
  pdf.line(32, 85, pageWidth - 32, 85);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.setTextColor(...COLORS.navy);
  pdf.text("MHT-CET COLLEGE", pageWidth / 2, 99, {
    align: "center",
  });
  pdf.text("PREDICTION REPORT", pageWidth / 2, 108, {
    align: "center",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(
    `Historical cutoff data | ${cutoffYear}`,
    pageWidth / 2,
    116,
    { align: "center" }
  );

  const summary = [
    ["STUDENT PERCENTILE", valueText(results.student_percentile)],
    ["CATEGORY", valueText(results.category)],
    ["PREFERRED BRANCH", valueText(results.branch)],
    ["CAP ROUND", valueText(results.cap_round)],
  ];

  const gap = 3;
  const cardWidth = (contentWidth - gap * 3) / 4;
  const cardY = 128;

  summary.forEach(([label, value], index) => {
    const x = MARGIN + index * (cardWidth + gap);

    pdf.setFillColor(...COLORS.pale);
    pdf.setDrawColor(...COLORS.border);
    pdf.roundedRect(x, cardY, cardWidth, 24, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.2);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(label, x + cardWidth / 2, cardY + 7, {
      align: "center",
      maxWidth: cardWidth - 3,
    });

    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.blue);
    pdf.text(
      pdf.splitTextToSize(value, cardWidth - 4),
      x + cardWidth / 2,
      cardY + 16,
      { align: "center" }
    );
  });

  y = 165;
  addSectionTitle("Report overview");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.text);

  const overview = pdf.splitTextToSize(
    `This report includes ${results.predictions.length} college prediction(s) based on the historical cutoff data available in the project. Review each college profile before finalising your preferences.`,
    contentWidth
  );

  pdf.text(overview, MARGIN + 2, y);
  y += overview.length * 5 + 7;

  addSectionTitle("Understanding the prediction");

  const guide = [
    ["More Chance", COLORS.green, "Historical cutoff is below your percentile."],
    ["Moderate", COLORS.amber, "Historical cutoff is relatively close to your percentile."],
    ["Low Chances", COLORS.red, "Historical cutoff is above your percentile."],
  ] as const;

  guide.forEach(([label, color, explanation]) => {
    pdf.setFillColor(...color);
    pdf.roundedRect(MARGIN + 2, y - 2, 32, 7, 1.5, 1.5, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.white);
    pdf.text(label, MARGIN + 18, y + 2.5, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.text);

    const lines = pdf.splitTextToSize(
      explanation,
      contentWidth - 42
    );

    pdf.text(lines, MARGIN + 39, y + 2.5);
    y += Math.max(10, lines.length * 4 + 3);
  });

  y += 2;
  addSectionTitle("Important information");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.text);

  const disclaimer = pdf.splitTextToSize(
    "These predictions are historical estimates, not admission guarantees. Actual allotment depends on the official CAP process, eligibility, seat availability, reservation rules, preferences and current-year cutoffs. Verify fees, accreditation, placement information and contact details with the respective college.",
    contentWidth
  );

  pdf.text(disclaimer, MARGIN + 2, y);

  // PAGE 2: College comparison table.
  pdf.addPage();
  addPageHeader("College comparison");
  addSectionTitle("College comparison at a glance");

  const columns = {
    number: MARGIN + 1,
    college: MARGIN + 10,
    prediction: MARGIN + 100,
    cutoff: MARGIN + 133,
    rank: MARGIN + 157,
  };

  function drawComparisonHeader() {
    pdf.setFillColor(...COLORS.navy);
    pdf.rect(MARGIN, y - 3, contentWidth, 9, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...COLORS.white);

    pdf.text("#", columns.number, y + 2.5);
    pdf.text("COLLEGE / CODE", columns.college, y + 2.5);
    pdf.text("PREDICTION", columns.prediction, y + 2.5);
    pdf.text("CUTOFF %", columns.cutoff, y + 2.5);
    pdf.text("CLOSING RANK", columns.rank, y + 2.5);

    y += 9;
  }

  drawComparisonHeader();

  results.predictions.forEach((item, index) => {
    const collegeLines = pdf.splitTextToSize(
      `${item.college_name}\nCode: ${item.institute_code}`,
      86
    );

    const rowHeight = Math.max(10, collegeLines.length * 3.7 + 3);
    ensureSpace(rowHeight + 2);

    if (y === 24) {
      drawComparisonHeader();
    }

    if (index % 2 === 0) {
      pdf.setFillColor(...COLORS.pale);
      pdf.rect(MARGIN, y - 2, contentWidth, rowHeight, "F");
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.text);
    pdf.text(String(index + 1), columns.number, y + 2);
    pdf.text(collegeLines, columns.college, y + 2);

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...getPredictionColor(item.prediction));
    pdf.text(item.prediction, columns.prediction, y + 2);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.text);
    pdf.text(
      Number(item.historical_cutoff_percentile).toFixed(2),
      columns.cutoff,
      y + 2
    );
    pdf.text(
      valueText(item.historical_closing_rank),
      columns.rank,
      y + 2
    );

    pdf.setDrawColor(...COLORS.border);
    pdf.line(
      MARGIN,
      y + rowHeight - 2,
      pageWidth - MARGIN,
      y + rowHeight - 2
    );

    y += rowHeight;
  });

  // Individual college profile pages.
  results.predictions.forEach((item, index) => {
    pdf.addPage();
    addPageHeader(`College profile ${index + 1}`);

    const badgeColor = getPredictionColor(item.prediction);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.navy);

    const titleLines = pdf.splitTextToSize(
      `${index + 1}. ${item.college_name}`,
      contentWidth - 47
    );

    pdf.text(titleLines, MARGIN, y + 2);

    pdf.setFillColor(...badgeColor);
    pdf.roundedRect(
      pageWidth - MARGIN - 43,
      y - 3,
      43,
      9,
      2,
      2,
      "F"
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.white);
    pdf.text(
      item.prediction,
      pageWidth - MARGIN - 21.5,
      y + 2.5,
      { align: "center" }
    );

    y += titleLines.length * 5 + 7;

    addSectionTitle("Prediction details");

    const predictionRows: [string, unknown][] = [
      ["Institute code", item.institute_code],
      ["College name", item.college_name],
      ["Preferred branch", item.branch_name],
      ["Student percentile", item.student_percentile],
      ["Category", item.category],
      ["CAP round", item.cap_round],
      [
        "Historical cutoff percentile",
        Number(item.historical_cutoff_percentile).toFixed(4),
      ],
      ["Historical closing rank", item.historical_closing_rank],
      ["Historical cutoff", item.historical_cutoff],
      ["Percentile difference", item.percentile_difference],
      ["Institute status", item.status],
      ["Level", item.level],
      ["Stage", item.stage],
      ["Prediction estimate", item.prediction],
    ];

    predictionRows.forEach(([label, value]) => addRow(label, value));

    addSectionTitle("Additional college information");

    const profile = profiles.get(String(item.institute_code));
    const details = profile?.details ?? {};
    const profileRows = Object.entries(details);

    if (profileRows.length === 0) {
      addRow(
        "College profile",
        "No additional details were returned by the college profile API."
      );
    } else {
      profileRows.forEach(([key, value]) => {
        addRow(formatLabel(key), value);
      });
    }

    const availableBranches = (profile?.branches ?? [])
      .map((branch) => branch.branch_name)
      .filter(Boolean);

    if (availableBranches.length > 0) {
      addRow("Branches available", availableBranches.join(", "));
    }
  });

  addFooter();

  const safeCategory = results.category.replace(
    /[^a-z0-9_-]+/gi,
    "-"
  );

  pdf.save(
    `Knowletive-College-Results-${safeCategory}-Round-${results.cap_round}.pdf`
  );
}