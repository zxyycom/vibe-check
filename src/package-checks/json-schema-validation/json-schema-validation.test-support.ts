import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  JsonSchemaValidationOptions,
  ResolvedJsonSchemaValidationOptions
} from "./options.ts";
import type { CheckResult, DeepReadonly } from "../../check/check.ts";
import { executeJsonSchemaValidation } from "./json-schema-validation.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";
import { executeCheck, type ReportedCheckRecord } from "../check-execution.test-support.ts";

export const DEFAULT_FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*"]),
  source: "filesystem" as const
});

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
  Readonly<{ readonly records: readonly ReportedCheckRecord[]; readonly result: CheckResult }>
> {
  return executeCheck(
    executeJsonSchemaValidation,
    Object.freeze({ ...options, files: fileConfiguration }),
    root,
    signal
  );
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

export function allowlistedOptions(
  schemaId: string
): DeepReadonly<ResolvedJsonSchemaValidationOptions> {
  return Object.freeze({
    bindings: [{ id: "instance", instancePath: "instance.json", schemaId }],
    files: DEFAULT_FILES,
    maximumBytes: 1_048_576,
    referenceResolution: {
      mode: "allowlisted",
      sources: [
        {
          id: "urn:vibe-check:source:schemas-example",
          kind: "https",
          origin: "https://schemas.example.test",
          pathPrefix: "/catalog/"
        }
      ]
    },
    schemaIdentity: { mode: "require-match" },
    schemas: [{ id: schemaId, path: "schema.json" }]
  } as const);
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
