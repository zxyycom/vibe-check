import { test } from "node:test";

import { cleanupExternalConsumerMaterial, resolveExternalConsumerMaterial } from "./material.ts";
import { assertExternalConsumerDocumentation } from "./documentation.ts";

test("external consumer docs acceptance", { concurrency: false, timeout: 20_000 }, async () => {
  const fixture = await resolveExternalConsumerMaterial();
  try {
    assertExternalConsumerDocumentation(fixture.material);
  } finally {
    if (fixture.cleanup) cleanupExternalConsumerMaterial(fixture.material);
  }
});
