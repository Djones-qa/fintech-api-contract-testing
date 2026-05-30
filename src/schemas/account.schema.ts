import { z } from "zod";
import { CurrencySchema } from "./payment.schema";

// ─── Enum Schemas ─────────────────────────────────────────────────────────────

export const AccountTypeSchema = z.enum([
  "checking",
  "savings",
  "credit",
]);

export const AccountStatusSchema = z.enum([
  "active",
  "inactive",
  "frozen",
  "closed",
]);

// ─── Account Schemas ──────────────────────────────────────────────────────────

export const AccountSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  type: AccountTypeSchema,
  status: AccountStatusSchema,
  balance: z.number(),
  currency: CurrencySchema,
  routingNumber: z.string().regex(/^\d{9}$/, "Routing number must be 9 digits"),
  accountNumber: z
    .string()
    .regex(/^\d{8,17}$/, "Account number must be 8-17 digits"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AccountBalanceSchema = z.object({
  accountId: z.string().uuid(),
  available: z.number(),
  pending: z.number(),
  currency: CurrencySchema,
  lastUpdated: z.string().datetime(),
});

// ─── KYC Schemas ──────────────────────────────────────────────────────────────

export const KycStatusSchema = z.enum([
  "not_started",
  "pending",
  "approved",
  "rejected",
]);

export const KycVerificationSchema = z.object({
  userId: z.string().uuid(),
  status: KycStatusSchema,
  level: z.number().int().min(0).max(3),
  submittedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
});

// ─── Fraud Schemas ────────────────────────────────────────────────────────────

export const RiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const FraudAssessmentSchema = z.object({
  paymentId: z.string().uuid(),
  riskLevel: RiskLevelSchema,
  riskScore: z.number().min(0).max(100),
  flags: z.array(z.string()),
  recommendation: z.enum(["approve", "review", "decline"]),
  assessedAt: z.string().datetime(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type AccountSchemaType = z.infer<typeof AccountSchema>;
export type AccountBalanceSchemaType = z.infer<typeof AccountBalanceSchema>;
export type KycVerificationSchemaType = z.infer<typeof KycVerificationSchema>;
export type FraudAssessmentSchemaType = z.infer<typeof FraudAssessmentSchema>;
