import { createHash } from "node:crypto";

import type { CheckExecutionContext } from "../../check/check.ts";
import { MAX_REPORTED_JSON_SCHEMA_ISSUES } from "./final-data.ts";
import type { JsonSchemaValidationRecordData } from "./json-schema-validation.ts";
import type { ResolvedJsonSchemaValidationOptions } from "./options.ts";

/** Owns the invocation-local issue count, display cap, and deterministic Record identity ordinal. */
export class SchemaIssueCollector {
  #count = 0;
  #reportedCount = 0;
  readonly #issueOccurrences = new Map<string, number>();
  readonly #checkContext: CheckExecutionContext<ResolvedJsonSchemaValidationOptions>;

  constructor(context: CheckExecutionContext<ResolvedJsonSchemaValidationOptions>) {
    this.#checkContext = context;
  }

  get count(): number {
    return this.#count;
  }

  get reportedCount(): number {
    return this.#reportedCount;
  }

  get truncated(): boolean {
    return this.#count > this.#reportedCount;
  }

  add(issue: JsonSchemaValidationRecordData): void {
    this.#count += 1;
    if (this.#reportedCount >= MAX_REPORTED_JSON_SCHEMA_ISSUES) return;
    const semanticKey = JSON.stringify(issue);
    const occurrence = this.#issueOccurrences.get(semanticKey) ?? 0;
    this.#issueOccurrences.set(semanticKey, occurrence + 1);
    const digest = createHash("sha256")
      .update(`${semanticKey}\n${occurrence}`, "utf8")
      .digest("hex");
    this.#checkContext.records.report({ id: `json-schema:${issue.kind}:${digest}` }, issue);
    this.#reportedCount += 1;
  }
}
