import fs from "node:fs";
import path from "node:path";

import { errorMessage } from "./error-message.ts";

export type WriteTextFileInput = {
  readonly content: string;
  readonly filePath: string;
};

export type WriteJsonFileInput = {
  readonly filePath: string;
  readonly trailingNewline?: boolean;
  readonly value: unknown;
};

export function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function writeTextFile({ content, filePath }: WriteTextFileInput): void {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, content, "utf8");
}

export function readJsonFile(filePath: string): unknown {
  let source: string;
  try {
    source = readTextFile(filePath);
  } catch (error: unknown) {
    throw new Error(`could not read JSON file ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }

  try {
    return JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`could not parse JSON file ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
}

export function writeJsonFile({
  filePath,
  trailingNewline = true,
  value
}: WriteJsonFileInput): void {
  const content = serializeJsonFile(value, filePath);
  writeTextFile({ content: trailingNewline ? `${content}\n` : content, filePath });
}

function serializeJsonFile(value: unknown, filePath: string): string {
  try {
    const content = JSON.stringify(value, null, 2);
    if (content === undefined) {
      throw new TypeError("value is not JSON-serializable");
    }
    return content;
  } catch (error: unknown) {
    throw new Error(`could not serialize JSON file ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
}
