// ─── Payment Types ────────────────────────────────────────────────────────────

export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type PaymentMethod = "card" | "bank_transfer" | "wallet";

export type Currency = "USD" | "EUR" | "GBP" | "CAD";

export interface Payment {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethod;
  sourceAccountId: string;
  destinationAccountId: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  sourceAccountId: string;
  destinationAccountId: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentListResponse {
  data: Payment[];
  pagination: Pagination;
}

// ─── Account Types ────────────────────────────────────────────────────────────

export type AccountType = "checking" | "savings" | "credit";

export type AccountStatus = "active" | "inactive" | "frozen" | "closed";

export interface Account {
  id: string;
  ownerId: string;
  type: AccountType;
  status: AccountStatus;
  balance: number;
  currency: Currency;
  routingNumber: string;
  accountNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBalance {
  accountId: string;
  available: number;
  pending: number;
  currency: Currency;
  lastUpdated: string;
}

// ─── KYC Types ────────────────────────────────────────────────────────────────

export type KycStatus = "not_started" | "pending" | "approved" | "rejected";

export interface KycVerification {
  userId: string;
  status: KycStatus;
  level: number;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// ─── Fraud Types ──────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface FraudAssessment {
  paymentId: string;
  riskLevel: RiskLevel;
  riskScore: number;
  flags: string[];
  recommendation: "approve" | "review" | "decline";
  assessedAt: string;
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}
