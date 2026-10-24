import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_EXPORTS } from "../../package-contract.ts";

const ISOLATED_JSON_SCHEMA_ID = "https://schemas.vibe-check.example/person";

/** Writes tool-resolution and Run-evidence inputs contributed by runtime acceptance. */
export function writeExternalConsumerRuntimeFixture(consumerDirectory: string): void {
  writeFileSync(join(consumerDirectory, "run-fixture.mjs"), runFixture(), "utf8");
  writeFileSync(
    join(consumerDirectory, "markdown-link-worker-fixture.mjs"),
    readFileSync(
      fileURLToPath(new URL("./fixtures/markdown-link-worker-runtime.mjs", import.meta.url)),
      "utf8"
    ),
    "utf8"
  );
  writeFileSync(
    join(consumerDirectory, "command-check-fixture.mjs"),
    commandCheckFixture(),
    "utf8"
  );
  writeFileSync(join(consumerDirectory, "duplicate-a.ts"), duplicateSource(), "utf8");
  writeFileSync(join(consumerDirectory, "duplicate-b.ts"), duplicateSource(), "utf8");
  writeFileSync(join(consumerDirectory, "function-metrics.rs"), functionMetricsSource(), "utf8");
  writeFileSync(join(consumerDirectory, "function-metrics.ts"), nullishMetricsSource(), "utf8");
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

export { assertExternalConsumerRuntime } from "./runtime-evidence/run.ts";

function runFixture(): string {
  const source = readFileSync(
    fileURLToPath(new URL("./fixtures/runtime.mjs", import.meta.url)),
    "utf8"
  );
  return source
    .replaceAll("__VIBE_CHECK_ISOLATED_JSON_SCHEMA_ID__", ISOLATED_JSON_SCHEMA_ID)
    .replace('"__VIBE_CHECK_EXPECTED_RUNTIME_EXPORTS__"', JSON.stringify(RUNTIME_EXPORTS));
}

function commandCheckFixture(): string {
  return readFileSync(
    fileURLToPath(new URL("./fixtures/command-check-runtime.mjs", import.meta.url)),
    "utf8"
  );
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
  return `fn workerProof(value: i32) -> i32 {
  match value {
    0 => 3,
    1 => 4,
    _ => 5,
  }
}
`;
}

function nullishMetricsSource(): string {
  return `function nullishProof(a,b,c,d): number[] {
  return [a ?? 0, b??0, c ?? 0, d??0];
}
if (true) {
  for (const value of [1]) {
    if (true) { void value; }
  }
}
`;
}
