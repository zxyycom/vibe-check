/** Diagnostic emitted when one invocation control is not a closed supported value. */
export interface RunControlDiagnostic {
  readonly kind: "invalid-run-controls";
  readonly path: string;
  readonly reason: "invalid-value" | "unknown-key";
}

/** Closed validation result for a Run-owned invocation control. */
export type RunControlValidationResult<T> = Readonly<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: RunControlDiagnostic }
>;
