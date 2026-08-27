import { test } from "node:test";

import {
  cleanupExternalConsumerMaterial,
  resolveExternalConsumerMaterial
} from "./isolated-consumer-material.ts";
import { assertExternalConsumerRuntime } from "./isolated-consumer-runtime.ts";

test("external consumer runtime acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerRuntime(fixture.material);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});
