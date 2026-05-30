/**
 * Pact Broker Publishing Script
 *
 * Publishes generated pact files to the Pact Broker after consumer tests run.
 * Run via: npm run pact:publish
 *
 * Required environment variables:
 *   PACT_BROKER_URL       — URL of your Pact Broker instance
 *   PACT_BROKER_TOKEN     — Bearer token for authentication
 *   GIT_COMMIT            — Current git SHA (set automatically in CI)
 *   GIT_BRANCH            — Current branch name (set automatically in CI)
 */

import path from "path";
import { Publisher } from "@pact-foundation/pact-node";

const brokerUrl = process.env["PACT_BROKER_URL"];
const brokerToken = process.env["PACT_BROKER_TOKEN"];
const consumerVersion = process.env["GIT_COMMIT"] ?? "local-dev";
const branch = process.env["GIT_BRANCH"] ?? "main";

if (!brokerUrl || !brokerToken) {
  console.error(
    "❌  PACT_BROKER_URL and PACT_BROKER_TOKEN must be set.\n" +
    "    For local testing, use a free PactFlow account at https://pactflow.io"
  );
  process.exit(1);
}

const publisher = new Publisher({
  pactBroker: brokerUrl,
  pactBrokerToken: brokerToken,
  pactFilesOrDirs: [path.resolve(process.cwd(), "pacts")],
  consumerVersion,
  branch,
  tags: [branch, "latest"],
});

publisher
  .publish()
  .then(() => {
    console.log(`✅  Pacts published successfully.`);
    console.log(`    Version : ${consumerVersion}`);
    console.log(`    Branch  : ${branch}`);
    console.log(`    Broker  : ${brokerUrl}`);
  })
  .catch((err: unknown) => {
    console.error("❌  Failed to publish pacts:", err);
    process.exit(1);
  });
