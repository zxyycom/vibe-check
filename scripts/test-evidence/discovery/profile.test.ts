import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { discoverTestEntities } from "../discover.ts";
import { parseBunJUnit, parseBunRegistrationJUnit } from "./bun.ts";
import { resolveBunTestFiles } from "./bun-files.ts";
import { loadSupportedRunnerProfile, workspaceRoot } from "../profile.ts";

test("parses stable Bun runner reports without inferring missing fields", () => {
  assert.deepEqual(
    parseBunJUnit(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<testsuites tests="1" failures="0">',
        '  <testcase name="rejects &quot;bad&quot; input" classname="suite" file="tests/example.test.ts" line="7" />',
        "</testsuites>"
      ].join("\n")
    ),
    [
      {
        name: 'rejects "bad" input',
        className: "suite",
        file: "tests/example.test.ts",
        line: 7
      }
    ]
  );
  assert.throws(
    () => parseBunJUnit('<testsuites tests="1" failures="0"></testsuites>'),
    /contains 0 testcase/
  );

  const registrationReport = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testsuites tests="1" failures="0" skipped="1">',
    '  <testcase name="registered" classname="suite" file="tests/example.test.ts" line="9">',
    "    <skipped />",
    "  </testcase>",
    "</testsuites>"
  ].join("\n");
  assert.deepEqual(parseBunRegistrationJUnit(registrationReport), [
    {
      name: "registered",
      className: "suite",
      file: "tests/example.test.ts",
      line: 9
    }
  ]);
  assert.throws(
    () => parseBunRegistrationJUnit(registrationReport.replace('skipped="1"', 'skipped="0"')),
    /must skip every test/
  );
  assert.throws(
    () => parseBunRegistrationJUnit(registrationReport.replace("    <skipped />\n", "")),
    /must skip every test/
  );
});

test("forwards cancellation through the top-level discovery operation", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;

  const result = await discoverTestEntities(
    { cancelSignal: controller.signal, workspaceRoot },
    {
      discoverBunEntities: async (options) => {
        receivedSignal = options.cancelSignal;
        return { diagnostics: [], entities: [] };
      }
    }
  );

  assert.strictEqual(receivedSignal, controller.signal);
  assert.deepEqual(result.diagnostics, []);
});

test("loads one versioned and sorted supported runner profile", async () => {
  const profile = loadSupportedRunnerProfile();
  assert.equal(profile.schemaVersion, 1);
  assert.equal(profile.id, "vibe-check-native-tests");
  assert.equal(profile.version, 1);
  assert.equal(Object.isFrozen(profile), true);
  assert.equal(Object.isFrozen(profile.bun), true);
  assert.equal(Object.isFrozen(profile.bun.sourceRoots), true);
  assert.equal(Object.isFrozen(profile.bun.include), true);
  assert.equal(Object.isFrozen(profile.bun.ignore), true);
  assert.equal(Object.isFrozen(profile.bun.supplementalFiles), true);
  assert.deepEqual(profile.bun.ignore, ["**/node_modules/**"]);
  assert.deepEqual(
    profile.bun.sourceRoots,
    [...profile.bun.sourceRoots].sort((left, right) => left.localeCompare(right))
  );
  assert.deepEqual(
    resolveBunTestFiles({ workspaceRoot, profile: profile.bun }),
    findConventionalBunTests(workspaceRoot, profile.bun.sourceRoots)
  );

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-runner-profile-"));
  try {
    const invalidProfiles = [
      {
        ...profile,
        id: 1
      },
      {
        ...profile,
        bun: {
          ...profile.bun,
          sourceRoots: []
        }
      },
      {
        ...profile,
        bun: {
          ...profile.bun,
          include: ["../**/*.test.ts"]
        }
      }
    ];
    for (const [index, invalidProfile] of invalidProfiles.entries()) {
      const sourcePath = path.join(temporaryRoot, `${index}.json`);
      writeJson(sourcePath, invalidProfile);
      assert.throws(
        () => loadSupportedRunnerProfile(sourcePath),
        /identity|non-empty string array|positive relative POSIX globs/
      );
    }
  } finally {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }

  const rootMismatch = await discoverTestEntities({
    workspaceRoot: os.tmpdir()
  });
  assert.ok(
    rootMismatch.diagnostics.some(
      ({ code, message }) =>
        code === "runner-profile-invalid" && message.includes("current checkout")
    )
  );
});

function findConventionalBunTests(root: string, sourceRoots: readonly string[]): string[] {
  const files: string[] = [];
  for (const sourceRoot of sourceRoots) {
    visit(path.join(root, sourceRoot), sourceRoot);
  }
  return files.sort();

  function visit(directoryPath: string, relativeDirectory: string): void {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(path.join(directoryPath, entry.name), relativePath);
      } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        files.push(relativePath);
      }
    }
  }
}

function writeJson(targetPath: string, value: unknown): void {
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}
