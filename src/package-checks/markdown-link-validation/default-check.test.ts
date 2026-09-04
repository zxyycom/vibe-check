import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "../../project-definition/project-definition.ts";
import { executeMarkdownLinkValidation } from "./execution.ts";
import { markdownLinkValidation } from "./default-check.ts";
import { parseMarkdownLinkValidationData } from "./final-data.ts";
import { validMarkdownLinkValidationOptions } from "./options-validation.ts";
import {
  createMarkdownTestRoot,
  execute,
  MARKDOWN_FILES,
  MARKDOWN_LINK_OPTIONS
} from "./default-check.test-support.ts";

describe("default Check direct callbacks", () => {
  it("materializes bounded Markdown Link defaults and rejects malformed resolved options", async () => {
    const defaultCheck = markdownLinkValidation();
    assert.equal(defaultCheck.options.findingPolicy, "non-blocking");
    assert.deepEqual(defaultCheck.options.files.include, [
      "**/*.[mM][dD]",
      "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"
    ]);
    assert.equal(defaultCheck.options.requireExistingTargets, true);
    assert.deepEqual(defaultCheck.options.cache, { enabled: false });
    assert.equal(Object.isFrozen(defaultCheck.options.cache), true);
    assert.deepEqual(
      markdownLinkValidation({
        files: { include: ["docs/**/*.md"] },
        limits: { maxTargetReads: 50 },
        rootExternalTargetMode: "ignore"
      }).options,
      {
        cache: { enabled: false },
        files: {
          exclude: defaultCheck.options.files.exclude,
          include: ["docs/**/*.md"],
          source: "filesystem"
        },
        findingPolicy: "non-blocking",
        limits: {
          maxMarkdownBytes: 1_048_576,
          maxOccurrences: 10_000,
          maxTargetReads: 50
        },
        requireExistingTargets: true,
        requireNonEmptyDirectories: false,
        rootExternalTargetMode: "ignore",
        validateCrossDocumentAnchors: true,
        validateSameDocumentAnchors: true
      }
    );
    const cacheDirectory = join(tmpdir(), "vibe-check-markdown-link-cache-options");
    const disabledFingerprint = declarativeFingerprint(markdownLinkValidation());
    const enabledFingerprint = declarativeFingerprint(
      markdownLinkValidation({ cache: { enabled: true, directory: cacheDirectory } })
    );
    assert.notEqual(disabledFingerprint, enabledFingerprint);
    assert.throws(
      () => Reflect.apply(markdownLinkValidation, undefined, [{ unknown: true }]),
      /documented closed policy/
    );
    assert.equal(defaultCheck.parseData, parseMarkdownLinkValidationData);
    assert.deepEqual(
      defaultCheck.parseData({
        sourceFileCount: 1,
        occurrenceCount: 2,
        targetReadCount: 1,
        findingCount: 1,
        rejectedInputCount: 0
      }),
      {
        sourceFileCount: 1,
        occurrenceCount: 2,
        targetReadCount: 1,
        findingCount: 1,
        rejectedInputCount: 0
      }
    );
    assert.throws(
      () =>
        defaultCheck.parseData({
          sourceFileCount: 1,
          occurrenceCount: 1,
          targetReadCount: 2,
          findingCount: 0,
          rejectedInputCount: 0
        }),
      /markdownLinkValidation final data/
    );
    assert.equal(
      (await defaultCheck.preflight!(MARKDOWN_LINK_OPTIONS, new AbortController().signal)).status,
      "success"
    );
    for (const options of [
      { ...MARKDOWN_LINK_OPTIONS, limits: { maxMarkdownBytes: 1_048_576, maxOccurrences: 10_000 } },
      {
        ...MARKDOWN_LINK_OPTIONS,
        limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxTargetReads: 10_001 }
      },
      {
        ...MARKDOWN_LINK_OPTIONS,
        files: { excludeDirs: [], generatedFiles: [], include: ["**/*"] }
      },
      { ...MARKDOWN_LINK_OPTIONS, findingPolicy: "not-a-policy" },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: false, directory: cacheDirectory } },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: true } },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: true, directory: "relative-cache" } },
      { ...MARKDOWN_LINK_OPTIONS, cache: { enabled: true, directory: "\0cache" } },
      { ...MARKDOWN_LINK_OPTIONS, unexpected: true }
    ]) {
      assert.equal(validMarkdownLinkValidationOptions(options), false);
    }
    const root = createMarkdownTestRoot("vibe-check-invalid-markdown-link-");
    const invalidDirectOptions = {
      ...MARKDOWN_LINK_OPTIONS,
      limits: { ...MARKDOWN_LINK_OPTIONS.limits }
    };
    Reflect.deleteProperty(invalidDirectOptions.limits, "maxTargetReads");
    try {
      assert.deepEqual(
        (await execute(executeMarkdownLinkValidation, invalidDirectOptions, root, MARKDOWN_FILES))
          .result,
        {
          status: "unavailable",
          reason: { code: "invalid-options" },
          messages: [
            {
              code: "invalid-options",
              level: "error",
              message:
                "markdownLinkValidation options are invalid; recreate the Check with markdownLinkValidation(options) or restore its complete resolved options."
            }
          ]
        }
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

function declarativeFingerprint(check: ReturnType<typeof markdownLinkValidation>): string {
  return createDeclarativeFingerprint(
    normalizeProjectDefinition(defineConfig({ checks: [check] })).declarative
  );
}
