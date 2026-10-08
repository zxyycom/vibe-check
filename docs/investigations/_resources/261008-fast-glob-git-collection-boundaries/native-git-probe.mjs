// Research fixture only; not a Product test or permanent Case obligation.
// Run from the repository root with `mise exec -- node <absolute-file-path>`.
// All Git writes stay in one exclusive temporary directory; no remotes are used.
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { devNull, tmpdir } from "node:os";
import { dirname, join } from "node:path";

const temporary = mkdtempSync(join(tmpdir(), "fast-glob-git-boundaries-"));
const root = join(temporary, "root");
const child = join(root, "vendor/tool");
const environment = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: devNull,
  GIT_CONFIG_SYSTEM: devNull,
  GIT_TERMINAL_PROMPT: "0"
};
for (const key of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_CONFIG_COUNT"]) {
  delete environment[key];
}
const observations = [];
const normalize = (text) => text.split(temporary).join("<fixture>");

function git(repository, args, required = true) {
  const result = spawnSync("git", args, { cwd: repository, env: environment, encoding: "utf8" });
  if (required) assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}

function file(repository, name, content = "fixture\n") {
  const target = join(repository, name);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function initialize(repository) {
  mkdirSync(repository, { recursive: true });
  git(repository, ["init", "--quiet"]);
  git(repository, ["config", "user.name", "Investigation Fixture"]);
  git(repository, ["config", "user.email", "fixture@example.invalid"]);
  git(repository, ["config", "commit.gpgsign", "false"]);
  git(repository, ["config", "core.hooksPath", devNull]);
}

function observe(name, repository, args) {
  const result = git(repository, args, false);
  const paths = result.stdout.split("\0").filter(Boolean).sort();
  observations.push({ name, repository: normalize(repository), args, status: result.status,
    paths, stderr: normalize(result.stderr.trim()) });
  return { status: result.status, paths };
}

let output;
try {
  initialize(root);
  initialize(child);
  file(child, "src/tracked.ts");
  file(child, ".gitignore", "src/ignored.ts\n");
  git(child, ["add", "--", "src/tracked.ts", ".gitignore"]);
  git(child, ["commit", "--quiet", "-m", "child fixture"]);
  const childHead = git(child, ["rev-parse", "HEAD"]).stdout.trim();
  file(child, "src/untracked.ts");
  file(child, "src/ignored.ts");

  file(root, "src/tracked.ts");
  file(root, "src/component.tsx");
  file(root, ".gitmodules", '[submodule "tool"]\n\tpath = vendor/tool\n\turl = ./tool\n');
  git(root, ["add", "--", "src/tracked.ts", "src/component.tsx", ".gitmodules"]);
  git(root, ["update-index", "--add", "--cacheinfo", `160000,${childHead},vendor/tool`]);
  git(root, ["config", "submodule.tool.url", "./tool"]);
  git(root, ["commit", "--quiet", "-m", "root fixture"]);
  file(root, ".gitignore", "src/ignored.ts\nsrc/tracked.ts\n");
  file(root, ".git/info/exclude", "src/info-excluded.ts\n");
  file(temporary, "global-excludes", "src/global-excluded.ts\n");
  git(root, ["config", "core.excludesFile", join(temporary, "global-excludes")]);
  for (const name of ["src/untracked.ts", "src/ignored.ts", "src/info-excluded.ts",
    "src/global-excluded.ts", ".visible.ts", "src/line\nbreak.ts"]) file(root, name);

  const base = ["ls-files", "-z", "--cached", "--others", "--exclude-standard"];
  const union = observe("native-root-union", root, [...base, "--"]);
  assert.equal(union.status, 0);
  assert(union.paths.includes("src/tracked.ts"));
  assert(union.paths.includes("src/untracked.ts"));
  assert(union.paths.includes("src/line\nbreak.ts"));
  assert(!union.paths.includes("src/ignored.ts"));
  assert(!union.paths.includes("src/info-excluded.ts"));
  assert(!union.paths.includes("src/global-excluded.ts"));
  assert(union.paths.includes("vendor/tool"));
  assert(!union.paths.includes("vendor/tool/src/tracked.ts"));

  const recurse = observe("native-cached-recursion", root,
    ["ls-files", "-z", "--cached", "--recurse-submodules", "--"]);
  assert.equal(recurse.status, 0);
  assert(recurse.paths.includes("vendor/tool/src/tracked.ts"));
  assert(!recurse.paths.includes("vendor/tool/src/untracked.ts"));
  const unsupported = observe("native-union-recursion-rejected", root,
    [...base, "--recurse-submodules", "--"]);
  assert.equal(unsupported.status, 128);

  const ownChild = observe("native-child-union", child, [...base, "--"]);
  assert(ownChild.paths.includes("src/untracked.ts"));
  assert(!ownChild.paths.includes("src/ignored.ts"));
  const x = observe("native-exclude-does-not-remove-tracked", root,
    [...base, "--exclude=src/tracked.ts", "--"]);
  assert(x.paths.includes("src/tracked.ts"));
  const pathspecExclude = observe("native-pathspec-can-remove-tracked", root,
    [...base, "--", ":(top,exclude,literal)src/tracked.ts"]);
  assert(!pathspecExclude.paths.includes("src/tracked.ts"));
  const brace = observe("native-glob-does-not-expand-product-braces", root,
    [...base, "--", ":(glob)src/**/*.{ts,tsx}"]);
  assert.deepEqual(brace.paths, []);
  const separate = observe("native-glob-separate-patterns", root,
    [...base, "--", ":(glob)src/**/*.ts", ":(glob)src/**/*.tsx"]);
  assert(separate.paths.includes("src/component.tsx"));
  assert(separate.paths.includes("src/tracked.ts"));
  output = { acquiredAt: new Date().toISOString(), platform: process.platform,
    runtime: process.versions, gitVersion: git(root, ["--version"]).stdout.trim(),
    scope: "isolated native Git fixture; no fast-glob installation or execution", observations };
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
assert.equal(existsSync(temporary), false);
output.temporaryFixtureRemoved = true;
console.log(JSON.stringify(output, null, 2));
