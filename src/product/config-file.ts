import { readFile, stat } from "node:fs/promises";

import {
  parseSemanticProjectConfigV1,
  type SemanticProjectConfigV1
} from "./config-schema.ts";
import { errorMessage } from "./foundation/src/errors.ts";
import { isNonArrayRecord } from "./foundation/src/type-guards.ts";

type ProjectConfigErrorCode =
  | "invalid-project-config"
  | "legacy-project-config";

export class ProjectConfigError extends Error {
  readonly code: ProjectConfigErrorCode;
  readonly configPath: string;

  constructor(
    configPath: string,
    cause: unknown,
    code: ProjectConfigErrorCode = "invalid-project-config"
  ) {
    super(`failed to load config "${configPath}": ${errorMessage(cause)}`, {
      cause
    });
    this.name = "ProjectConfigError";
    this.code = code;
    this.configPath = configPath;
  }
}

export class LegacyProjectConfigError extends ProjectConfigError {
  constructor(configPath: string, legacyFields: readonly string[]) {
    const fields = legacyFields.join(", ");
    super(
      configPath,
      new Error(
        `legacy top-level fields (${fields}) are not valid in project config version "1"; ` +
        "move file thresholds from scc to checks.files, function thresholds from lizard to checks.functions, " +
        "and duplication settings from jscpd to checks.duplication; move executable and process arguments out of the project document to " +
        "VIBE_CHECK_LIZARD_CMD, VIBE_CHECK_SCC_CMD/VIBE_CHECK_SCC_ARGS, and VIBE_CHECK_JSCPD_CMD/VIBE_CHECK_JSCPD_ARGS " +
        "(Lizard arguments are fixed by Vibe Check)"
      ),
      "legacy-project-config"
    );
    this.name = "LegacyProjectConfigError";
  }
}

export async function loadSemanticProjectConfig(
  configPath: string
): Promise<SemanticProjectConfigV1> {
  try {
    const fileStats = await stat(configPath);
    if (!fileStats.isFile()) {
      throw new Error("path is not a regular file");
    }

    const bytes = await readFile(configPath);
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const input = JSON.parse(source) as unknown;
    const legacyFields = legacyTopLevelFields(input);
    if (legacyFields.length > 0) {
      throw new LegacyProjectConfigError(configPath, legacyFields);
    }
    return parseSemanticProjectConfigV1(input);
  } catch (cause: unknown) {
    if (cause instanceof ProjectConfigError) throw cause;
    throw new ProjectConfigError(configPath, cause);
  }
}

function legacyTopLevelFields(input: unknown): readonly string[] {
  if (!isNonArrayRecord(input)) return [];
  return ["jscpd", "lizard", "scc", "tools"].filter((field) =>
    Object.hasOwn(input, field)
  );
}
