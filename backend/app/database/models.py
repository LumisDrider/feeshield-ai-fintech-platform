"""PostgreSQL DDL shared conceptually with src/db/schema.ts (Drizzle owner)."""

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), retention_days integer NOT NULL DEFAULT 90,
 store_evidence boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 filename text NOT NULL, file_type text NOT NULL, file_size integer NOT NULL DEFAULT 0,
 upload_timestamp timestamptz NOT NULL DEFAULT now(), processing_status text NOT NULL DEFAULT 'uploaded',
 page_count integer, extraction_method text, pending_text text, error_message text
);
CREATE TABLE IF NOT EXISTS analyses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 contract_type text NOT NULL, extracted_terms jsonb NOT NULL, analysis_summary text NOT NULL,
 risk_results jsonb NOT NULL, calculation_results jsonb NOT NULL, full_result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS comparisons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 document_a_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 document_b_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
 comparison_results jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id, upload_timestamp DESC);
CREATE INDEX IF NOT EXISTS analyses_document_idx ON analyses(document_id);
CREATE INDEX IF NOT EXISTS comparisons_user_idx ON comparisons(user_id, created_at DESC);
"""
