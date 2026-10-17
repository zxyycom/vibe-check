/** Product-owned public-API measurement entry; bundle before editing runtime, run under Node. */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { collectProjectFiles, defineConfig, markdownLinkValidation, run } from "../../index.ts";

import { parseMarkdownLinkFacts } from "./markdown-parser.ts";
import { parseLocalDestination } from "./local-resolution.ts";

const REAL_PATTERNS = [
  "docs/**/*.md",
  "changes/**/*.md",
  ...[
    ".git",
    "archive",
    "target",
    "node_modules",
    ".venv",
    ".uv-cache",
    ".ruff_cache",
    "dist",
    "build",
    "vendor",
    "generated",
    "fixtures",
    ".cache",
    "cache",
    "artifacts",
    ".tmp",
    ".log"
  ].map((directory) => `!**/${directory}/**`)
];

const [archive = "", shape = "hot", countText = "1000", depthText = "3", cacheState = "off"] =
  process.argv.slice(2);
async function measure(): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), "markdown-link-measurement-"));
  try {
    const count = Number(countText);
    const depth = Number(depthText);
    let patterns: string[];
    if (shape === "freeze") {
      const selected = collectProjectFiles({
        projectRoot: process.cwd(),
        selection: { patterns: REAL_PATTERNS }
      });
      const files = new Set(selected);
      const directories = new Set<string>();
      for (const source of selected) {
        const parsed = parseMarkdownLinkFacts(readFileSync(source, "utf8"));
        if (!parsed.ok) throw new Error(`Cannot freeze ${source}`);
        for (const occurrence of parsed.facts.occurrences) {
          const destination = parseLocalDestination(occurrence.rawDestination);
          if (
            destination === null ||
            destination === "not-local" ||
            destination.isAbsolute ||
            destination.path === ""
          )
            continue;
          const target = path.resolve(path.dirname(source), destination.path);
          if (!target.startsWith(process.cwd() + path.sep)) continue;
          try {
            if (statSync(target).isDirectory())
              directories.add(path.relative(process.cwd(), target));
            else files.add(path.relative(process.cwd(), target));
          } catch {
            /* Missing observations are reproduced by absence. */
          }
        }
      }
      for (const file of files) {
        const target = path.join(root, file);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(file));
      }
      for (const directory of directories)
        mkdirSync(path.join(root, directory), { recursive: true });
      execFileSync("tar", ["-czf", archive, "-C", root, "."]);
      process.stdout.write(
        JSON.stringify({
          sources: selected.length,
          files: files.size,
          directories: directories.size
        }) + "\n"
      );
      return;
    } else if (shape === "real") {
      execFileSync("tar", ["-xzf", archive, "-C", root]);
      patterns = REAL_PATTERNS;
    } else if (["source", "missing", "directory", "existence", "aliases"].includes(shape)) {
      patterns = observationFixture(root, shape, count);
    } else {
      const directory = Array.from({ length: depth }, () => "d").join("/");
      mkdirSync(path.join(root, directory), { recursive: true });
      const references: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const target = `${directory}/${shape === "hot" ? "hot" : index}.md`;
        if (shape !== "hot" || index === 0) writeFileSync(path.join(root, target), "# Target\n");
        references.push(`[link](${target}#target)`);
      }
      writeFileSync(path.join(root, "source.md"), references.join("\n"));
      patterns = ["source.md"];
    }
    const check = markdownLinkValidation({
      files: { patterns },
      findingPolicy: "blocking",
      requireExistingTargets: shape !== "missing",
      requireNonEmptyDirectories: shape === "directory",
      limits: { maxOccurrences: 100_000, maxTargetReads: 10_000 },
      cache:
        cacheState === "off"
          ? { enabled: false }
          : { enabled: true, directory: path.join(root, ".parse-cache") }
    });
    const config = defineConfig({
      checks: [check],
      outputs: {
        machinePublication: { enabled: false },
        progressRendering: { enabled: false }
      }
    });
    if (cacheState === "hit") await run(config, { projectRoot: root });
    const started = performance.now();
    const result = await run(config, { projectRoot: root });
    const elapsedMs = performance.now() - started;
    if (result.kind !== "completed") throw new Error(`Incomplete measurement: ${result.kind}`);
    const outcome = result.snapshot.checks.find(
      ({ checkId }) => checkId === check.checkId
    )?.outcome;
    if (outcome?.status !== "passed") throw new Error(JSON.stringify(outcome));
    process.stdout.write(
      JSON.stringify({
        shape,
        count,
        depth,
        cacheState,
        elapsedMs,
        maxRssKiB: process.resourceUsage().maxRSS,
        outcome
      }) + "\n"
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
function observationFixture(root: string, fixtureShape: string, count: number): string[] {
  let destination = "target.md#target";
  if (fixtureShape === "source")
    writeFileSync(path.join(root, "target.md"), "# Target\n[back](source.md#source)\n");
  if (fixtureShape === "directory") {
    destination = "directory";
    mkdirSync(path.join(root, destination));
    writeFileSync(path.join(root, destination, "entry"), "present");
  }
  if (fixtureShape === "existence") {
    destination = "target.md";
    writeFileSync(path.join(root, destination), new Uint8Array([255]));
  }
  if (fixtureShape === "aliases") {
    writeFileSync(path.join(root, "target.md"), "# Target\n");
    symlinkSync("target.md", path.join(root, "a.md"));
    symlinkSync("target.md", path.join(root, "b.md"));
  }
  const references = Array.from({ length: count }, (_, index) => {
    const target =
      fixtureShape === "aliases" ? `${index % 2 === 0 ? "a" : "b"}.md#target` : destination;
    return `[link](${target})`;
  });
  writeFileSync(path.join(root, "source.md"), "# Source\n" + references.join("\n"));
  return fixtureShape === "source" ? ["*.md"] : ["source.md"];
}
await measure();
