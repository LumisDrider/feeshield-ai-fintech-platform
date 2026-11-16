export const CATEGORIES = [
  "Interest",
  "Maintenance Fee",
  "Processing Fee",
  "Administrative Fee",
  "Insurance",
  "Late Payment Penalty",
  "Early Repayment Penalty",
  "Transaction Commission",
  "Variable Interest Condition",
  "Repayment Condition",
  "Other Financial Charge",
  "Unclear or Ambiguous Clause",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type Recurrence = "one-time" | "monthly" | "annual" | "per-transaction" | "conditional" | "unknown";
export type EvidenceType = "explicit" | "inferred" | "missing";

export interface FinancialTerm {
  id: string;
  category: Category;
  label: string;
  value: number | null;
  displayValue: string;
  unit: "percent" | "currency" | "months" | "days" | "text" | null;
  currency: string | null;
  recurrence: Recurrence;
  quote: string;
  page: number | null;
  confidence: number;
  explanation: string;
  evidenceType: EvidenceType;
}

export interface GeneralTerms {
  institution: string | null;
  contractType: string;
  currency: string | null;
  principal: number | null;
  durationMonths: number | null;
  repaymentFrequency: string | null;
  annualInterestRate: number | null;
  monthlyInterestRate: number | null;
  interestRateType: "fixed" | "variable" | "unknown";
  effectiveAnnualRate: number | null;
}

export interface RiskItem {
  id: string;
  termId: string | null;
  category: Category;
  level: RiskLevel;
  title: string;
  quote: string;
  page: number | null;
  explanation: string;
  whyItMatters: string;
  suggestedQuestion: string;
  rule: string;
}

export interface CostResults {
  status: "complete" | "partial" | "unavailable";
  principal: number | null;
  monthlyPayment: number | null;
  estimatedInterest: number | null;
  recurringCharges: number | null;
  oneTimeFees: number | null;
  insuranceCost: number | null;
  totalEstimatedRepayment: number | null;
  additionalCost: number | null;
  cashFlowAnnualisedRate: number | null;
  currency: string | null;
  durationMonths: number | null;
  assumptions: string[];
  missing: string[];
  schedule: Array<{ month: number; payment: number; interest: number; principal: number; balance: number }>;
}

export interface AnalysisResult {
  engineVersion: string;
  analysisMode: "rule-based" | "ai-assisted";
  modeNotice: string;
  general: GeneralTerms;
  terms: FinancialTerm[];
  risks: RiskItem[];
  costs: CostResults;
  missingInformation: string[];
  summary: string;
  recommendations: string[];
  statistics: { clauseCount: number; feeCount: number; riskCount: number; explicitCount: number; inferredCount: number };
}

export interface DocumentRecord {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadTimestamp: string;
  processingStatus: string;
  pageCount: number | null;
  extractionMethod: string | null;
}

export interface AnalysisRecord {
  id: string;
  documentId: string;
  contractType: string;
  analysisSummary: string;
  result: AnalysisResult;
  createdAt: string;
  document?: DocumentRecord;
}

export interface ComparisonResult {
  contractA: { analysisId: string; filename: string; label: string };
  contractB: { analysisId: string; filename: string; label: string };
  metrics: Array<{
    key: string;
    label: string;
    a: number | string | null;
    b: number | string | null;
    format: "currency" | "percent" | "number" | "text";
    lowerIsLessCost: boolean;
    difference: number | null;
  }>;
  normalisation: { applied: boolean; note: string; monthlyCostA: number | null; monthlyCostB: number | null };
  summary: string;
  caveats: string[];
}
