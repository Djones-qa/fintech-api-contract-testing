/**
 * Integration Tests — Payments Service
 *
 * HTTP-level tests using Supertest against the real Express app.
 * These cover happy paths, edge cases, and error scenarios.
 */

import request from "supertest";
import { app, payments, seedPayments } from "../../services/payments-service/app";

beforeEach(() => {
  payments.clear();
  seedPayments();
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with service status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("payments-service");
  });
});

// ─── GET /payments ────────────────────────────────────────────────────────────

describe("GET /payments", () => {
  it("returns paginated list of payments", async () => {
    const res = await request(app).get("/payments");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("includes seeded payment in the list", async () => {
    const res = await request(app).get("/payments");
    const ids = res.body.data.map((p: { id: string }) => p.id);
    expect(ids).toContain("550e8400-e29b-41d4-a716-446655440000");
  });
});

// ─── GET /payments/:id ────────────────────────────────────────────────────────

describe("GET /payments/:id", () => {
  it("returns a payment by ID", async () => {
    const res = await request(app)
      .get("/payments/550e8400-e29b-41d4-a716-446655440000");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(res.body.amount).toBe(250.0);
    expect(res.body.currency).toBe("USD");
    expect(res.body.status).toBe("completed");
  });

  it("returns 404 for unknown payment ID", async () => {
    const res = await request(app)
      .get("/payments/00000000-0000-0000-0000-000000000000");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("PAYMENT_NOT_FOUND");
    expect(res.body.requestId).toBeDefined();
  });
});

// ─── POST /payments ───────────────────────────────────────────────────────────

describe("POST /payments", () => {
  const validPayload = {
    amount: 500.0,
    currency: "USD",
    method: "bank_transfer",
    sourceAccountId: "660e8400-e29b-41d4-a716-446655440001",
    destinationAccountId: "770e8400-e29b-41d4-a716-446655440002",
    description: "Test payment",
  };

  it("creates a new payment and returns 201", async () => {
    const res = await request(app)
      .post("/payments")
      .send(validPayload)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("pending");
    expect(res.body.amount).toBe(500.0);
    expect(res.body.currency).toBe("USD");
    expect(res.body.createdAt).toBeDefined();
  });

  it("returns 422 when amount is missing", async () => {
    const { amount: _amount, ...noAmount } = validPayload;
    const res = await request(app)
      .post("/payments")
      .send(noAmount)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when currency is invalid", async () => {
    const res = await request(app)
      .post("/payments")
      .send({ ...validPayload, currency: "INVALID" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when amount exceeds maximum limit", async () => {
    const res = await request(app)
      .post("/payments")
      .send({ ...validPayload, amount: 2_000_000 })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when sourceAccountId is not a valid UUID", async () => {
    const res = await request(app)
      .post("/payments")
      .send({ ...validPayload, sourceAccountId: "not-a-uuid" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(422);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("persists the created payment", async () => {
    const createRes = await request(app)
      .post("/payments")
      .send(validPayload)
      .set("Content-Type", "application/json");

    const { id } = createRes.body as { id: string };
    const getRes = await request(app).get(`/payments/${id}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);
  });
});

// ─── PATCH /payments/:id/cancel ───────────────────────────────────────────────

describe("PATCH /payments/:id/cancel", () => {
  it("cancels a pending payment", async () => {
    // Create a pending payment first
    const createRes = await request(app)
      .post("/payments")
      .send({
        amount: 100.0,
        currency: "USD",
        method: "card",
        sourceAccountId: "660e8400-e29b-41d4-a716-446655440001",
        destinationAccountId: "770e8400-e29b-41d4-a716-446655440002",
      })
      .set("Content-Type", "application/json");

    const { id } = createRes.body as { id: string };
    const cancelRes = await request(app).patch(`/payments/${id}/cancel`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("cancelled");
  });

  it("returns 409 when trying to cancel a completed payment", async () => {
    const res = await request(app)
      .patch("/payments/550e8400-e29b-41d4-a716-446655440000/cancel");

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("PAYMENT_ALREADY_COMPLETED");
  });

  it("returns 404 for unknown payment ID", async () => {
    const res = await request(app)
      .patch("/payments/00000000-0000-0000-0000-000000000000/cancel");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("PAYMENT_NOT_FOUND");
  });
});
