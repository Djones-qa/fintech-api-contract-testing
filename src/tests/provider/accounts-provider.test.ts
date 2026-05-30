/**
 * Provider Verification Tests — Accounts Service
 *
 * These tests verify that the Accounts Service (provider) honours
 * every interaction defined in the consumer pact files.
 * The Pact framework replays each consumer interaction against the
 * real provider and confirms the responses match the contract.
 */

import path from "path";
import { Server } from "http";
import { Verifier } from "@pact-foundation/pact";
import { app, accounts, kycRecords, seedAccounts } from "../../services/accounts-service/app";
import { Account, KycVerification } from "../../types";

let server: Server;
let port: number;

beforeAll((done) => {
  server = app.listen(0, () => {
    const addr = server.address();
    port = typeof addr === "object" && addr ? addr.port : 3001;
    done();
  });
});

afterAll((done) => {
  server.close(done);
});

// ─── Provider State Handlers ──────────────────────────────────────────────────
// These set up the exact data state each consumer interaction requires.

const stateHandlers: Record<string, () => Promise<void>> = {
  "account 660e8400 exists and is active": async () => {
    seedAccounts();
  },

  "account does-not-exist does not exist": async () => {
    accounts.clear();
  },

  "account 660e8400 exists with sufficient balance": async () => {
    seedAccounts();
    const account = accounts.get("660e8400-e29b-41d4-a716-446655440001");
    if (account) {
      const updated: Account = { ...account, balance: 10000.0 };
      accounts.set(updated.id, updated);
    }
  },

  "user user-001 has completed KYC level 2": async () => {
    const kyc: KycVerification = {
      userId: "user-001",
      status: "approved",
      level: 2,
      submittedAt: "2023-06-01T00:00:00.000Z",
      reviewedAt: "2023-06-02T00:00:00.000Z",
    };
    kycRecords.set("user-001", kyc);
  },

  "fraud service is available": async () => {
    // No specific state needed — fraud endpoint is always available
  },
};

// ─── Pact Verification ────────────────────────────────────────────────────────

describe("AccountsService provider verification", () => {
  it("validates all consumer contracts", async () => {
    const pactFile = path.resolve(
      process.cwd(),
      "pacts",
      "PaymentsService-AccountsService.json"
    );

    const verifier = new Verifier({
      provider: "AccountsService",
      providerBaseUrl: `http://localhost:${port}`,
      pactUrls: [pactFile],
      stateHandlers,
      logLevel: "warn",
      publishVerificationResult: false, // set true in CI with pactBrokerUrl
    });

    await verifier.verifyProvider();
  }, 60_000);
});
