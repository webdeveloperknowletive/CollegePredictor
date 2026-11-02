--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id bigint NOT NULL,
    branch_code character varying(30) NOT NULL,
    branch_name text NOT NULL
);


--
-- Name: branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.branches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.branches_id_seq OWNED BY public.branches.id;


--
-- Name: cap_cutoffs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cap_cutoffs (
    id bigint NOT NULL,
    college_branch_id bigint NOT NULL,
    academic_year character varying(9) NOT NULL,
    cap_round smallint NOT NULL,
    level text,
    stage text,
    source_row_number integer NOT NULL,
    source_file text NOT NULL,
    status text,
    CONSTRAINT cap_cutoffs_cap_round_check CHECK (((cap_round >= 1) AND (cap_round <= 4)))
);


--
-- Name: cap_cutoffs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cap_cutoffs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cap_cutoffs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cap_cutoffs_id_seq OWNED BY public.cap_cutoffs.id;


--
-- Name: college_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.college_branches (
    id bigint NOT NULL,
    college_id bigint NOT NULL,
    branch_id bigint NOT NULL
);


--
-- Name: college_branches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.college_branches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: college_branches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.college_branches_id_seq OWNED BY public.college_branches.id;


--
-- Name: colleges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colleges (
    id bigint NOT NULL,
    institute_code character varying(20) NOT NULL,
    institute_name text NOT NULL,
    master_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: colleges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.colleges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: colleges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.colleges_id_seq OWNED BY public.colleges.id;


--
-- Name: cutoff_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cutoff_values (
    id bigint NOT NULL,
    cap_cutoff_id bigint NOT NULL,
    category_code character varying(40) NOT NULL,
    closing_rank integer,
    percentile numeric(7,4),
    original_value text
);


--
-- Name: cutoff_values_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cutoff_values_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cutoff_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cutoff_values_id_seq OWNED BY public.cutoff_values.id;


--
-- Name: branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches ALTER COLUMN id SET DEFAULT nextval('public.branches_id_seq'::regclass);


--
-- Name: cap_cutoffs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cap_cutoffs ALTER COLUMN id SET DEFAULT nextval('public.cap_cutoffs_id_seq'::regclass);


--
-- Name: college_branches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_branches ALTER COLUMN id SET DEFAULT nextval('public.college_branches_id_seq'::regclass);


--
-- Name: colleges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges ALTER COLUMN id SET DEFAULT nextval('public.colleges_id_seq'::regclass);


--
-- Name: cutoff_values id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cutoff_values ALTER COLUMN id SET DEFAULT nextval('public.cutoff_values_id_seq'::regclass);


--
-- Name: branches branches_branch_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_branch_code_key UNIQUE (branch_code);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: cap_cutoffs cap_cutoffs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cap_cutoffs
    ADD CONSTRAINT cap_cutoffs_pkey PRIMARY KEY (id);


--
-- Name: cap_cutoffs cap_cutoffs_source_file_source_row_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cap_cutoffs
    ADD CONSTRAINT cap_cutoffs_source_file_source_row_number_key UNIQUE (source_file, source_row_number);


--
-- Name: college_branches college_branches_college_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_branches
    ADD CONSTRAINT college_branches_college_id_branch_id_key UNIQUE (college_id, branch_id);


--
-- Name: college_branches college_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_branches
    ADD CONSTRAINT college_branches_pkey PRIMARY KEY (id);


--
-- Name: colleges colleges_institute_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_institute_code_key UNIQUE (institute_code);


--
-- Name: colleges colleges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_pkey PRIMARY KEY (id);


--
-- Name: cutoff_values cutoff_values_cap_cutoff_id_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cutoff_values
    ADD CONSTRAINT cutoff_values_cap_cutoff_id_category_code_key UNIQUE (cap_cutoff_id, category_code);


--
-- Name: cutoff_values cutoff_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cutoff_values
    ADD CONSTRAINT cutoff_values_pkey PRIMARY KEY (id);


--
-- Name: idx_colleges_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_colleges_name ON public.colleges USING btree (institute_name);


--
-- Name: idx_cutoff_values_percentile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cutoff_values_percentile ON public.cutoff_values USING btree (percentile);


--
-- Name: idx_cutoff_values_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cutoff_values_rank ON public.cutoff_values USING btree (closing_rank);


--
-- Name: idx_cutoffs_year_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cutoffs_year_round ON public.cap_cutoffs USING btree (academic_year, cap_round);


--
-- Name: cap_cutoffs cap_cutoffs_college_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cap_cutoffs
    ADD CONSTRAINT cap_cutoffs_college_branch_id_fkey FOREIGN KEY (college_branch_id) REFERENCES public.college_branches(id);


--
-- Name: college_branches college_branches_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_branches
    ADD CONSTRAINT college_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: college_branches college_branches_college_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.college_branches
    ADD CONSTRAINT college_branches_college_id_fkey FOREIGN KEY (college_id) REFERENCES public.colleges(id);


--
-- Name: cutoff_values cutoff_values_cap_cutoff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cutoff_values
    ADD CONSTRAINT cutoff_values_cap_cutoff_id_fkey FOREIGN KEY (cap_cutoff_id) REFERENCES public.cap_cutoffs(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

