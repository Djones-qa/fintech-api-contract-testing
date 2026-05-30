/**
 * Integration Tests — Accounts Service
 *
 * HTTP-level tests using Supertest against the real Express app.
 */

import request from "supertest";
import { app, accounts, kycRecords, seedAccounts } from "../../services/accounts-service/app";

beforeEach(() => {
  accounts.clear();
  kycRecords.clear();
  seedAccounts();
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with service status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("accounts-service");
  });
});

// ─── GET /accounts/:id ────────────────────────────────────────────────────────

describe("GET /accounts/:id", () => {
  it("returns account details for a valid ID", async () => {
    const res = await request(app)
      .get("/accounts/660e8400-e29b-41d4-a716-446655440001");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("660e8400-e29b-41d4-a716-446655440001");
    expect(res.body.type).toBe("checking");
    expect(res.body.status).toBe("active");
    expect(res.body.currency).toBe("USD");
    expect(res.body.routingNumber).toMatch(/^\d{9}$/);
  });

  it("returns 404 for unknown account", async () => {
    const res = await request(app)
      .get("/accounts/00000000-0000-0000-0000-000000000000");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ACCOUNT_NOT_FOUND");
    expect(res.body.requestId).toBeDefined();
  });
});

// ─── GET /accounts/:id/balance ────────────────────────────────────────────────

describe("GET /accounts/:id/balance", () => {
  it("returns balance for a valid account", async () => {
    const res = await request(app)
      .get("/accounts/660e8400-e29b-41d4-a716-446655440001/balance");

    expect(res.status).toBe(200);
    expect(res.body.accountId).toBe("660e8400-e29b-41d4-a716-446655440001");
    expect(typeof res.body.available).toBe("number");
    expect(typeof res.body.pending).toBe("number");
    expect(res.body.currency).toBe("USD");
    expect(res.body.lastUpdated).toBeDefined();
  });

  it("returns 404 for unknown account balance", async () => {
    const res = await request(app)
      .get("/accounts/00000000-0000-0000-0000-000000000000/balance");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("ACCOUNT_NOT_FOUND");
  });
});

// ─── GET /users/:userId/kyc ───────────────────────────────────────────────────

describe("GET /users/:userId/kyc", () => {
  it("returns KYC record for a verified user", async () => {
    const res = await request(app).get("/users/user-001/kyc");

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("user-001");
    expect(res.body.status).toBe("approved");
    expect(res.body.level).toBe(2);
    expect(res.body.submittedAt).toBeDefined();
    expect(res.body.reviewedAt).toBeDefined();
  });

  it("returns 404 for user without KYC record", async () => {
    const res = await request(app).get("/users/unknown-user/kyc");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("KYC_NOT_FOUND");
  });
});

// ─── POST /fraud/assess ───────────────────────────────────────────────────────

describe("POST /fraud/assess", () => {
  it("returns low risk for a small payment", async () => {
    const res = await request(app)
      .post("/fraud/assess")
      .send({ paymentId: "test-payment-001", amount: 100 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.riskLevel).toBe("low");
    expect(res.body.riskScore).toBeLessThan(40);
    expect(res.body.recommendation).toBe("approve");
    expect(res.body.flags).toHaveLength(0);
  });

  it("returns medium risk for a mid-range payment", async () => {
    const res = await request(app)
      .post("/fraud/assess")
      .send({ paymentId: "test-payment-002", amount: 7500 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.riskLevel).toBe("medium");
    expect(res.body.riskScore).toBeGreaterThanOrEqual(40);
  });

  it("returns high risk for a large payment", async () => {
    const res = await request(app)
      .post("/fraud/assess")
      .send({ paymentId: "test-payment-003", amount: 50000 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.riskLevel).toBe("high");
    expect(res.body.recommendation).toBe("review");
    expect(res.body.flags.length).toBeGreaterThan(0);
  });

  it("returns 422 when paymentId is missing", async () => {
    const res = await request(app)
      .post("/fraud/assess")
      .send({ amount: 100 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});
