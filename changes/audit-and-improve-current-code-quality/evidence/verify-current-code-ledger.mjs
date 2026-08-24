#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = scriptDirectory;
const scopePath = resolve(evidenceDirectory, "code-scope.json");
const defaultManifestPath = resolve(evidenceDirectory, "current-code-manifest.json");
const defaultLedgerPath = resolve(evidenceDirectory, "review-ledger.json");
const codeCandidateExtensions = new Set();

function fail(message) {
  throw new Error(message);
}

function readJson(path, label) {
  let source;
  try {
    source = readFileSync(path, "utf8");
  } catch (error) {
    fail(`Cannot read ${label} at ${path}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`Cannot parse ${label} at ${path}: ${error.message}`);
  }
}

function parseArguments(argv) {
  const [command, ...rest] = argv;
  if (command !== "snapshot" && command !== "check") {
    fail(
      "Usage: verify-current-code-ledger.mjs <snapshot|check> --root <directory> [--write] [--manifest <path>] [--ledger <path>]"
    );
  }

  const options = {
    command,
    root: null,
    write: false,
    manifest: defaultManifestPath,
    ledger: defaultLedgerPath
  };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--write") {
      options.write = true;
      continue;
    }
    if (argument === "--root" || argument === "--manifest" || argument === "--ledger") {
      const value = rest[index + 1];
      if (!value || value.startsWith("--")) fail(`Missing value after ${argument}.`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    fail(`Unknown argument: ${argument}`);
  }
  if (!options.root) fail("Missing required --root <directory>.");
  if (options.command === "check" && options.write)
    fail("--write is only valid with snapshot; check never writes evidence.");
  return options;
}

function comparePaths(left, right) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right));
}

function pathInsideRoot(root, path) {
  const pathRelativeToRoot = relative(root, path);
  return (
    pathRelativeToRoot === "" ||
    (!pathRelativeToRoot.startsWith("..") && !isAbsolute(pathRelativeToRoot))
  );
}

function globToRegExp(glob) {
  let expression = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index];
    if (character === "*") {
      if (glob[index + 1] === "*") {
        index += 1;
        if (glob[index + 1] === "/") {
          index += 1;
          expression += "(?:.*/)?";
        } else {
          expression += ".*";
        }
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`);
}

function matchesEntry(entry, path) {
  const includesPath =
    entry.path === path || (entry.glob !== undefined && globToRegExp(entry.glob).test(path));
  if (!includesPath) return false;
  return !(entry.excludeGlobs ?? []).some((glob) => globToRegExp(glob).test(path));
}

function listGitPaths(root, args) {
  let output;
  try {
    output = execFileSync("git", args, {
      cwd: root,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const stderr = error.stderr?.toString("utf8").trim();
    fail(`Git discovery failed (${["git", ...args].join(" ")}): ${stderr || error.message}`);
  }
  return output.toString("utf8").split("\0").filter(Boolean);
}

function sourceStateByPath(root) {
  const states = new Map();
  for (const path of listGitPaths(root, ["ls-files", "-z"])) states.set(path, "tracked");
  for (const path of listGitPaths(root, ["ls-files", "-o", "--exclude-standard", "-z"])) {
    if (!states.has(path)) states.set(path, "untracked");
  }
  return states;
}

function extensionCandidate(path) {
  return [...codeCandidateExtensions].some((extension) => path.endsWith(extension));
}

function discovery(root, scope) {
  const sourceStates = sourceStateByPath(root);
  const entries = [];
  const tombstones = [];
  const unknownCandidates = [];
  const symlinks = [];

  for (const [path, sourceState] of sourceStates) {
    if (path.includes("\\") || path.startsWith("/") || path.split("/").includes("..")) {
      fail(`Git returned an unsafe non-relative path: ${JSON.stringify(path)}`);
    }
    if (scope.exclusionMatchers.some((matcher) => matcher.test(path))) continue;

    const matchingSelectors = scope.selectors.filter((entry) => matchesEntry(entry, path));
    if (matchingSelectors.length > 1) fail(`Scope has overlapping selectors for ${path}.`);
    const filesystemPath = resolve(root, path);
    if (!pathInsideRoot(root, filesystemPath)) fail(`Candidate resolves outside --root: ${path}`);

    let stat;
    try {
      stat = lstatSync(filesystemPath);
    } catch (error) {
      if (error.code === "ENOENT" && sourceState === "tracked" && matchingSelectors.length === 1) {
        const selector = matchingSelectors[0];
        tombstones.push({
          path,
          kind: selector.kind,
          role: selector.role,
          sourceState: "tracked-missing",
          mode: null,
          sha256: null
        });
        continue;
      }
      if (error.code === "ENOENT" && sourceState === "tracked") {
        if (extensionCandidate(path)) unknownCandidates.push(path);
        continue;
      }
      fail(`Cannot lstat ${path}: ${error.message}`);
    }

    if (stat.isSymbolicLink()) {
      if (matchingSelectors.length > 0 || extensionCandidate(path) || stat.mode & 0o111)
        symlinks.push(path);
      continue;
    }
    if (!stat.isFile()) {
      if (matchingSelectors.length > 0) fail(`Scoped path is not a regular file: ${path}`);
      continue;
    }

    const isCandidate =
      extensionCandidate(path) ||
      (scope.candidateGuard.unixExecutableRegularFile && (stat.mode & 0o111) !== 0);
    if (matchingSelectors.length === 0) {
      if (isCandidate) unknownCandidates.push(path);
      continue;
    }

    const selector = matchingSelectors[0];
    entries.push({
      path,
      kind: selector.kind,
      role: selector.role,
      sourceState,
      mode: (stat.mode & 0o777).toString(8).padStart(4, "0"),
      sha256: createHash("sha256").update(readFileSync(filesystemPath)).digest("hex")
    });
  }

  if (symlinks.length > 0)
    fail(
      `Symlink candidate(s) are not allowed: ${symlinks.sort(comparePaths).join(", ")}. Replace them with regular files or update the Change scope explicitly.`
    );
  if (unknownCandidates.length > 0)
    fail(
      `Unknown code candidate(s): ${unknownCandidates.sort(comparePaths).join(", ")}. Classify each in evidence/code-scope.json; candidates are never skipped.`
    );

  entries.sort((left, right) => comparePaths(left.path, right.path));
  tombstones.sort((left, right) => comparePaths(left.path, right.path));
  return { entries, tombstones };
}

function asScope() {
  const scope = readJson(scopePath, "scope");
  if (
    scope.format !== "v1" ||
    !Array.isArray(scope.selectors) ||
    !Array.isArray(scope.exclusions) ||
    !scope.candidateGuard
  ) {
    fail(
      "Invalid evidence/code-scope.json: expected v1 selectors, exclusions, and candidateGuard."
    );
  }
  for (const extension of scope.candidateGuard.codeExtensions ?? [])
    codeCandidateExtensions.add(extension);
  return { ...scope, exclusionMatchers: scope.exclusions.map(globToRegExp) };
}

function manifestFrom(discovered) {
  const summary = {};
  for (const entry of discovered.entries) summary[entry.kind] = (summary[entry.kind] ?? 0) + 1;
  return {
    format: "v1",
    scope: "evidence/code-scope.json",
    entries: discovered.entries,
    tombstones: discovered.tombstones,
    summary
  };
}

function stableDiscover(root, scope) {
  const first = discovery(root, scope);
  const second = discovery(root, scope);
  const firstJson = JSON.stringify(first);
  if (firstJson !== JSON.stringify(second))
    fail(
      "unstable-worktree: two consecutive discoveries differ; stop concurrent writes and retry."
    );
  return first;
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "")
    fail(`Invalid ledger entry: ${label} must be a non-empty string.`);
}

function validateLedgerEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry))
    fail("Invalid ledger entry: expected an object.");
  for (const field of [
    "path",
    "kind",
    "role",
    "ownerRef",
    "reviewLevel",
    "disposition",
    "primaryReviewer",
    "responsibility",
    "rationale"
  ])
    requireText(entry[field], field);
  if (typeof entry.sha256 !== "string" && entry.sha256 !== null)
    fail(`Invalid ledger entry ${entry.path}: sha256 must be a string or null for a tombstone.`);
  if (!Array.isArray(entry.riskSignals))
    fail("Invalid ledger entry: riskSignals must be an array.");
  if (!["lightweight", "focused", "deep"].includes(entry.reviewLevel))
    fail(`Invalid ledger entry ${entry.path}: unknown reviewLevel.`);
  if (
    ![
      "modified",
      "no-change-with-rationale",
      "deferred",
      "removed",
      "derived-reviewed",
      "blocked"
    ].includes(entry.disposition)
  )
    fail(`Invalid ledger entry ${entry.path}: unknown disposition.`);
  if (entry.disposition === "blocked")
    fail(`Invalid ledger entry ${entry.path}: blocked disposition cannot pass final check.`);
  if (entry.findings !== undefined && !Array.isArray(entry.findings))
    fail(`Invalid ledger entry ${entry.path}: findings must be an array.`);
  const findings = entry.findings ?? [];
  let hasMaterialFinding = false;
  let hasDeferredFinding = false;
  for (const finding of findings) {
    if (!finding || typeof finding !== "object" || Array.isArray(finding))
      fail(`Invalid ledger entry ${entry.path}: finding must be an object.`);
    for (const field of [
      "id",
      "severity",
      "status",
      "resolution",
      "ruleOrOwnerRef",
      "fileLine",
      "riskMechanism"
    ])
      requireText(finding[field], `${entry.path}.findings[].${field}`);
    if (!["S0", "S1", "S2", "S3"].includes(finding.severity))
      fail(`Invalid finding ${finding.id} in ${entry.path}: unknown severity.`);
    if (!["resolved", "deferred"].includes(finding.status))
      fail(`Invalid finding ${finding.id} in ${entry.path}: status must be resolved or deferred.`);
    if (["S0", "S1"].includes(finding.severity) && finding.status !== "resolved")
      fail(`${finding.severity} finding ${finding.id} in ${entry.path} must be resolved.`);
    if (["S0", "S1", "S2"].includes(finding.severity)) hasMaterialFinding = true;
    if (finding.status === "deferred") hasDeferredFinding = true;
  }
  const needsIndependentReview =
    entry.disposition === "modified" ||
    entry.disposition === "removed" ||
    entry.disposition === "deferred" ||
    hasMaterialFinding ||
    hasDeferredFinding;
  if (needsIndependentReview) {
    requireText(entry.independentReviewer, `${entry.path}.independentReviewer`);
    requireText(entry.reviewerDecision, `${entry.path}.reviewerDecision`);
  }
  if (entry.disposition === "modified" || entry.disposition === "removed") {
    for (const field of ["changeSummary", "semanticEvidence", "verification"])
      requireText(entry[field], `${entry.path}.${field}`);
  }
  if (entry.disposition === "deferred" || hasDeferredFinding) {
    for (const field of ["route", "currentDeferralReason"])
      requireText(entry[field], `${entry.path}.${field}`);
  }
  if (entry.disposition === "no-change-with-rationale" || entry.disposition === "derived-reviewed")
    requireText(entry.coverageReviewBatch, `${entry.path}.coverageReviewBatch`);
}

