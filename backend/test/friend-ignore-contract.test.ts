import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { friendIgnoredListSchema, friendIgnoreReadSchema, friendIgnoreWriteSchema } from "../src/friend-recommendations/transport/friend-ignore-routes.js";
import { friendRecommendationsSchema } from "../src/friend-recommendations/transport/friend-recommendation-route.js";
const contract = JSON.parse(readFileSync("api/openapi.json", "utf8"));
test("ignore normative response, body and username schemas exactly match implemented transport", () => {
  const list = contract.paths["/v1/me/friend-recommendation-ignores"].get;
  const state = contract.paths["/v1/me/friend-recommendation-ignores/{username}"];
  assert.deepEqual(list.responses["200"].content["application/json"].schema, friendIgnoredListSchema.response[200]);
  for (const operation of [state.get, state.put]) {
    assert.deepEqual(operation.responses["200"].content["application/json"].schema, friendIgnoreReadSchema.response[200]);
    assert.deepEqual(operation.parameters[0].schema, friendIgnoreReadSchema.params.properties.username);
  }
  assert.deepEqual(state.put.requestBody.content["application/json"].schema, friendIgnoreWriteSchema.body);
  assert.deepEqual(contract.paths["/v1/recommendations/friends"].get.responses["200"].content["application/json"].schema,
    friendRecommendationsSchema.response[200]);
});
