import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { ROUTE_INVENTORY } from "../../src/transport/route-inventory.js";
import { approvedFailureCodes } from "../../src/transport/schemas.js";

type JsonObject = Record<string, unknown>;

async function loadContract(): Promise<JsonObject> {
  return JSON.parse(
    await readFile(resolve(process.cwd(), "api/openapi.json"), "utf8"),
  ) as JsonObject;
}

test("OpenAPI 3.1 exposes exactly the approved R4 route inventory", async () => {
  const contract = await loadContract();
  assert.equal(contract.openapi, "3.1.0");
  const paths = contract.paths as Record<string, JsonObject>;
  const actual = Object.entries(paths)
    .flatMap(([path, item]) =>
      Object.keys(item).map((method) => `${method.toUpperCase()} ${path}`),
    )
    .sort();
  const expected = ROUTE_INVENTORY.map(
    ({ method, path }) => `${method} ${path}`,
  ).sort();
  assert.deepEqual(actual, expected);
});

test("OpenAPI success statuses match the implemented route inventory", async () => {
  const contract = await loadContract();
  const paths = contract.paths as Record<string, JsonObject>;

  for (const route of ROUTE_INVENTORY) {
    const operation = paths[route.path]?.[route.method.toLowerCase()] as JsonObject;
    const responses = operation.responses as Record<string, unknown>;
    const successes = Object.keys(responses)
      .map(Number)
      .filter((status) => status >= 200 && status < 300)
      .sort();
    assert.deepEqual(successes, [...route.successStatuses].sort());
  }
});

test("OpenAPI protects every route and scopes Idempotency-Key to commands", async () => {
  const contract = await loadContract();
  assert.deepEqual(contract.security, [{ bearerAuth: [] }]);
  const paths = contract.paths as Record<string, JsonObject>;

  for (const route of ROUTE_INVENTORY) {
    const operation = paths[route.path]?.[route.method.toLowerCase()] as JsonObject;
    const parameters = (operation.parameters ?? []) as JsonObject[];
    const hasKey = parameters.some(
      (parameter) => parameter.$ref === "#/components/parameters/IdempotencyKey",
    );
    assert.equal(hasKey, route.method === "PUT" || route.method === "POST");
  }
});

test("OpenAPI schemas reject undeclared fields and list every approved error", async () => {
  const contract = await loadContract();
  const components = contract.components as JsonObject;
  const schemas = components.schemas as Record<string, JsonObject>;

  for (const name of [
    "CompleteOnboardingRequest",
    "CreateCheckInRequest",
    "Account",
    "CheckIn",
    "ErrorEnvelope",
  ]) {
    assert.equal(schemas[name]?.additionalProperties, false, name);
  }

  const errorProperties = schemas.ErrorEnvelope!.properties as JsonObject;
  const error = errorProperties.error as JsonObject;
  assert.equal(error.additionalProperties, false);
  const properties = error.properties as JsonObject;
  const code = properties.code as JsonObject;
  assert.deepEqual(
    [...(code.enum as string[])].sort(),
    [...approvedFailureCodes].sort(),
  );
  assert.deepEqual(error.required, ["code", "message", "requestId"]);
});

test("OpenAPI public schemas contain no trusted internal identity fields", async () => {
  const contract = await loadContract();
  const components = contract.components as JsonObject;
  const schemas = components.schemas as Record<string, JsonObject>;

  for (const name of ["Account", "CheckIn"]) {
    const properties = schemas[name]?.properties as JsonObject;
    assert.equal("accountId" in properties, false);
    assert.equal("firebaseUid" in properties, false);
    assert.equal("ownerAccountId" in properties, false);
  }
});
