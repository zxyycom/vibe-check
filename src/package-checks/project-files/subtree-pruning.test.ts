import assert from "node:assert/strict";
import fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import micromatch from "micromatch";

import { createCollectionFilesystem } from "./filesystem-collection.ts";
import { write } from "./collection.test-support.ts";

describe("quality input file collection", () => {
  it("reuses pure subtree decisions only within one collection operation", () => {
    const root = fs.mkdtempSync(join(tmpdir(), "collection-prefix-memo-"));
    const matcherDescriptor = Object.getOwnPropertyDescriptor(micromatch, "matcher");
    assert.ok(matcherDescriptor);
    const originalMatcher = micromatch.matcher.bind(micromatch);
    const evaluations: { pattern: string; prefixes: string[] }[] = [];
    const policies = [
      { patterns: ["**/*", "!memo/outer/**"], useDefaultExcludes: false },
      {
        patterns: ["**/*", "!memo/outer/deep/**", "!memo/outer/sibling/**"],
        useDefaultExcludes: false
      }
    ];
    try {
      for (const file of ["memo/outer/deep/a.ts", "memo/outer/sibling/b.ts", "memo/open/c.ts"])
        write(root, file);
      Reflect.set(micromatch, "matcher", (pattern: string, options: micromatch.Options) => {
        const matches = originalMatcher(pattern, options);
        const prefixes: string[] = [];
        evaluations.push({ pattern, prefixes });
        return (prefix: string) => {
          prefixes.push(prefix);
          return matches(prefix);
        };
      });
      const filesystem = createCollectionFilesystem(root, policies);
      const inspect = (adapter: typeof filesystem): void => {
        assert.deepEqual(adapter.readdirSync?.(join(root, "memo/outer/deep")), []);
        assert.deepEqual(adapter.readdirSync?.(join(root, "memo/outer/sibling")), []);
        assert.equal(adapter.lstatSync?.(join(root, "memo/open")).isDirectory(), true);
      };
      inspect(filesystem);
      assert.deepEqual(evaluations, [
        {
          pattern: "memo/outer",
          prefixes: ["memo", "memo/outer", "memo/open"]
        },
        {
          pattern: "memo/outer/deep",
          prefixes: ["memo", "memo/outer", "memo/outer/deep", "memo/outer/sibling"]
        },
        { pattern: "memo/outer/sibling", prefixes: ["memo", "memo/outer", "memo/outer/sibling"] }
      ]);
      const firstOperation = structuredClone(evaluations);
      inspect(filesystem);
      assert.deepEqual(evaluations, firstOperation);

      const nextFilesystem = createCollectionFilesystem(root, policies);
      inspect(nextFilesystem);
      assert.deepEqual(evaluations.slice(firstOperation.length), firstOperation);
      write(root, "memo/open/new.ts");
      assert.deepEqual(
        createCollectionFilesystem(root, policies).readdirSync?.(join(root, "memo/open")),
        ["c.ts", "new.ts"]
      );
    } finally {
      Object.defineProperty(micromatch, "matcher", matcherDescriptor);
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
