import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  loadSemanticProjectConfig,
  ProjectConfigError
} from "./config-file.ts";
import { resolveProjectConfigPaths } from "./config-paths.ts";
import {
  resolveQualityConfig,
  type QualityConfigCliOverrides,
  type SemanticProjectConfigV1
} from "./config-schema.ts";
import { createDefaultConfig } from "./config.ts";
import type { ResolvedQualityConfig } from "./quality-core/src/model/schema.ts";

export type ConfigSource = "default" | "explicit" | "discovered";

type FileBackedConfigSource = Exclude<ConfigSource, "default">;

export type SelectedConfig =
  | {
      readonly config: ResolvedQualityConfig;
      readonly source: "default";
    }
  | {
      readonly config: ResolvedQualityConfig;
      /** Normalized absolute path of the selected project config file. */
      readonly path: string;
      readonly source: FileBackedConfigSource;
    };

interface ConfigSelectionRuntime {
  readonly inspect: (path: string) => Promise<void>;
  readonly load: (path: string) => Promise<SemanticProjectConfigV1>;
}

export interface ProjectConfigSelectionOptions {
  readonly cliOverrides: QualityConfigCliOverrides;
  readonly explicitConfigFile: string | null;
  readonly gateRequested: boolean;
  readonly projectRoot: string;
}

export class ProjectConfigRequiredError extends ProjectConfigError {
  constructor(configPath: string) {
    super(
      configPath,
      new Error(
        "a quality gate requires a complete file-backed policy; " +
          "run `bun run product:cli -- init [project-root]` to create the fixed config " +
          "or pass `--config <file>`"
      )
    );
    this.name = "ProjectConfigRequiredError";
  }
}

const NODE_CONFIG_SELECTION_RUNTIME: ConfigSelectionRuntime = {
  inspect: async (path) => {
    await stat(path);
  },
  load: loadSemanticProjectConfig
};

export async function selectProjectConfig(
  options: ProjectConfigSelectionOptions,
  runtimeOverrides: Partial<ConfigSelectionRuntime> = {}
): Promise<SelectedConfig> {
  const root = resolve(options.projectRoot);
  const runtime = {
    ...NODE_CONFIG_SELECTION_RUNTIME,
    ...runtimeOverrides
  };

  if (options.explicitConfigFile !== null) {
    return loadFileBackedConfig(
      resolve(root, options.explicitConfigFile),
      "explicit",
      options.cliOverrides,
      runtime
    );
  }

  const candidatePath = resolveProjectConfigPaths(root).configPath;
  try {
    await runtime.inspect(candidatePath);
  } catch (cause: unknown) {
    if (!isErrno(cause, "ENOENT")) {
      throw new ProjectConfigError(candidatePath, cause);
    }
    if (options.gateRequested) {
      throw new ProjectConfigRequiredError(candidatePath);
    }
    return {
      config: createDefaultConfig(options.cliOverrides),
      source: "default"
    };
  }

  return loadFileBackedConfig(
    candidatePath,
    "discovered",
    options.cliOverrides,
    runtime
  );
}

async function loadFileBackedConfig(
  path: string,
  source: "discovered" | "explicit",
  cliOverrides: QualityConfigCliOverrides,
  runtime: ConfigSelectionRuntime
): Promise<SelectedConfig> {
  let document: SemanticProjectConfigV1;
  try {
    document = await runtime.load(path);
  } catch (cause: unknown) {
    if (cause instanceof ProjectConfigError) {
      cause.message = `selected ${source} config: ${cause.message}`;
    }
    throw cause;
  }
  return {
    config: resolveQualityConfig(document, cliOverrides),
    path,
    source
  };
}

function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
