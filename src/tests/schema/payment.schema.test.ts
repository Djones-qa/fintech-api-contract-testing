/**
 * Schema Validation Tests — Payments
 *
 * Validates that Zod schemas correctly accept valid payloads and
 * reject invalid ones with meaningful error messages.
 */

import {
  PaymentSchema,
  CreatePaymentRequestSchema,
  PaymentListResponseSchema,
  ApiErrorSchema,
} from "../../schemas/payment.schema";

// ─── PaymentSchema ────────────────────────────────────────────────────────────

describe("PaymentSchema", () => {
  const validPayment = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 250.0,
    currency: "USD",
    status: "completed",
    method: "bank_transfer",
    sourceAccountId: "660e8400-e29b-41d4-a716-446655440001",
    destinationAccountId: "770e8400-e29b-41d4-a716-446655440002",
    description: "Invoice payment",
    createdAt: "2024-01-15T10:30:00.000Z",
    updatedAt: "2024-01-15T10:31:00.000Z",
  };

  it("accepts a valid payment object", () => {
    const result = PaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  it("accepts a payment without optional description", () => {
    const { description: _d, ...noDesc } = validPayment;
    const result = PaymentSchema.safeParse(noDesc);
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID id", () => {
    const result = PaymentSchema.safeParse({ ...validPayment, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative amount", () => {
    const result = PaymentSchema.safeParse({ ...validPayment, amount: -100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("positive");
    }
  });

  it("rejects an invalid currency", () => {
    const result = PaymentSchema.safeParse({ ...validPayment, currency: "JPY" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = PaymentSchema.safeParse({ ...validPayment, status: "unknown" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid payment method", () => {
    const result = PaymentSchema.safeParse({ ...validPayment, method: "crypto" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-datetime createdAt", () => {
    const result = PaymentSchema.safeParse({ ...validPayment, createdAt: "2024-01-15" });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 255 characters", () => {
    const result = PaymentSchema.safeParse({
      ...validPayment,
      description: "x".repeat(256),
    });
    expect(result.success).toBe(false);
  });
});

// ─── CreatePaymentRequestSchema ───────────────────────────────────────────────

describe("CreatePaymentRequestSchema", () => {
  const validRequest = {
    amount: 500.0,
    currency: "EUR",
    method: "card",
    sourceAccountId: "660e8400-e29b-41d4-a716-446655440001",
    destinationAccountId: "770e8400-e29b-41d4-a716-446655440002",
  };

  it("accepts a valid create payment request", () => {
    const result = CreatePaymentRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("accepts optional metadata", () => {
    const result = CreatePaymentRequestSchema.safeParse({
      ...validRequest,
      metadata: { orderId: "order-123", customerId: "cust-456" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects amount of zero", () => {
    const result = CreatePaymentRequestSchema.safeParse({ ...validRequest, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects amount exceeding 1,000,000", () => {
    const result = CreatePaymentRequestSchema.safeParse({
      ...validRequest,
      amount: 1_000_001,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("maximum");
    }
  });

  it("rejects invalid sourceAccountId UUID", () => {
    const result = CreatePaymentRequestSchema.safeParse({
      ...validRequest,
      sourceAccountId: "bad-id",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Invalid source account ID");
    }
  });

  it("rejects missing required fields", () => {
    const result = CreatePaymentRequestSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

// ─── PaymentListResponseSchema ────────────────────────────────────────────────

describe("PaymentListResponseSchema", () => {
  it("accepts a valid paginated list response", () => {
    const result = PaymentListResponseSchema.safeParse({
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects pageSize greater than 100", () => {
    const result = PaymentListResponseSchema.safeParse({
      data: [],
      pagination: { page: 1, pageSize: 101, total: 0, totalPages: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative total", () => {
    const result = PaymentListResponseSchema.safeParse({
      data: [],
      pagination: { page: 1, pageSize: 20, total: -1, totalPages: 0 },
    });
    expect(result.success).toBe(false);
  });
});

// ─── ApiErrorSchema ───────────────────────────────────────────────────────────

describe("ApiErrorSchema", () => {
  it("accepts a valid API error", () => {
    const result = ApiErrorSchema.safeParse({
      code: "PAYMENT_NOT_FOUND",
      message: "Payment not found",
      requestId: "req_abc123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing code field", () => {
    const result = ApiErrorSchema.safeParse({
      message: "Something went wrong",
      requestId: "req_abc123",
    });
    expect(result.success).toBe(false);
  });
});
