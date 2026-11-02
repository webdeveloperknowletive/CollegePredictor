CREATE TABLE IF NOT EXISTS all_india.ai_colleges (
    id BIGSERIAL PRIMARY KEY,
    institute_code VARCHAR(30) UNIQUE NOT NULL,
    institute_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS all_india.ai_branches (
    id BIGSERIAL PRIMARY KEY,
    choice_code VARCHAR(40) UNIQUE NOT NULL,
    course_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS all_india.ai_cutoffs (
    id BIGSERIAL PRIMARY KEY,
    academic_year VARCHAR(10) NOT NULL,
    cap_round SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
    college_id BIGINT REFERENCES all_india.ai_colleges(id),
    branch_id BIGINT REFERENCES all_india.ai_branches(id),
    all_india_merit_rank INTEGER,
    percentile NUMERIC(12,8),
    merit_exam TEXT,
    allotment_type TEXT,
    seat_type TEXT,
    source_row_number INTEGER,
    source_file TEXT NOT NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS all_india.ai_import_batches (
    id BIGSERIAL PRIMARY KEY,
    academic_year VARCHAR(10) NOT NULL,
    cap_round SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
    source_file TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0,
    rejected_rows INTEGER NOT NULL DEFAULT 0,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS all_india.ai_data_quality_issues (
    id BIGSERIAL PRIMARY KEY,
    cap_round SMALLINT NOT NULL,
    source_row_number INTEGER,
    issue_type TEXT NOT NULL,
    issue_description TEXT,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_cutoffs_year_round
ON all_india.ai_cutoffs (academic_year, cap_round);

CREATE INDEX IF NOT EXISTS idx_ai_cutoffs_rank
ON all_india.ai_cutoffs (all_india_merit_rank);

CREATE INDEX IF NOT EXISTS idx_ai_cutoffs_percentile
ON all_india.ai_cutoffs (percentile);

CREATE INDEX IF NOT EXISTS idx_ai_cutoffs_college_branch
ON all_india.ai_cutoffs (college_id, branch_id);