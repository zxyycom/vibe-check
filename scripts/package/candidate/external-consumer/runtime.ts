import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const ISOLATED_JSON_SCHEMA_ID = "https://schemas.vibe-check.example/person";

/** Writes tool-resolution and Run-evidence inputs contributed by runtime acceptance. */
export function writeExternalConsumerRuntimeFixture(consumerDirectory: string): void {
  writeFileSync(join(consumerDirectory, "run-fixture.mjs"), runFixture(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-a.ts"), duplicateSource(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-b.ts"), duplicateSource(), "utf8");
  writeFileSync(join(consumerDirectory, "function-metrics.ts"), functionMetricsSource(), "utf8");
  writeFileSync(
    join(consumerDirectory, "schema.json"),
    `${JSON.stringify({
      $id: ISOLATED_JSON_SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      properties: { name: { type: "string" } },
      required: ["name"],
      type: "object"
    })}\n`,
    "utf8"
  );
  writeFileSync(join(consumerDirectory, "instance.json"), '{"name":"Ada"}\n', "utf8");
  writeFileSync(
    join(consumerDirectory, "link-source.md"),
    "[target](link-target.md#target)\n",
    "utf8"
  );
  writeFileSync(join(consumerDirectory, "link-target.md"), "# Target\n", "utf8");
}

export { assertExternalConsumerRuntime } from "./runtime-evidence.ts";

function runFixture(): string {
  const source = readFileSync(
    fileURLToPath(new URL("./fixtures/runtime.mjs", import.meta.url)),
    "utf8"
  );
  return source.replaceAll("__VIBE_CHECK_ISOLATED_JSON_SCHEMA_ID__", ISOLATED_JSON_SCHEMA_ID);
}

function duplicateSource(): string {
  return `export function duplicateExample(value: number): number {
  let total = value;
  total += 1;
  total += 2;
  total += 3;
  total += 4;
  total += 5;
  total += 6;
  total += 7;
  total += 8;
  total += 9;
  total += 10;
  total += 11;
  total += 12;
  total += 13;
  total += 14;
  total += 15;
  return total;
}
`;
}

function functionMetricsSource(): string {
  return `export function workerProof(value: number): number {
  if (value > 0) return value;
  return -value;
}
`;
}
