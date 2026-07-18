import { readFile, stat } from "node:fs/promises";

import { parseQualityConfig } from "./config-parser.ts";
import { errorMessage } from "./foundation/src/errors.ts";
import type { QualityConfig } from "./quality-core/src/model/schema.ts";

export async function loadQualityConfig(configPath: string): Promise<QualityConfig> {
  try {
    const fileStats = await stat(configPath);
    if (!fileStats.isFile()) {
      throw new Error("path is not a regular file");
    }

    const bytes = await readFile(configPath);
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return parseQualityConfig(JSON.parse(source) as unknown);
  } catch (cause: unknown) {
    throw new Error(
      `failed to load config "${configPath}": ${errorMessage(cause)}`,
      { cause }
    );
  }
}
