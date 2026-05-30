import { z } from "zod";

// ─── Enum Schemas ─────────────────────────────────────────────────────────────

export const PaymentStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export const PaymentMethodSchema = z.enum([
  "card",
  "bank_transfer",
  "wallet",
]);

export const CurrencySchema = z.enum(["USD", "EUR", "GBP", "CAD"]);

// ─── Payment Schemas ──────────────────────────────────────────────────────────

export const PaymentSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().positive("Amount must be positive"),
  currency: CurrencySchema,
  status: PaymentStatusSchema,
  method: PaymentMethodSchema,
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  description: z.string().max(255).optional(),
  metadata: z.record(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreatePaymentRequestSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1_000_000, "Amount exceeds maximum transfer limit"),
  currency: CurrencySchema,
  method: PaymentMethodSchema,
  sourceAccountId: z.string().uuid("Invalid source account ID"),
  destinationAccountId: z.string().uuid("Invalid destination account ID"),
  description: z.string().max(255).optional(),
  metadata: z.record(z.string()).optional(),
});

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const PaymentListResponseSchema = z.object({
  data: z.array(PaymentSchema),
  pagination: PaginationSchema,
});

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  requestId: z.string(),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type PaymentSchemaType = z.infer<typeof PaymentSchema>;
export type CreatePaymentRequestSchemaType = z.infer<typeof CreatePaymentRequestSchema>;
export type PaymentListResponseSchemaType = z.infer<typeof PaymentListResponseSchema>;
