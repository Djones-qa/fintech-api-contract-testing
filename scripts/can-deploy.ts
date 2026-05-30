/**
 * Can-I-Deploy Check
 *
 * Queries the Pact Broker to determine whether it is safe to deploy
 * a service version to a given environment. Exits non-zero if deployment
 * would break a verified contract.
 *
 * Run via: npm run pact:can-deploy
 *
 * Required environment variables:
 *   PACT_BROKER_URL       — URL of your Pact Broker instance
 *   PACT_BROKER_TOKEN     — Bearer token for authentication
 *   PACTICIPANT           — Service name (e.g. PaymentsService)
 *   GIT_COMMIT            — Version to check
 *   DEPLOY_ENV            — Target environment (e.g. production, staging)
 */

import { CanDeploy } from "@pact-foundation/pact-node";

const brokerUrl = process.env["PACT_BROKER_URL"];
const brokerToken = process.env["PACT_BROKER_TOKEN"];
const pacticipant = process.env["PACTICIPANT"];
const version = process.env["GIT_COMMIT"] ?? "latest";
const environment = process.env["DEPLOY_ENV"] ?? "production";

if (!brokerUrl || !brokerToken || !pacticipant) {
  console.error(
    "❌  PACT_BROKER_URL, PACT_BROKER_TOKEN, and PACTICIPANT must be set."
  );
  process.exit(1);
}

const canDeploy = new CanDeploy({
  pactBroker: brokerUrl,
  pactBrokerToken: brokerToken,
  pacticipants: [{ name: pacticipant, version }],
  to: environment,
  output: "table",
  verbose: true,
});

canDeploy
  .canDeploy()
  .then(() => {
    console.log(`✅  ${pacticipant}@${version} can be deployed to ${environment}`);
  })
  .catch((err: unknown) => {
    console.error(`❌  ${pacticipant}@${version} CANNOT be deployed to ${environment}`);
    console.error(err);
    process.exit(1);
  });
