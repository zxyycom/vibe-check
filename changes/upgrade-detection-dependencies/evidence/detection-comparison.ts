import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCsvRows } from "../../../src/package-checks/host-environment/csv.ts";
import {
  parseSccCSV,
  SCC_BY_FILE_CSV_HEADER
} from "../../../src/package-checks/file-metrics/scc/parser.ts";
import { lintMarkdownString } from "../../../src/package-checks/markdown-lint/adapter.ts";
import {
  MARKDOWN_LINT_RULE_NAMES,
  type MarkdownLintRuleName
} from "../../../src/package-checks/markdown-lint/options.ts";
import { scanWithJscpd } from "../../../src/package-checks/duplicate-detection/jscpd/scanner.ts";
import { checkJscpd } from "../../../src/package-checks/duplicate-detection/jscpd/availability.ts";
import { lintMarkdownWithCache } from "../../../src/package-checks/markdown-lint/findings-cache.ts";
// Change-local rerun harness: remove with this Change, not a maintained scanner entrypoint.
// Each invocation owns fresh scratch state; retained JSON captures the historical upgrade runs.
const markdown = {
  catalog:
    "# One\n### Three\n(Incorrect link syntax)[https://example.test/]\n#missing\n```\ncode\n```\n[empty]()\n![](image.png)\n[missing](#absent)\n[missing][definition]\n| A | B |\n| - | - |\n| one |\n",
  reversed:
    "(alpha)[https://example.test/] (beta)[#local]\n\\(escaped)[target]\n`(code)[target]`\n![image](image.png)\n[good](target)\n",
  headings: "#missing\n###missing###\n\\#escaped\n## title #\n<h1>html</h1>\n",
  fragments:
    '# Present\n# Café\n# A `code` heading\n[ok](#present) [bad](#Present) [unicode](#café) [encoded](#caf%C3%A9) [code](#a-code-heading)\n<a id="custom"></a>\n[custom](#custom)\n',
  yaml: "---\ntitle: Document\n---\n<!-- markdownlint-disable MD018 -->\n#missing\n",
  toml: '+++\ntitle = "Document"\n+++\n#missing\n',
  json: '{\n"title": "Document"\n}\n#missing\n',
  malformedFrontMatter: "---\ntitle: [unterminated\n---\n#missing\n",
  fences:
    "---\ntitle: Document\n---\n```markdown\n---\ntitle: Embedded\n---\n#missing\n```\n# Final\n"
};
const duplicateSources = {
  ts: "export function duplicate(value: number): number {\n  const values = [1, 2, 3, 4, 5];\n  let sum = value;\n  for (const item of values) {\n    sum += item * 2;\n  }\n  return sum;\n}\n",
  "recoverable.ts":
    "const invalid = ;\nexport function duplicate(value: number): number {\n  const values = [1, 2, 3, 4, 5];\n  let sum = value;\n  for (const item of values) {\n    sum += item * 2;\n  }\n  return sum;\n}\n",
  md: "# Example\n\nVisit https://example.test/path and retain /* literal Markdown text.\nThis is a repeated prose sentence with enough tokens for comparison.\nThe next line belongs to the same repeated prose block.\nAnother repeated line ends the block correctly.\n",
  vue: '<template>\n  <div class="wrapper">\n    <span v-for="item in items" :key="item.id">{{ item.name }}</span>\n    <button @click="submit">Submit now</button>\n  </div>\n</template>\n<script setup>\nconst items = [{ id: 1, name: "alpha" }];\nfunction submit() { console.log(items); }\n</script>\n',
  json: '{\n  "project": "example",\n  "entries": [1, 2, 3, 4],\n  "settings": { "enabled": true, "value": 123 },\n  "description": "identical structured JSON content"\n}\n',
  "fence.md":
    "---\ntitle: Frozen Markdown\n---\n```typescript\nexport function duplicate(value: number): number {\n  const values = [1, 2, 3, 4, 5];\n  let sum = value;\n  for (const item of values) {\n    sum += item * 2;\n  }\n  return sum;\n}\n```\n"
};
const csv = {
  quoted:
    '\ufeffLanguage,Provider,Name\r\nTypeScript,"src/a,b.ts","a""b.ts"\r\n\r\nRust,"src/multi\nline.rs",name\r\n',
  relaxed: " alpha , beta \n one\n two,three,four\n",
  prototypeNames: "__proto__,constructor,prototype\nalpha,beta,gamma\n"
};

const scratchDirectory = mkdtempSync(join(tmpdir(), "vibe-check-detection-comparison-"));
try {
  const markdownResults: Record<string, Awaited<ReturnType<typeof lintMarkdownString>>> = {};
  for (const [name, sourceText] of Object.entries(markdown)) {
    markdownResults[name] = await lintMarkdownString(
      `${name}.md`,
      sourceText,
      MARKDOWN_LINT_RULE_NAMES
    );
  }

  const duplicates: Record<string, ReturnType<typeof scanWithJscpd>> = {};
  for (const [name, sourceText] of Object.entries(duplicateSources)) {
    const corpusDirectory = join(scratchDirectory, "corpus", name);
    mkdirSync(corpusDirectory, { recursive: true });
    const extension = name.slice(name.lastIndexOf(".") + 1);
    for (const basename of ["a", "b", "unapproved"]) {
      writeFileSync(join(corpusDirectory, `${basename}.${extension}`), sourceText);
    }
    duplicates[name] = scanWithJscpd({
      cwd: corpusDirectory,
      files: [`a.${extension}`, `b.${extension}`],
      dependency: { command: { kind: "package" } },
      minimumLines: 3,
      minimumTokens: 20
    });
  }
  const mixedCorpusDirectory = join(scratchDirectory, "corpus", "mixed-recovery");
  mkdirSync(mixedCorpusDirectory, { recursive: true });
  writeFileSync(join(mixedCorpusDirectory, "clean.ts"), duplicateSources.ts);
  writeFileSync(
    join(mixedCorpusDirectory, "recovered.ts"),
    `const invalid = ;\n${duplicateSources.ts}`
  );
  duplicates["mixed-recovery"] = scanWithJscpd({
    cwd: mixedCorpusDirectory,
    files: ["clean.ts", "recovered.ts"],
    dependency: { command: { kind: "package" } },
    minimumLines: 3,
    minimumTokens: 20
  });

  const csvResults = Object.fromEntries(
    Object.entries(csv).map(([name, sourceText]) => [name, parseCsvRows(sourceText)])
  );
  // /repo is the fixed synthetic SCC project root, not a host filesystem input.
  const scc = parseSccCSV(
    `\ufeff${SCC_BY_FILE_CSV_HEADER}\r\nTypeScript,"src/a,b.ts","a,b.ts",12,8,2,2,1,256,8\r\n\r\n`,
    "/repo"
  );
  const cacheInput = {
    sourcePath: "cached.md",
    sourceText: "#missing\n",
    rules: ["no-missing-space-atx"] satisfies readonly MarkdownLintRuleName[],
    cache: { enabled: true, directory: join(scratchDirectory, "markdown-cache") },
    signal: new AbortController().signal
  };
  const cacheFirst = await lintMarkdownWithCache(cacheInput);
  const cacheSecond = await lintMarkdownWithCache(cacheInput);
  const availability = await checkJscpd(scratchDirectory, { command: { kind: "package" } });
  console.log(
    JSON.stringify(
      { markdown: markdownResults, duplicates, csv: csvResults, scc, cacheFirst, cacheSecond },
      null,
      2
    )
  );
  console.error(JSON.stringify(availability));
} finally {
  rmSync(scratchDirectory, { force: true, recursive: true });
}
