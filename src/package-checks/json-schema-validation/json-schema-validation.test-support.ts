import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  JsonSchemaValidationOptions,
  ResolvedJsonSchemaValidationOptions
} from "./options.ts";
import type {
  CheckDependencies,
  CheckExecutionContext,
  CheckResult,
  DeepReadonly
} from "../../check/check.ts";
import { executeJsonSchemaValidation } from "./json-schema-validation.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";

export const DEFAULT_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*"]),
  source: "filesystem" as const
});

const NO_DEPENDENCIES: CheckDependencies = Object.freeze({
  get: (checkId: string) =>
    Object.freeze({
      ok: false,
      error: Object.freeze({ code: "dependency-not-declared", checkId })
    }),
  list: () => Object.freeze([])
});

interface ObservedRecord {
  readonly data: object;
  readonly identity: Readonly<{ readonly id: string }>;
}

interface RunInput {
  readonly fileConfiguration?: ProjectFileSelection;
  readonly options: DeepReadonly<ResolvedJsonSchemaValidationOptions>;
  readonly root: string;
  readonly signal?: AbortSignal;
}

export async function runJsonSchemaValidation({
  fileConfiguration = DEFAULT_FILES,
  options,
  root,
  signal = new AbortController().signal
}: RunInput): Promise<
  Readonly<{ readonly records: readonly ObservedRecord[]; readonly result: CheckResult }>
> {
  const records: ObservedRecord[] = [];
  const context: CheckExecutionContext<ResolvedJsonSchemaValidationOptions> = Object.freeze({
    dependencies: NO_DEPENDENCIES,
    options: Object.freeze({ ...options, files: fileConfiguration }),
    project: Object.freeze({ flags: Object.freeze([]), root }),
    records: Object.freeze({
      report: (identity: Readonly<{ readonly id: string }>, data: object): void => {
        records.push(Object.freeze({ data, identity }));
      }
    }),
    signal
  });
  const result = await executeJsonSchemaValidation(context);
  return Object.freeze({ records: Object.freeze(records), result });
}

export function temporaryRoot(): string {
  return mkdtempSync(join(tmpdir(), "vibe-check-json-schema-validation-"));
}

export function writeJson(root: string, path: string, value: unknown): void {
  const fullPath = join(root, path);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(value), "utf8");
}

export function strictSchema(id: string, schema: object): object {
  return { $id: id, $schema: "https://json-schema.org/draft/2020-12/schema", ...schema };
}

export function offlineOptions(input: {
  readonly bindings: ResolvedJsonSchemaValidationOptions["bindings"];
  readonly schemaIdentity?: JsonSchemaValidationOptions["schemaIdentity"];
  readonly schemas: ResolvedJsonSchemaValidationOptions["schemas"];
}): DeepReadonly<ResolvedJsonSchemaValidationOptions> {
  return Object.freeze({
    bindings: input.bindings,
    files: DEFAULT_FILES,
    maximumBytes: 1_048_576,
    referenceResolution: Object.freeze({ mode: "offline" as const }),
    schemaIdentity: input.schemaIdentity ?? Object.freeze({ mode: "require-match" as const }),
    schemas: input.schemas
  });
}

export async function withFetch<T>(
  replacement: typeof globalThis.fetch,
  callback: () => Promise<T>
): Promise<T> {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    enumerable: true,
    value: replacement,
    writable: true
  });
  try {
    return await callback();
  } finally {
    if (descriptor === undefined) delete (globalThis as { fetch?: typeof globalThis.fetch }).fetch;
    else Object.defineProperty(globalThis, "fetch", descriptor);
  }
}

export function requestUrl(input: Parameters<typeof globalThis.fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}
