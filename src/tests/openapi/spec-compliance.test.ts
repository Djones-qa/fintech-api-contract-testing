/**
 * OpenAPI Spec Compliance Tests
 *
 * Validates that both service OpenAPI specs are valid, well-formed,
 * and that actual API responses conform to the declared schemas.
 */

import path from "path";
import request from "supertest";
import { app as paymentsApp, seedPayments, payments } from "../../services/payments-service/app";
import { app as accountsApp, seedAccounts, accounts } from "../../services/accounts-service/app";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SwaggerParser = require("swagger-parser") as {
  validate(path: string): Promise<{ info: { title: string; version: string } }>;
  dereference(path: string): Promise<unknown>;
};

const PAYMENTS_SPEC = path.resolve(process.cwd(), "openapi", "payments-service.yaml");
const ACCOUNTS_SPEC = path.resolve(process.cwd(), "openapi", "accounts-service.yaml");

// ─── Spec Validity ────────────────────────────────────────────────────────────

describe("OpenAPI spec validity", () => {
  it("payments-service.yaml is a valid OpenAPI 3.0 document", async () => {
    const api = await SwaggerParser.validate(PAYMENTS_SPEC);
    expect(api.info.title).toBe("Payments Service API");
    expect(api.info.version).toBeDefined();
  });

  it("accounts-service.yaml is a valid OpenAPI 3.0 document", async () => {
    const api = await SwaggerParser.validate(ACCOUNTS_SPEC);
    expect(api.info.title).toBe("Accounts Service API");
    expect(api.info.version).toBeDefined();
  });

  it("payments spec has no unresolved $ref pointers", async () => {
    const api = await SwaggerParser.dereference(PAYMENTS_SPEC);
    expect(api).toBeDefined();
  });

  it("accounts spec has no unresolved $ref pointers", async () => {
    const api = await SwaggerParser.dereference(ACCOUNTS_SPEC);
    expect(api).toBeDefined();
  });
});

// ─── Payments Service Response Compliance ────────────────────────────────────

