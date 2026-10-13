import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const root = "/workspace/vibe-check";
const work = `${root}/tmp/optimization-20261012/tokenizer`;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sourceFiles = readSourceManifest(`${work}/copy-manifest.json`);
const corpus = readCorpusManifest(`${work}/corpus-manifest.json`);
cpSync(`${work}/candidate`, `${work}/baseline`, { recursive: true });
const altered = ["shared/code-reader.ts", "readers/typescript.ts", "readers/tsx.ts"].map(
  (p) => "src/package-checks/function-metrics/analyzer/" + p
);
for (const file of sourceFiles) {
  const bytes = readFileSync(
    `${altered.includes(file.path) ? root : `${work}/baseline`}/${file.path}`
  );
  if (hash(bytes) !== file.sha256) throw new Error(`snapshot drift ${file.path}`);
  if (altered.includes(file.path)) writeFileSync(`${work}/baseline/${file.path}`, bytes);
}

const provenance = [];
for (const file of corpus) {
  const clone = `${work}/baseline/${file.path}`;
  const path = existsSync(clone) ? clone : `${root}/${file.path}`;
  const bytes = readFileSync(path);
  if (hash(bytes) !== file.sha256) throw new Error(`input drift ${file.path}`);
  const target = `${work}/frozen-input/${file.path}`;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  provenance.push({
    path: file.path,
    from: existsSync(clone)
      ? "Phase-A-production-copy"
      : "unchanged-live-file-verified-against-Phase-A-hash"
  });
}
writeFileSync(`${work}/frozen-input-provenance.json`, JSON.stringify(provenance, null, 2) + "\n");
console.log(JSON.stringify({ sourceModules: sourceFiles.length, frozenInputFiles: corpus.length }));

function readEvidenceJson(sourcePath) {
  try {
    return JSON.parse(readFileSync(sourcePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read evidence JSON ${sourcePath}`, { cause: error });
  }
}
function decodeSnapshotEntries(decoded, sourcePath, requireBytes) {
  if (!Array.isArray(decoded)) throw new Error(`${sourcePath}: expected entries array`);
  return decoded.map((entry, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      typeof entry.path !== "string" ||
      !entry.path ||
      entry.path.startsWith("/") ||
      entry.path.includes("\\") ||
      entry.path.split("/").some((part) => !part || part === "." || part === "..") ||
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    ) {
      throw new Error(`${sourcePath}[${index}]: expected contained relative path and SHA-256`);
    }
    if (requireBytes && (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0)) {
      throw new Error(`${sourcePath}[${index}].bytes: expected nonnegative safe integer`);
    }
    return {
      path: entry.path,
      sha256: entry.sha256,
      ...(requireBytes ? { bytes: entry.bytes } : {})
    };
  });
}
function readSourceManifest(sourcePath) {
  const decoded = readEvidenceJson(sourcePath);
  if (typeof decoded !== "object" || decoded === null || !Array.isArray(decoded.sourceFiles)) {
    throw new Error(`${sourcePath}: expected sourceFiles array`);
  }
  return decodeSnapshotEntries(decoded.sourceFiles, sourcePath + ".sourceFiles", false);
}
function readCorpusManifest(sourcePath) {
  return decodeSnapshotEntries(readEvidenceJson(sourcePath), sourcePath, true);
}
