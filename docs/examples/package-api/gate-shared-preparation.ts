import {
  quietControls,
  completed,
  checkStatusesFor
} from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { run } from "@zxyycom/vibe-check";

// #region package-api-example:gate-shared-preparation
import { defineCheck, defineConfig } from "@zxyycom/vibe-check";

const manifest = defineCheck({
  checkId: "artifact-manifest",
  displayName: "Artifact manifest",
  omitQuietPassedRow: true,
  parseData(data) {
    if (
      data.version !== 1 ||
      typeof data.totalBytes !== "number" ||
      !Number.isSafeInteger(data.totalBytes) ||
      data.totalBytes < 0 ||
      typeof data.fileCount !== "number" ||
      !Number.isSafeInteger(data.fileCount) ||
      data.fileCount < 0
    )
      throw new TypeError("Invalid artifact manifest");
    return { version: 1, totalBytes: data.totalBytes, fileCount: data.fileCount };
  },
  execute: () => ({
    status: "passed",
    data: { version: 1, totalBytes: 82_000, fileCount: 3 }
  })
});

const size = defineCheck({
  checkId: "artifact-size",
  displayName: "Artifact size",
  dependsOn: [manifest.checkId],
  execute({ dependencies }) {
    const read = dependencies.get(manifest.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const data = manifest.parseData(read.data);
    return data.totalBytes <= 100_000 ? { status: "passed", data } : { status: "failed", data };
  }
});

const contents = defineCheck({
  checkId: "artifact-contents",
  displayName: "Artifact contents",
  dependsOn: [manifest.checkId],
  execute({ dependencies }) {
    const read = dependencies.get(manifest.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const data = manifest.parseData(read.data);
    return data.fileCount > 0 ? { status: "passed", data } : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [manifest, size, contents],
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-shared-preparation

const statuses = checkStatusesFor(definition);
let preparations = 0;
const countedManifest = defineCheck({
  ...manifest,
  execute(context) {
    preparations += 1;
    return manifest.execute(context);
  }
});
const passed = completed(
  await run(
    defineConfig({
      ...definition,
      checks: [countedManifest, size, contents]
    }),
    quietControls
  )
);
assert.deepEqual(statuses(passed), ["passed", "passed", "passed"]);
assert.equal(preparations, 1);
const oversize = defineCheck({
  ...manifest,
  execute: () => ({ status: "passed", data: { version: 1, totalBytes: 120_000, fileCount: 3 } })
});
const independent = completed(
  await run(
    defineConfig({
      ...definition,
      checks: [oversize, size, contents]
    }),
    quietControls
  )
);
assert.deepEqual(statuses(independent), ["passed", "failed", "passed"]);
assert.equal(independent.aggregate, "failed");
const failedProvider = defineCheck({
  ...manifest,
  execute: () => ({ status: "failed", data: { version: 1, totalBytes: 0, fileCount: 0 } })
});
assert.deepEqual(
  statuses(
    await run(
      defineConfig({
        ...definition,
        checks: [failedProvider, size, contents]
      }),
      quietControls
    )
  ),
  ["failed", "unavailable", "unavailable"]
);