describe("Payments Service response compliance with OpenAPI spec", () => {
  beforeEach(() => {
    payments.clear();
    seedPayments();
  });

  it("GET /health response matches spec shape", async () => {
    const res = await request(paymentsApp).get("/health");
    expect(res.status).toBe(200);
    // Spec requires: { status: string, service: string }
    expect(typeof res.body.status).toBe("string");
    expect(typeof res.body.service).toBe("string");
  });

  it("GET /payments response matches PaymentListResponse schema", async () => {
    const res = await request(paymentsApp).get("/payments");
    expect(res.status).toBe(200);

    // Spec requires: { data: Payment[], pagination: Pagination }
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(typeof res.body.pagination).toBe("object");
    expect(typeof res.body.pagination.page).toBe("number");
    expect(typeof res.body.pagination.pageSize).toBe("number");
    expect(typeof res.body.pagination.total).toBe("number");
    expect(typeof res.body.pagination.totalPages).toBe("number");
  });

  it("GET /payments/:id response matches Payment schema", async () => {
    const res = await request(paymentsApp)
      .get("/payments/550e8400-e29b-41d4-a716-446655440000");
    expect(res.status).toBe(200);

    // Spec required fields
    const requiredFields = [
      "id", "amount", "currency", "status", "method",
      "sourceAccountId", "destinationAccountId", "createdAt", "updatedAt",
    ];
    for (const field of requiredFields) {
      expect(res.body[field]).toBeDefined();
    }

    // Spec enum constraints
    expect(["USD", "EUR", "GBP", "CAD"]).toContain(res.body.currency);
    expect(["pending", "processing", "completed", "failed", "cancelled"]).toContain(res.body.status);
    expect(["card", "bank_transfer", "wallet"]).toContain(res.body.method);
  });

  it("GET /payments/:id 404 response matches ApiError schema", async () => {
    const res = await request(paymentsApp)
      .get("/payments/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);

    // Spec required fields for ApiError
    expect(typeof res.body.code).toBe("string");
    expect(typeof res.body.message).toBe("string");
    expect(typeof res.body.requestId).toBe("string");
  });

  it("POST /payments 201 response matches Payment schema", async () => {
    const res = await request(paymentsApp)
      .post("/payments")
      .send({
        amount: 100,
        currency: "USD",
        method: "card",
        sourceAccountId: "660e8400-e29b-41d4-a716-446655440001",
        destinationAccountId: "770e8400-e29b-41d4-a716-446655440002",
      })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe("string");
    expect(res.body.status).toBe("pending");
    expect(res.body.amount).toBe(100);
  });

  it("POST /payments 422 response matches ApiError schema", async () => {
    const res = await request(paymentsApp)
      .post("/payments")
      .send({ amount: -1 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(422);
    expect(typeof res.body.code).toBe("string");
    expect(typeof res.body.message).toBe("string");
    expect(typeof res.body.requestId).toBe("string");
  });

  it("PATCH /payments/:id/cancel 409 response matches ApiError schema", async () => {
    const res = await request(paymentsApp)
      .patch("/payments/550e8400-e29b-41d4-a716-446655440000/cancel");

    expect(res.status).toBe(409);
    expect(typeof res.body.code).toBe("string");
    expect(typeof res.body.message).toBe("string");
  });
});

// ─── Accounts Service Response Compliance ────────────────────────────────────

describe("Accounts Service response compliance with OpenAPI spec", () => {
  beforeEach(() => {
    accounts.clear();
    seedAccounts();
  });

  it("GET /accounts/:id response matches Account schema", async () => {
    const res = await request(accountsApp)
      .get("/accounts/660e8400-e29b-41d4-a716-446655440001");
    expect(res.status).toBe(200);

    const requiredFields = [
      "id", "ownerId", "type", "status", "balance",
      "currency", "routingNumber", "accountNumber", "createdAt", "updatedAt",
    ];
    for (const field of requiredFields) {
      expect(res.body[field]).toBeDefined();
    }

    // Spec enum constraints
    expect(["checking", "savings", "credit"]).toContain(res.body.type);
    expect(["active", "inactive", "frozen", "closed"]).toContain(res.body.status);
    expect(res.body.routingNumber).toMatch(/^\d{9}$/);
    expect(res.body.accountNumber).toMatch(/^\d{8,17}$/);
  });

  it("GET /accounts/:id/balance response matches AccountBalance schema", async () => {
    const res = await request(accountsApp)
      .get("/accounts/660e8400-e29b-41d4-a716-446655440001/balance");
    expect(res.status).toBe(200);

    expect(typeof res.body.accountId).toBe("string");
    expect(typeof res.body.available).toBe("number");
    expect(typeof res.body.pending).toBe("number");
    expect(["USD", "EUR", "GBP", "CAD"]).toContain(res.body.currency);
    expect(typeof res.body.lastUpdated).toBe("string");
  });

  it("GET /users/:userId/kyc response matches KycVerification schema", async () => {
    const res = await request(accountsApp).get("/users/user-001/kyc");
    expect(res.status).toBe(200);

    expect(typeof res.body.userId).toBe("string");
    expect(["not_started", "pending", "approved", "rejected"]).toContain(res.body.status);
    expect(typeof res.body.level).toBe("number");
    expect(res.body.level).toBeGreaterThanOrEqual(0);
    expect(res.body.level).toBeLessThanOrEqual(3);
  });

  it("POST /fraud/assess response matches FraudAssessment schema", async () => {
    const res = await request(accountsApp)
      .post("/fraud/assess")
      .send({ paymentId: "pay-001", amount: 500 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(["low", "medium", "high", "critical"]).toContain(res.body.riskLevel);
    expect(res.body.riskScore).toBeGreaterThanOrEqual(0);
    expect(res.body.riskScore).toBeLessThanOrEqual(100);
    expect(["approve", "review", "decline"]).toContain(res.body.recommendation);
    expect(Array.isArray(res.body.flags)).toBe(true);
  });
});
