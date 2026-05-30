/**
 * Schema Validation Tests — Accounts, KYC, Fraud
 */

import {
  AccountSchema,
  AccountBalanceSchema,
  KycVerificationSchema,
  FraudAssessmentSchema,
} from "../../schemas/account.schema";

// ─── AccountSchema ────────────────────────────────────────────────────────────

describe("AccountSchema", () => {
  const validAccount = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    ownerId: "880e8400-e29b-41d4-a716-446655440003",
    type: "checking",
    status: "active",
    balance: 10000.0,
    currency: "USD",
    routingNumber: "021000021",
    accountNumber: "123456789012",
    createdAt: "2023-06-01T00:00:00.000Z",
    updatedAt: "2024-01-15T10:31:00.000Z",
  };

  it("accepts a valid account", () => {
    expect(AccountSchema.safeParse(validAccount).success).toBe(true);
  });

  it("rejects routing number with wrong length", () => {
    const result = AccountSchema.safeParse({ ...validAccount, routingNumber: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("9 digits");
    }
  });

  it("rejects routing number with non-digits", () => {
    const result = AccountSchema.safeParse({ ...validAccount, routingNumber: "02100002A" });
    expect(result.success).toBe(false);
  });

  it("rejects account number shorter than 8 digits", () => {
    const result = AccountSchema.safeParse({ ...validAccount, accountNumber: "1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects account number longer than 17 digits", () => {
    const result = AccountSchema.safeParse({ ...validAccount, accountNumber: "123456789012345678" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid account type", () => {
    const result = AccountSchema.safeParse({ ...validAccount, type: "investment" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid account status", () => {
    const result = AccountSchema.safeParse({ ...validAccount, status: "suspended" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid account types", () => {
    for (const type of ["checking", "savings", "credit"]) {
      const result = AccountSchema.safeParse({ ...validAccount, type });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid account statuses", () => {
    for (const status of ["active", "inactive", "frozen", "closed"]) {
      const result = AccountSchema.safeParse({ ...validAccount, status });
      expect(result.success).toBe(true);
    }
  });
});

// ─── AccountBalanceSchema ─────────────────────────────────────────────────────

describe("AccountBalanceSchema", () => {
  const validBalance = {
    accountId: "660e8400-e29b-41d4-a716-446655440001",
    available: 9750.0,
    pending: 250.0,
    currency: "USD",
    lastUpdated: "2024-01-15T10:31:00.000Z",
  };

  it("accepts a valid balance object", () => {
    expect(AccountBalanceSchema.safeParse(validBalance).success).toBe(true);
  });

  it("accepts zero available balance", () => {
    expect(AccountBalanceSchema.safeParse({ ...validBalance, available: 0 }).success).toBe(true);
  });

  it("accepts negative balance (overdraft scenario)", () => {
    // Overdrafts are valid in banking
    expect(AccountBalanceSchema.safeParse({ ...validBalance, available: -50 }).success).toBe(true);
  });

  it("rejects non-UUID accountId", () => {
    const result = AccountBalanceSchema.safeParse({ ...validBalance, accountId: "bad-id" });
    expect(result.success).toBe(false);
  });
});

// ─── KycVerificationSchema ────────────────────────────────────────────────────

describe("KycVerificationSchema", () => {
  const validKyc = {
    userId: "880e8400-e29b-41d4-a716-446655440003",
    status: "approved",
    level: 2,
    submittedAt: "2023-06-01T00:00:00.000Z",
    reviewedAt: "2023-06-02T00:00:00.000Z",
  };

  it("accepts a valid KYC record", () => {
    expect(KycVerificationSchema.safeParse(validKyc).success).toBe(true);
  });

  it("accepts KYC without optional dates (not_started status)", () => {
    const result = KycVerificationSchema.safeParse({
      userId: "880e8400-e29b-41d4-a716-446655440003",
      status: "not_started",
      level: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects level below 0", () => {
    const result = KycVerificationSchema.safeParse({ ...validKyc, level: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects level above 3", () => {
    const result = KycVerificationSchema.safeParse({ ...validKyc, level: 4 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid KYC status", () => {
    const result = KycVerificationSchema.safeParse({ ...validKyc, status: "verified" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid KYC statuses", () => {
    for (const status of ["not_started", "pending", "approved", "rejected"]) {
      const result = KycVerificationSchema.safeParse({ ...validKyc, status });
      expect(result.success).toBe(true);
    }
  });
});

// ─── FraudAssessmentSchema ────────────────────────────────────────────────────

describe("FraudAssessmentSchema", () => {
  const validAssessment = {
    paymentId: "550e8400-e29b-41d4-a716-446655440000",
    riskLevel: "low",
    riskScore: 15,
    flags: [],
    recommendation: "approve",
    assessedAt: "2024-01-15T10:30:00.000Z",
  };

  it("accepts a valid fraud assessment", () => {
    expect(FraudAssessmentSchema.safeParse(validAssessment).success).toBe(true);
  });

  it("accepts assessment with flags", () => {
    const result = FraudAssessmentSchema.safeParse({
      ...validAssessment,
      riskLevel: "high",
      riskScore: 85,
      flags: ["large_amount", "velocity_check", "new_device"],
      recommendation: "decline",
    });
    expect(result.success).toBe(true);
  });

  it("rejects riskScore below 0", () => {
    const result = FraudAssessmentSchema.safeParse({ ...validAssessment, riskScore: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects riskScore above 100", () => {
    const result = FraudAssessmentSchema.safeParse({ ...validAssessment, riskScore: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid risk level", () => {
    const result = FraudAssessmentSchema.safeParse({ ...validAssessment, riskLevel: "extreme" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid recommendation", () => {
    const result = FraudAssessmentSchema.safeParse({ ...validAssessment, recommendation: "hold" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid risk levels", () => {
    for (const riskLevel of ["low", "medium", "high", "critical"]) {
      const result = FraudAssessmentSchema.safeParse({ ...validAssessment, riskLevel });
      expect(result.success).toBe(true);
    }
  });
});
