import express, { Request, Response, NextFunction } from "express";
import { Account, AccountBalance, KycVerification, FraudAssessment } from "../../types";

const app = express();
app.use(express.json());

// ─── In-memory store ──────────────────────────────────────────────────────────

const accounts: Map<string, Account> = new Map();
const kycRecords: Map<string, KycVerification> = new Map();
const fraudAssessments: Map<string, FraudAssessment> = new Map();

function seedAccounts(): void {
  const acc1: Account = {
    id: "660e8400-e29b-41d4-a716-446655440001",
    ownerId: "user-001",
    type: "checking",
    status: "active",
    balance: 10000.0,
    currency: "USD",
    routingNumber: "021000021",
    accountNumber: "123456789012",
    createdAt: "2023-06-01T00:00:00.000Z",
    updatedAt: "2024-01-15T10:31:00.000Z",
  };
  const acc2: Account = {
    id: "770e8400-e29b-41d4-a716-446655440002",
    ownerId: "user-002",
    type: "savings",
    status: "active",
    balance: 25000.0,
    currency: "USD",
    routingNumber: "021000021",
    accountNumber: "987654321098",
    createdAt: "2023-07-15T00:00:00.000Z",
    updatedAt: "2024-01-15T10:31:00.000Z",
  };
  accounts.set(acc1.id, acc1);
  accounts.set(acc2.id, acc2);

  kycRecords.set("user-001", {
    userId: "user-001",
    status: "approved",
    level: 2,
    submittedAt: "2023-06-01T00:00:00.000Z",
    reviewedAt: "2023-06-02T00:00:00.000Z",
  });
}

seedAccounts();

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "accounts-service" });
});

app.get("/accounts/:id", (req: Request, res: Response) => {
  const account = accounts.get(req.params["id"] ?? "");
  if (!account) {
    return res.status(404).json({
      code: "ACCOUNT_NOT_FOUND",
      message: `Account ${req.params["id"]} not found`,
      requestId: `req_${Date.now()}`,
    });
  }
  return res.json(account);
});

app.get("/accounts/:id/balance", (req: Request, res: Response) => {
  const account = accounts.get(req.params["id"] ?? "");
  if (!account) {
    return res.status(404).json({
      code: "ACCOUNT_NOT_FOUND",
      message: `Account ${req.params["id"]} not found`,
      requestId: `req_${Date.now()}`,
    });
  }
  const balance: AccountBalance = {
    accountId: account.id,
    available: account.balance,
    pending: 0,
    currency: account.currency,
    lastUpdated: new Date().toISOString(),
  };
  return res.json(balance);
});

app.get("/users/:userId/kyc", (req: Request, res: Response) => {
  const kyc = kycRecords.get(req.params["userId"] ?? "");
  if (!kyc) {
    return res.status(404).json({
      code: "KYC_NOT_FOUND",
      message: `KYC record for user ${req.params["userId"]} not found`,
      requestId: `req_${Date.now()}`,
    });
  }
  return res.json(kyc);
});

app.post("/fraud/assess", (req: Request, res: Response) => {
  const { paymentId, amount } = req.body as { paymentId: string; amount: number };
  if (!paymentId || amount === undefined) {
    return res.status(422).json({
      code: "VALIDATION_ERROR",
      message: "paymentId and amount are required",
      requestId: `req_${Date.now()}`,
    });
  }

  const riskScore = amount > 10000 ? 75 : amount > 5000 ? 45 : 15;
  const riskLevel =
    riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

  const assessment: FraudAssessment = {
    paymentId,
    riskLevel: riskLevel as FraudAssessment["riskLevel"],
    riskScore,
    flags: riskScore >= 70 ? ["large_amount", "velocity_check"] : [],
    recommendation: riskScore >= 70 ? "review" : "approve",
    assessedAt: new Date().toISOString(),
  };

  fraudAssessments.set(paymentId, assessment);
  return res.status(201).json(assessment);
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    requestId: `req_${Date.now()}`,
  });
});

export { app, accounts, kycRecords, fraudAssessments, seedAccounts };
