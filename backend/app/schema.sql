
CREATE TABLE IF NOT EXISTS colleges (
    id BIGSERIAL PRIMARY KEY,
    institute_code VARCHAR(20) NOT NULL UNIQUE,
    institute_name TEXT NOT NULL,
    master_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
    id BIGSERIAL PRIMARY KEY,
    branch_code VARCHAR(30) NOT NULL UNIQUE,
    branch_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS college_branches (
    id BIGSERIAL PRIMARY KEY,
    college_id BIGINT NOT NULL REFERENCES colleges(id),
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    UNIQUE (college_id, branch_id)
);

CREATE TABLE IF NOT EXISTS cap_cutoffs (
    id BIGSERIAL PRIMARY KEY,
    college_branch_id BIGINT NOT NULL
        REFERENCES college_branches(id),
    academic_year VARCHAR(9) NOT NULL,
    cap_round SMALLINT NOT NULL CHECK (cap_round BETWEEN 1 AND 4),
    level TEXT,
    stage TEXT,
    source_row_number INTEGER,
    source_file TEXT NOT NULL,
    UNIQUE (
        college_branch_id,
        academic_year,
        cap_round,
        level,
        stage,
        source_row_number
    )
);

CREATE TABLE IF NOT EXISTS cutoff_values (
    id BIGSERIAL PRIMARY KEY,
    cap_cutoff_id BIGINT NOT NULL
        REFERENCES cap_cutoffs(id) ON DELETE CASCADE,
    category_code VARCHAR(40) NOT NULL,
    closing_rank INTEGER,
    percentile NUMERIC(7,4),
    original_value TEXT,
    UNIQUE (cap_cutoff_id, category_code)
);

CREATE INDEX IF NOT EXISTS idx_colleges_name
    ON colleges (institute_name);

CREATE INDEX IF NOT EXISTS idx_cutoffs_year_round
    ON cap_cutoffs (academic_year, cap_round);

CREATE INDEX IF NOT EXISTS idx_cutoff_values_rank
    ON cutoff_values (closing_rank);

CREATE INDEX IF NOT EXISTS idx_cutoff_values_percentile
    ON cutoff_values (percentile);
