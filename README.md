# fintech-api-contract-testing

[![Contract Tests](https://github.com/darrius-jones/fintech-api-contract-testing/actions/workflows/contract-tests.yml/badge.svg)](https://github.com/darrius-jones/fintech-api-contract-testing/actions/workflows/contract-tests.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Pact](https://img.shields.io/badge/Pact-Consumer--Driven-E4003A?logo=pact&logoColor=white)](https://pact.io)
[![Zod](https://img.shields.io/badge/Zod-Schema%20Validation-3E67B1)](https://zod.dev)
[![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0-6BA539?logo=openapiinitiative&logoColor=white)](https://swagger.io/specification/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org)

> **Consumer-driven contract testing suite for FinTech REST APIs** — the #2 most in-demand QA skill in banking and payments after visual/E2E testing. Built to mirror the exact toolchain used at Stripe, Plaid, and Chime.

---

## What This Is

A production-grade contract testing framework covering two FinTech microservices — **Payments** and **Accounts** — with four complementary testing layers:

| Layer | Tool | What It Catches |
|---|---|---|
| Consumer contracts | Pact v3 | Breaking API changes between services |
| HTTP integration | Supertest | Endpoint behaviour, status codes, error handling |
| Schema validation | Zod | Runtime type mismatches in API responses |
| Spec compliance | OpenAPI + swagger-parser | Drift between implementation and API spec |

---

## Why Contract Testing Matters in FinTech

Microservices in payments platforms communicate over HTTP. When the **Accounts Service** changes a field name or drops a required property, the **Payments Service** breaks — silently, in production, during a live transaction.

Contract testing solves this by:

1. **Consumer** writes tests that describe exactly what it needs from the provider
2. Pact generates a **contract file** (JSON) from those tests
3. **Provider** runs the contract against its real implementation
4. The **Pact Broker** tracks versions and blocks deploys that would break a contract

This is the `can-i-deploy` gate — the same pattern Stripe uses before every production release.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions CI                         │
│                                                             │
│  typecheck → schema-tests ──┐                               │
│             integration-tests ──┤                           │
│             openapi-tests ──┤──→ consumer-tests             │
│                              │        │                     │
│                              │        ▼                     │
│                              │   publish pacts              │
│                              │        │                     │
│                              │        ▼                     │
│                              └──→ provider-verification     │
│                                        │                    │
│                                        ▼                    │
│                                  can-i-deploy gate          │
└─────────────────────────────────────────────────────────────┘

PaymentsService (consumer)          AccountsService (provider)
├── POST /payments              ←→  GET  /accounts/:id
├── GET  /payments/:id          ←→  GET  /accounts/:id/balance
└── PATCH /payments/:id/cancel  ←→  GET  /users/:userId/kyc
                                ←→  POST /fraud/assess
```

---

## Project Structure

```
fintech-api-contract-testing/
├── .github/
│   └── workflows/
│       └── contract-tests.yml       # Full CI pipeline
├── openapi/
│   ├── payments-service.yaml        # OpenAPI 3.0 spec — Payments
│   └── accounts-service.yaml        # OpenAPI 3.0 spec — Accounts
├── pacts/                           # Generated pact files (git-ignored in real projects)
├── scripts/
│   ├── publish-pacts.ts             # Publish contracts to Pact Broker
│   └── can-deploy.ts                # Can-I-Deploy safety gate
├── src/
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript types
│   ├── schemas/
│   │   ├── payment.schema.ts        # Zod schemas — payments
│   │   └── account.schema.ts        # Zod schemas — accounts, KYC, fraud
│   ├── services/
│   │   ├── payments-service/
│   │   │   └── app.ts               # Express app — Payments
│   │   └── accounts-service/
│   │       └── app.ts               # Express app — Accounts
│   └── tests/
│       ├── consumer/
│       │   └── payments-consumer.test.ts   # Pact consumer tests
│       ├── provider/
│       │   └── accounts-provider.test.ts   # Pact provider verification
│       ├── integration/
│       │   ├── payments.integration.test.ts
│       │   └── accounts.integration.test.ts
│       ├── schema/
│       │   ├── payment.schema.test.ts
│       │   └── account.schema.test.ts
│       └── openapi/
│           └── spec-compliance.test.ts
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install

```bash
git clone https://github.com/darrius-jones/fintech-api-contract-testing.git
cd fintech-api-contract-testing
npm install
```

### Run All Tests

```bash
npm test
```

### Run Individual Test Suites

```bash
# Zod schema validation only
npm run test:schema

# Supertest HTTP integration tests
npm run test:integration

# OpenAPI spec compliance
npm run test:openapi

# Pact consumer tests (generates pact files)
npm run test:consumer

# Pact provider verification (requires pact files from consumer run)
npm run test:provider
```

### Type Check

```bash
npm run typecheck
```

---

## Pact Broker Setup

To publish contracts and use the `can-i-deploy` gate, you need a Pact Broker. The easiest option is a free [PactFlow](https://pactflow.io) account.

Set these secrets in your GitHub repository:

| Secret | Description |
|---|---|
| `PACT_BROKER_URL` | Your PactFlow instance URL |
| `PACT_BROKER_TOKEN` | Read/write API token |

Then publish manually:

```bash
export PACT_BROKER_URL=https://your-org.pactflow.io
export PACT_BROKER_TOKEN=your-token
export GIT_COMMIT=$(git rev-parse HEAD)
export GIT_BRANCH=$(git branch --show-current)

npm run pact:publish
```

Check if a service can deploy:

```bash
export PACTICIPANT=PaymentsService
export DEPLOY_ENV=production
npm run pact:can-deploy
```

---

## Test Coverage

| Suite | Tests | Covers |
|---|---|---|
| Schema (Zod) | 40+ | Payment, Account, KYC, Fraud schemas |
| Integration (Supertest) | 25+ | All endpoints, happy + error paths |
| Consumer (Pact) | 5 interactions | Account lookup, balance, KYC, fraud |
| Provider (Pact) | 1 verification run | All consumer interactions |
| OpenAPI compliance | 15+ | Spec validity + response shape |

---

## Key Concepts Demonstrated

**Consumer-Driven Contracts** — The consumer (Payments Service) defines what it needs. The provider (Accounts Service) must satisfy those needs. Neither side can break the contract without a failing CI build.

**Provider State Handlers** — Before each Pact interaction is replayed, a state handler seeds the exact data the interaction requires. This makes provider tests deterministic and isolated.

**Zod Runtime Validation** — Schemas are defined once and used for both request validation in the Express handlers and test assertions. A single source of truth for data shapes.

**OpenAPI as a Contract** — The YAML specs are validated with `swagger-parser` to catch broken `$ref` pointers and malformed schemas before they reach production.

**Can-I-Deploy Gate** — The CI pipeline blocks merges to `main` if any service version would break a verified contract in the target environment.

---

## Author

**Darrius Jones**

- GitHub: [github.com/darrius-jones](https://github.com/darrius-jones)
- LinkedIn: [linkedin.com/in/darrius-jones-28226b350](https://www.linkedin.com/in/darrius-jones-28226b350/)

---

## License

[MIT](./LICENSE) © Darrius Jones
