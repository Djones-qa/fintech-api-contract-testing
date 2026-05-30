/**
 * Consumer Contract Tests — Payments Service → Accounts Service
 *
 * These tests define what the Payments Service (consumer) expects
 * from the Accounts Service (provider). Pact generates a contract
 * (pact file) that the provider must verify against.
 */

import path from "path";
import { PactV3, MatchersV3 } from "@pact-foundation/pact";
import axios from "axios";

const { like, regex, integer, decimal } = MatchersV3;

const provider = new PactV3({
  consumer: "PaymentsService",
  provider: "AccountsService",
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "warn",
});

// ─── Account Lookup ───────────────────────────────────────────────────────────

describe("PaymentsService → AccountsService contract", () => {
  describe("GET /accounts/:id", () => {
    it("returns account details for a valid account ID", async () => {
      await provider
        .addInteraction({
          states: [{ description: "account 660e8400 exists and is active" }],
          uponReceiving: "a request for account details",
          withRequest: {
            method: "GET",
            path: "/accounts/660e8400-e29b-41d4-a716-446655440001",
            headers: { Accept: "application/json" },
          },
          willRespondWith: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: {
              id: like("660e8400-e29b-41d4-a716-446655440001"),
              ownerId: like("user-001"),
              type: regex("checking|savings|credit", "checking"),
              status: regex("active|inactive|frozen|closed", "active"),
              balance: decimal(10000.0),
              currency: regex("USD|EUR|GBP|CAD", "USD"),
              routingNumber: regex("^\\d{9}$", "021000021"),
              accountNumber: like("123456789012"),
              createdAt: like("2023-06-01T00:00:00.000Z"),
              updatedAt: like("2024-01-15T10:31:00.000Z"),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(
            `${mockServer.url}/accounts/660e8400-e29b-41d4-a716-446655440001`,
            { headers: { Accept: "application/json" } }
          );
          expect(response.status).toBe(200);
          expect(response.data.id).toBeDefined();
          expect(response.data.status).toBe("active");
          expect(response.data.currency).toBe("USD");
        });
    });

    it("returns 404 for a non-existent account", async () => {
      await provider
        .addInteraction({
          states: [{ description: "account does-not-exist does not exist" }],
          uponReceiving: "a request for a non-existent account",
          withRequest: {
            method: "GET",
            path: "/accounts/00000000-0000-0000-0000-000000000000",
            headers: { Accept: "application/json" },
          },
          willRespondWith: {
            status: 404,
            headers: { "Content-Type": "application/json" },
            body: {
              code: like("ACCOUNT_NOT_FOUND"),
              message: like("Account 00000000-0000-0000-0000-000000000000 not found"),
              requestId: like("req_123456"),
            },
          },
        })
        .executeTest(async (mockServer) => {
          try {
            await axios.get(
              `${mockServer.url}/accounts/00000000-0000-0000-0000-000000000000`,
              { headers: { Accept: "application/json" } }
            );
            fail("Expected 404 error");
          } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
              expect(err.response?.status).toBe(404);
              expect(err.response?.data.code).toBe("ACCOUNT_NOT_FOUND");
            }
          }
        });
    });
  });

  // ─── Balance Check ──────────────────────────────────────────────────────────

  describe("GET /accounts/:id/balance", () => {
    it("returns balance for a valid account", async () => {
      await provider
        .addInteraction({
          states: [{ description: "account 660e8400 exists with sufficient balance" }],
          uponReceiving: "a request for account balance",
          withRequest: {
            method: "GET",
            path: "/accounts/660e8400-e29b-41d4-a716-446655440001/balance",
            headers: { Accept: "application/json" },
          },
          willRespondWith: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: {
              accountId: like("660e8400-e29b-41d4-a716-446655440001"),
              available: decimal(10000.0),
              pending: decimal(0),
              currency: regex("USD|EUR|GBP|CAD", "USD"),
              lastUpdated: like("2024-01-15T10:31:00.000Z"),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(
            `${mockServer.url}/accounts/660e8400-e29b-41d4-a716-446655440001/balance`,
            { headers: { Accept: "application/json" } }
          );
          expect(response.status).toBe(200);
          expect(response.data.available).toBeGreaterThanOrEqual(0);
          expect(response.data.currency).toBeDefined();
        });
    });
  });

  // ─── KYC Verification ───────────────────────────────────────────────────────

  describe("GET /users/:userId/kyc", () => {
    it("returns KYC status for a verified user", async () => {
      await provider
        .addInteraction({
          states: [{ description: "user user-001 has completed KYC level 2" }],
          uponReceiving: "a request for KYC verification status",
          withRequest: {
            method: "GET",
            path: "/users/user-001/kyc",
            headers: { Accept: "application/json" },
          },
          willRespondWith: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            body: {
              userId: like("user-001"),
              status: regex("not_started|pending|approved|rejected", "approved"),
              level: integer(2),
              submittedAt: like("2023-06-01T00:00:00.000Z"),
              reviewedAt: like("2023-06-02T00:00:00.000Z"),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.get(
            `${mockServer.url}/users/user-001/kyc`,
            { headers: { Accept: "application/json" } }
          );
          expect(response.status).toBe(200);
          expect(response.data.status).toBe("approved");
          expect(response.data.level).toBeGreaterThanOrEqual(1);
        });
    });
  });

  // ─── Fraud Assessment ───────────────────────────────────────────────────────

  describe("POST /fraud/assess", () => {
    it("returns a fraud assessment for a payment", async () => {
      await provider
        .addInteraction({
          states: [{ description: "fraud service is available" }],
          uponReceiving: "a fraud assessment request for a low-risk payment",
          withRequest: {
            method: "POST",
            path: "/fraud/assess",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: {
              paymentId: like("550e8400-e29b-41d4-a716-446655440000"),
              amount: like(250.0),
            },
          },
          willRespondWith: {
            status: 201,
            headers: { "Content-Type": "application/json" },
            body: {
              paymentId: like("550e8400-e29b-41d4-a716-446655440000"),
              riskLevel: regex("low|medium|high|critical", "low"),
              riskScore: decimal(15),
              flags: like([]),
              recommendation: regex("approve|review|decline", "approve"),
              assessedAt: like("2024-01-15T10:30:00.000Z"),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const response = await axios.post(
            `${mockServer.url}/fraud/assess`,
            {
              paymentId: "550e8400-e29b-41d4-a716-446655440000",
              amount: 250.0,
            },
            { headers: { "Content-Type": "application/json", Accept: "application/json" } }
          );
          expect(response.status).toBe(201);
          expect(response.data.riskLevel).toBeDefined();
          expect(response.data.recommendation).toBeDefined();
          expect(response.data.riskScore).toBeGreaterThanOrEqual(0);
        });
    });
  });
});
