import { test } from "node:test";

import {
  cleanupExternalConsumerMaterial,
  resolveExternalConsumerMaterial
} from "./isolated-consumer-material.ts";
import { assertExternalConsumerTypes } from "./isolated-consumer-types.ts";

test("external consumer type acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerTypes(fixture.material.consumerDirectory);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});
