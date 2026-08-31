import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { FILE_SYSTEM } from "./documentation/task-contract.ts";

const PROJECT_GATE_ROOT_DIRECTORIES = Object.freeze(["checks", "runtime"]);
const PROJECT_GATE_ROOT_FILES = Object.freeze([
  "definition.test.ts",
  "definition.ts",
  "run.test.ts",
  "run.ts"
]);

/** Requires the Gate root to expose only its definition and process entry contracts. */
export function validateProjectGateRoot(root: string, violations: string[]): void {
  const gateRoot = join(root, "scripts", "project", "gate");
  if (!existsSync(gateRoot)) {
    violations.push("project-gate-root-layout: scripts/project/gate is missing");
    return;
  }
  const entries = readdirSync(gateRoot, { withFileTypes: true }).filter(
    (entry) => !FILE_SYSTEM.ignoredDirs.includes(entry.name)
  );
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
  const unsupportedEntries = entries
    .filter((entry) => !entry.isDirectory() && !entry.isFile())
    .map((entry) => entry.name)
    .sort();
  if (
    directories.join("\0") !== PROJECT_GATE_ROOT_DIRECTORIES.join("\0") ||
    files.join("\0") !== PROJECT_GATE_ROOT_FILES.join("\0") ||
    unsupportedEntries.length > 0
  ) {
    violations.push(
      `project-gate-root-layout: expected directories ${PROJECT_GATE_ROOT_DIRECTORIES.join(", ")} and files ${PROJECT_GATE_ROOT_FILES.join(", ")}; found directories ${directories.join(", ")}, files ${files.join(", ")}, and unsupported entries ${unsupportedEntries.join(", ")}`
    );
  }
}