function validateManifest(manifest, fresh) {
  if (
    !manifest ||
    manifest.format !== "v1" ||
    !Array.isArray(manifest.entries) ||
    !Array.isArray(manifest.tombstones)
  ) {
    fail("Invalid manifest: expected v1 entries and tombstones.");
  }
  const expected = manifestFrom(fresh);
  if (
    JSON.stringify({ entries: manifest.entries, tombstones: manifest.tombstones }) !==
    JSON.stringify({ entries: expected.entries, tombstones: expected.tombstones })
  ) {
    fail(
      "Manifest is stale or does not match fresh discovery. Run snapshot --root . --write after resolving scope errors."
    );
  }
}

function checkClosure(manifest, ledger) {
  if (!ledger || ledger.format !== "v1" || !Array.isArray(ledger.entries))
    fail("Invalid ledger: expected v1 entries array.");
  const manifestEntries = [...manifest.entries, ...manifest.tombstones];
  const manifestKeys = new Set();
  for (const entry of manifestEntries) {
    const key = `${entry.path}\u0000${entry.kind}\u0000${entry.role}\u0000${entry.sha256}`;
    if (manifestKeys.has(key)) fail(`Duplicate manifest entry: ${entry.path}.`);
    manifestKeys.add(key);
  }
  const ledgerKeys = new Set();
  for (const entry of ledger.entries) {
    validateLedgerEntry(entry);
    const manifestEntry = manifestEntries.find((candidate) => candidate.path === entry.path);
    if (!manifestEntry) fail(`Ledger entry is outside manifest: ${entry.path}.`);
    const key = `${entry.path}\u0000${entry.kind}\u0000${entry.role}\u0000${entry.sha256}`;
    if (!manifestKeys.has(key)) fail(`Ledger entry is stale or misclassified: ${entry.path}.`);
    if (ledgerKeys.has(key)) fail(`Duplicate ledger entry: ${entry.path}.`);
    ledgerKeys.add(key);
    if (manifestEntry.sourceState === "tracked-missing" && entry.disposition !== "removed")
      fail(`Tracked-missing path ${entry.path} requires removed disposition.`);
  }
  for (const key of manifestKeys)
    if (!ledgerKeys.has(key))
      fail(`Manifest entry has no closed ledger entry: ${key.split("\u0000")[0]}.`);
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = realpathSync(resolve(options.root));
  const scope = asScope();
  const fresh = stableDiscover(root, scope);
  const manifest = manifestFrom(fresh);

  if (options.command === "snapshot") {
    const json = `${JSON.stringify(manifest, null, 2)}\n`;
    if (options.write) {
      const manifestPath = resolve(root, options.manifest);
      if (!pathInsideRoot(root, manifestPath)) fail("--manifest must resolve inside --root.");
      writeFileSync(manifestPath, json);
    }
    process.stdout.write(json);
    return;
  }

  const manifestPath = resolve(root, options.manifest);
  const ledgerPath = resolve(root, options.ledger);
  if (!pathInsideRoot(root, manifestPath)) fail("--manifest must resolve inside --root.");
  if (!pathInsideRoot(root, ledgerPath)) fail("--ledger must resolve inside --root.");
  const recordedManifest = readJson(manifestPath, "manifest");
  const ledger = readJson(ledgerPath, "ledger");
  validateManifest(recordedManifest, fresh);
  checkClosure(recordedManifest, ledger);
  process.stdout.write(
    `${JSON.stringify({ ok: true, entries: recordedManifest.entries.length, tombstones: recordedManifest.tombstones.length })}\n`
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`verify-current-code-ledger: ${error.message}\n`);
  process.exitCode = 1;
}
