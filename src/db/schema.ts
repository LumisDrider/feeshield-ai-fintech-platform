import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AnalysisResult, ComparisonResult } from "@/lib/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  retentionDays: integer("retention_days").notNull().default(90),
  storeEvidence: boolean("store_evidence").notNull().default(true),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  uploadTimestamp: timestamp("upload_timestamp", { withTimezone: true }).notNull().defaultNow(),
  processingStatus: text("processing_status").notNull().default("uploaded"),
  pageCount: integer("page_count"),
  extractionMethod: text("extraction_method"),
  pendingText: text("pending_text"),
  errorMessage: text("error_message"),
});

export const analyses = pgTable("analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  contractType: text("contract_type").notNull(),
  extractedTerms: jsonb("extracted_terms").notNull(),
  analysisSummary: text("analysis_summary").notNull(),
  riskResults: jsonb("risk_results").notNull(),
  calculationResults: jsonb("calculation_results").notNull(),
  fullResult: jsonb("full_result").$type<AnalysisResult>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comparisons = pgTable("comparisons", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentAId: uuid("document_a_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  documentBId: uuid("document_b_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  comparisonResults: jsonb("comparison_results").$type<ComparisonResult>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type AnalysisRow = typeof analyses.$inferSelect;
