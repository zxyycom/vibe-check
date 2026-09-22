import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { collectMarkdownLinkDiagnostics } from "./links.ts";

test("documentation link validation retains every missing local-link occurrence in stable order", () => {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "vibe-check-doc-links-"));
  try {
    const docsDirectory = path.join(repositoryRoot, "docs");
    mkdirSync(docsDirectory, { recursive: true });
    writeFileSync(
      path.join(docsDirectory, "b.md"),
      "[second](missing-b.md)\n[first](missing-first.md)\n",
      "utf8"
    );
    writeFileSync(
      path.join(docsDirectory, "a.md"),
      "[first](missing-one.md) and [second](missing-two.md)\n",
      "utf8"
    );

    const result = collectMarkdownLinkDiagnostics({
      markdownLinkRoots: ["docs"],
      repositoryRoot
    });

    assert.deepEqual(result, {
      diagnostics: [
        {
          data: {
            kind: "missing-local-link",
            location: { column: 1, line: 1 },
            occurrence: 1,
            sourcePath: "docs/a.md",
            targetPath: "docs/missing-one.md"
          },
          id: "missing-local-link:docs%2Fa.md:1:1:1",
          presentation: "docs/a.md:1:1 missing local Markdown link target: docs/missing-one.md."
        },
        {
          data: {
            kind: "missing-local-link",
            location: { column: 29, line: 1 },
            occurrence: 2,
            sourcePath: "docs/a.md",
            targetPath: "docs/missing-two.md"
          },
          id: "missing-local-link:docs%2Fa.md:1:29:2",
          presentation: "docs/a.md:1:29 missing local Markdown link target: docs/missing-two.md."
        },
        {
          data: {
            kind: "missing-local-link",
            location: { column: 1, line: 1 },
            occurrence: 1,
            sourcePath: "docs/b.md",
            targetPath: "docs/missing-b.md"
          },
          id: "missing-local-link:docs%2Fb.md:1:1:1",
          presentation: "docs/b.md:1:1 missing local Markdown link target: docs/missing-b.md."
        },
        {
          data: {
            kind: "missing-local-link",
            location: { column: 1, line: 2 },
            occurrence: 2,
            sourcePath: "docs/b.md",
            targetPath: "docs/missing-first.md"
          },
          id: "missing-local-link:docs%2Fb.md:2:1:2",
          presentation: "docs/b.md:2:1 missing local Markdown link target: docs/missing-first.md."
        }
      ],
      fileCount: 2
    });
  } finally {
    rmSync(repositoryRoot, { force: true, recursive: true });
  }
});
