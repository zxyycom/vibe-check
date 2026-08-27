import { test } from "node:test";

import {
  cleanupExternalConsumerMaterial,
  resolveExternalConsumerMaterial
} from "./isolated-consumer-material.ts";
import { assertExternalConsumerDocumentation } from "./isolated-consumer-documentation.ts";

test("external consumer docs acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerDocumentation(fixture.material);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});
