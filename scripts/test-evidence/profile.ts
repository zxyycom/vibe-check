import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../value-guards.ts";
import { type BunTestSurface, isSafeRelativeGlob } from "./discovery/bun-files.ts";
import { isSafeRelativePosixPath } from "./relative-path.ts";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SupportedRunnerProfile = {
  schemaVersion: 1;
  id: string;
  version: number;
  bun: BunTestSurface;
};

export const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const profilePath = path.join(
  workspaceRoot,
  "scripts",
  "test-evidence",
  "supported-runner-profile.json"
);

export function loadSupportedRunnerProfile(sourcePath = profilePath): SupportedRunnerProfile {
  const value: unknown = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!isNonArrayRecord(value) || !hasExactKeys(value, ["schemaVersion", "id", "version", "bun"])) {
    throw new Error("supported runner profile has an invalid root shape");
  }
  if (
    value.schemaVersion !== 1 ||
    typeof value.id !== "string" ||
    !SLUG_PATTERN.test(value.id) ||
    !Number.isInteger(value.version) ||
    Number(value.version) < 1
  ) {
    throw new Error("supported runner profile identity is invalid");
  }
  const bun = parseBunProfile(value.bun);
  return {
    schemaVersion: 1,
    id: value.id,
    version: Number(value.version),
    bun
  };
}

function parseBunProfile(value: unknown): SupportedRunnerProfile["bun"] {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, ["sourceRoots", "include", "ignore", "supplementalFiles"])
  ) {
    throw new Error("supported runner Bun profile is invalid");
  }
  const sourceRoots = relativePathList(value.sourceRoots, "Bun sourceRoots");
  const include = globList(value.include, "Bun include");
  const ignore = globList(value.ignore, "Bun ignore", { allowEmpty: true });
  const supplementalFiles = relativePathList(value.supplementalFiles, "Bun supplementalFiles", {
    allowEmpty: true
  });
  return {
    sourceRoots,
    include,
    ignore,
    supplementalFiles
  };
}

function globList(value: unknown, label: string, options: { allowEmpty?: boolean } = {}): string[] {
  const items = sortedStringList(value, label, options);
  if (items.some((item) => !isSafeRelativeGlob(item))) {
    throw new Error(`${label} must contain positive relative POSIX globs`);
  }
  return items;
}

function relativePathList(
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean } = {}
): string[] {
  const items = sortedStringList(value, label, options);
  if (items.some((item) => !isSafeRelativePosixPath(item))) {
    throw new Error(`${label} must contain safe relative POSIX paths`);
  }
  return items;
}

function sortedStringList(
  value: unknown,
  label: string,
  options: { allowEmpty?: boolean } = {}
): string[] {
  if (!isUnknownArray(value) || (!options.allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${options.allowEmpty ? "a" : "a non-empty"} string array`);
  }
  const items = value.map((item) => {
    if (typeof item !== "string" || item.length === 0 || item !== item.trim()) {
      throw new Error(`${label} must be a non-empty string array`);
    }
    return item;
  });
  if (
    new Set(items).size !== items.length ||
    items.some((item, index) => index > 0 && items[index - 1] >= item)
  ) {
    throw new Error(`${label} must be uniquely sorted`);
  }
  return items;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}
