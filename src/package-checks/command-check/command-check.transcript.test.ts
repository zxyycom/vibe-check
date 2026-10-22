import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  createCommandCheckExecutionContext,
  createCommandCheckFixture,
  executeCommandCheckFixture
} from "./command-check.test-support.ts";

const CANARY_ARGUMENT = "command-argument-canary";
const CANARY_ENVIRONMENT = "command-environment-canary";
const CANARY_OUTPUT = "command-output-canary";

async function waitForFile(path: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (existsSync(path)) return;
    await new Promise<void>((resolveDelay) => {
      setTimeout(resolveDelay, 10);
    });
  }
  throw new Error(`Timed out waiting for ${path}`);
}

describe("commandCheck transcripts", () => {
  it("requires artifact capability for transcripts and atomically retains only opted-in raw output", async () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-command-check-"));
    const artifactDirectory = join(root, "artifact");
    try {
      const transcript = createCommandCheckFixture({
        arguments: [
          "--eval",
          `if (process.argv.at(-1) !== ${JSON.stringify(CANARY_ARGUMENT)} ||
               process.env.TRANSCRIPT_INPUT !== ${JSON.stringify(CANARY_ENVIRONMENT)}) process.exit(7);
           process.stdout.write(${JSON.stringify(CANARY_OUTPUT)}); process.stderr.write('stderr')`,
          CANARY_ARGUMENT
        ],
        environment: { mode: "exact", variables: { TRANSCRIPT_INPUT: CANARY_ENVIRONMENT } },
        output: { mode: "transcript" }
      });
      assert.deepEqual(await executeCommandCheckFixture(transcript.options, root), {
        status: "unavailable",
        reason: { code: "command-transcript-unavailable" }
      });
      assert.deepEqual(
        await executeCommandCheckFixture(transcript.options, root, artifactDirectory),
        {
          status: "passed",
          data: { exitCode: 0 }
        }
      );
      const log = readFileSync(join(artifactDirectory, "process.log"), "utf8");
      assert.match(log, /^status=passed\nstdout:\n/);
      assert.match(log, new RegExp(CANARY_OUTPUT));
      assert.match(log, /stderr/);
      assert.equal(log.includes(CANARY_ARGUMENT), false);
      assert.equal(log.includes(CANARY_ENVIRONMENT), false);

      const finalFailureArtifact = join(root, "final-replacement-failure");
      const releaseChildPath = join(root, "release-final-replacement-child");
      let finalCallbackCalls = 0;
      const finalFailure = createCommandCheckFixture({
        arguments: [
          "--eval",
          `const fs = require('node:fs');
           const waiting = setInterval(() => {
             if (!fs.existsSync(${JSON.stringify(releaseChildPath)})) return;
             clearInterval(waiting);
             process.stdout.write('closed');
           }, 5);`
        ],
        afterCommand: {
          execute: () => {
            finalCallbackCalls += 1;
            return { status: "passed", data: { unexpected: true } };
          }
        },
        output: { mode: "transcript" }
      });
      const finalFailureExecution = finalFailure.execute.callback(
        finalFailure.options,
        createCommandCheckExecutionContext(finalFailure.options, root, finalFailureArtifact)
      );
      const finalTranscriptPath = join(finalFailureArtifact, "process.log");
      try {
        await waitForFile(finalTranscriptPath);
        rmSync(finalTranscriptPath);
        mkdirSync(finalTranscriptPath);
      } finally {
        writeFileSync(releaseChildPath, "release");
        await finalFailureExecution;
      }
      assert.deepEqual(await finalFailureExecution, {
        status: "unavailable",
        reason: { code: "command-transcript-unavailable" }
      });
      assert.equal(finalCallbackCalls, 0);

      const blockedArtifact = join(root, "blocked");
      writeFileSync(blockedArtifact, "not a directory", "utf8");
      assert.deepEqual(
        await executeCommandCheckFixture(transcript.options, root, blockedArtifact),
        {
          status: "unavailable",
          reason: { code: "command-transcript-unavailable" }
        }
      );
      assert.equal(existsSync(join(blockedArtifact, "process.log")), false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
