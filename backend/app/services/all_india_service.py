
from sqlalchemy import text

from app.database import engine


# Map user-facing exam selections to actual source labels.
EXAM_MAPPING = {
    "JEE": ["JEE", "JEE(Main)-2025"],
    "MHT-CET": ["MHT-CET", "MHT-CET-PCM 2025"],
}


# Only genuine All India open-quota records are used.
# Minority and Maharashtra quota records are excluded.
ALL_INDIA_CUTOFF_QUERY = """
    SELECT
        c.institute_code,
        c.institute_name,
        c.city,
        b.choice_code,
        b.course_name,
        ac.academic_year,
        ac.cap_round,
        ac.all_india_merit_rank,
        ac.percentile,
        ac.merit_exam,
        ac.allotment_type,
        ac.seat_type,
        ac.source_file
    FROM all_india.ai_cutoffs ac
    INNER JOIN all_india.ai_colleges c
        ON c.id = ac.college_id
    INNER JOIN all_india.ai_branches b
        ON b.id = ac.branch_id
    WHERE ac.academic_year = :academic_year
      AND ac.allotment_type = 'AI to AI'
      AND ac.seat_type LIKE 'AI%'
      AND ac.all_india_merit_rank IS NOT NULL
      AND ac.percentile IS NOT NULL
      AND ac.merit_exam = ANY(:exam_labels)
"""


def get_all_india_filter_options(
    academic_year: str = "2025",
):
    """
    Return available cities and departments for All India filters.

    Departments are collected from All India cutoff records
    across all four CAP rounds.
    """

    cities_query = text("""
        SELECT DISTINCT TRIM(city) AS city
        FROM all_india.ai_colleges
        WHERE city IS NOT NULL
          AND TRIM(city) <> ''
        ORDER BY city
    """)

    departments_query = text("""
        SELECT DISTINCT TRIM(b.course_name) AS department
        FROM all_india.ai_branches b
        INNER JOIN all_india.ai_cutoffs ac
            ON ac.branch_id = b.id
        WHERE ac.academic_year = :academic_year
          AND ac.allotment_type = 'AI to AI'
          AND ac.seat_type LIKE 'AI%'
          AND b.course_name IS NOT NULL
          AND TRIM(b.course_name) <> ''
        ORDER BY department
    """)

    with engine.connect() as connection:
        cities = connection.execute(
            cities_query
        ).scalars().all()

        departments = connection.execute(
            departments_query,
            {"academic_year": academic_year},
        ).scalars().all()

    return {
        "cities": cities,
        "departments": departments,
    }


def get_historical_cutoffs(
    exam: str = "JEE",
    academic_year: str = "2025",
    cap_round: int | None = None,
    branch: str | None = None,
    city: str | None = None,
    student_percentile: float | None = None,
    limit: int = 500,
):
    """
    Retrieve historical All India open-quota cutoffs.

    Supports JEE and MHT-CET exam groups.

    City and department filters use exact dropdown selections.

    This is a historical comparison, not an admission guarantee.
    """

    if not exam or not exam.strip():
        raise ValueError("Exam type is required.")

    exam_key = exam.strip().upper()

    if exam_key not in EXAM_MAPPING:
        raise ValueError("Supported exams are JEE and MHT-CET.")

    if cap_round is not None and cap_round not in (1, 2, 3, 4):
        raise ValueError("CAP round must be between 1 and 4.")

    if student_percentile is not None:
        if not 0 <= student_percentile <= 100:
            raise ValueError("Percentile must be between 0 and 100.")

    if not 1 <= limit <= 2000:
        raise ValueError("Limit must be between 1 and 2000.")

    query = ALL_INDIA_CUTOFF_QUERY

    params = {
        "academic_year": academic_year,
        "exam_labels": EXAM_MAPPING[exam_key],
        "limit": limit,
    }

    if cap_round is not None:
        query += " AND ac.cap_round = :cap_round"
        params["cap_round"] = cap_round

    if branch and branch.strip():
        query += " AND b.course_name = :branch"
        params["branch"] = branch.strip()

    if city and city.strip():
        query += " AND c.city = :city"
        params["city"] = city.strip()

    query += """
        ORDER BY
            ac.percentile DESC,
            ac.all_india_merit_rank ASC
        LIMIT :limit
    """

    with engine.connect() as connection:
        rows = connection.execute(
            text(query),
            params,
        ).mappings().all()

    results = []

    for row in rows:
        item = dict(row)

        if student_percentile is not None:
            cutoff = float(item["percentile"])
            gap = round(student_percentile - cutoff, 8)

            item["student_percentile"] = student_percentile
            item["percentile_difference"] = gap

            item["historical_comparison"] = (
                "AT_OR_ABOVE_HISTORICAL_CUTOFF"
                if gap >= 0
                else "BELOW_HISTORICAL_CUTOFF"
            )

        results.append(item)

    return {
        "academic_year": academic_year,
        "exam": exam_key,
        "matched_exam_labels": EXAM_MAPPING[exam_key],
        "cap_round": cap_round,
        "branch": branch,
        "city": city,
        "student_percentile": student_percentile,
        "total_results": len(results),
        "results": results,
        "disclaimer": (
            "Historical cutoff comparison only. "
            "It does not guarantee admission."
        ),
    }


def get_all_india_summary(academic_year: str = "2025"):
    """Return record counts by CAP round and merit exam."""

    query = text("""
        SELECT
            cap_round,
            merit_exam,
            COUNT(*) AS total_records,
            COUNT(DISTINCT college_id) AS colleges,
            COUNT(DISTINCT branch_id) AS courses
        FROM all_india.ai_cutoffs
        WHERE academic_year = :academic_year
          AND allotment_type = 'AI to AI'
          AND seat_type LIKE 'AI%'
        GROUP BY cap_round, merit_exam
        ORDER BY cap_round, merit_exam
    """)

    with engine.connect() as connection:
        rows = connection.execute(
            query,
            {"academic_year": academic_year},
        ).mappings().all()

    return {
        "academic_year": academic_year,
        "summary": [dict(row) for row in rows],
    }
