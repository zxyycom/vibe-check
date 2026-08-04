import { resolve } from "node:path";

export const CONFIG_DIRECTORY_NAME = ".vibe-check";
export const CONFIG_FILE_NAME = "config.json";
export const CONFIG_SCHEMA_FILE_NAME = "config.schema.json";
export const CONFIG_SCHEMA_REFERENCE = `./${CONFIG_SCHEMA_FILE_NAME}`;

export interface ProjectConfigPaths {
  readonly configPath: string;
  readonly directoryPath: string;
  readonly projectRoot: string;
  readonly schemaPath: string;
}

export function resolveProjectConfigPaths(projectRoot: string): ProjectConfigPaths {
  const normalizedRoot = resolve(projectRoot);
  const directoryPath = resolve(normalizedRoot, CONFIG_DIRECTORY_NAME);
  return {
    configPath: resolve(directoryPath, CONFIG_FILE_NAME),
    directoryPath,
    projectRoot: normalizedRoot,
    schemaPath: resolve(directoryPath, CONFIG_SCHEMA_FILE_NAME)
  };
}
