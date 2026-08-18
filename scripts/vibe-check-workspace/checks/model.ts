export const PROFILE_REQUIRED = "required";
export const PROFILE_FULL = "full";

export type Profile = typeof PROFILE_REQUIRED | typeof PROFILE_FULL;
export type CheckStatus = "passed" | "warning" | "failed";
export type CheckEnvironment = Readonly<Record<string, string | undefined>>;
export type StringList = string | readonly string[] | undefined;

export const profiles = Object.freeze({
  [PROFILE_REQUIRED]: Object.freeze({
    label: "required",
    description: "fast deterministic checks and quick quality check for routine development"
  }),
  [PROFILE_FULL]: Object.freeze({
    label: "full",
    description:
      "required non-quality checks plus full quality check, product tests, and toolkit gates"
  })
});

/** Shared scripts-owned authoring context inherited by groups and leaves. */
interface CheckDefinitionContext {
  readonly id: string;
  readonly label?: string;
  readonly type?: Profile;
  readonly mutex?: StringList;
  readonly dependsOn?: StringList;
  readonly env?: CheckEnvironment;
  readonly envFile?: string;
}

/** Scripts-only group context. It is flattened before command execution. */
export interface CheckGroupDefinition extends CheckDefinitionContext {
  readonly tasks: readonly CheckDefinition[];
  readonly allowOutput?: never;
  readonly args?: never;
  readonly command?: never;
  readonly ignoreOutput?: never;
  readonly warningOutput?: never;
}

/** Scripts-only command leaf. Only leaves can carry process execution fields. */
export interface CheckLeafDefinition extends CheckDefinitionContext {
  readonly tasks?: never;
  readonly allowOutput?: readonly RegExp[];
  readonly args?: readonly string[];
  readonly command: string;
  readonly ignoreOutput?: readonly RegExp[];
  readonly warningOutput?: readonly RegExp[];
}

/** Scripts-owned authoring shape projected to the Product task graph by a local adapter. */
export type CheckDefinition = CheckGroupDefinition | CheckLeafDefinition;

export interface CheckTask {
  readonly id: string;
  readonly label: string;
  readonly type: Profile;
  readonly mutex: readonly string[];
  readonly dependsOn: readonly string[];
  readonly env: CheckEnvironment | undefined;
  readonly envFile: string | undefined;
  readonly allowOutput: readonly RegExp[];
  readonly args: readonly string[];
  readonly command: string;
  readonly ignoreOutput: readonly RegExp[];
  readonly reportId: string;
  readonly reportLabel: string;
  readonly warningOutput: readonly RegExp[];
}

export interface CheckReportRef {
  readonly id: string;
  readonly label: string;
}
