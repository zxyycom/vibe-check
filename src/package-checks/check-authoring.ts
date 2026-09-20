import type {
  Check,
  CheckFlagEnablement,
  CheckResourceClaims,
  InheritableCheckCollection
} from "../check/check.ts";
import { snapshotClosedArray, snapshotClosedPolicyRecord } from "../data-boundary/closed-values.ts";
import { parseFlagEnablementControl } from "../project-definition/check-tree/check-fields-authoring.ts";
import { parseCheckScheduling } from "../project-definition/check-tree/scheduling-authoring.ts";

/** 固定身份随包 Check 构造器与领域 policy 并列接收的项目声明字段；Project Definition 保留语义校验所有权。 */
export interface PackageCheckAuthoringOptions<Id extends string = string> {
  /** Overrides the constructor's package default identity. */
  readonly checkId?: Id;
  /** Overrides the constructor's package default presentation name. */
  readonly displayName?: string;
  readonly enabledByFlags?: CheckFlagEnablement;
  readonly checks?: readonly Check[];
  readonly dependsOn?: InheritableCheckCollection<string>;
  readonly observes?: InheritableCheckCollection<string>;
  readonly maxParallel?: number;
  readonly admissionPriority?: number;
  readonly mutex?: InheritableCheckCollection<string>;
  readonly resourceClaims?: CheckResourceClaims;
  /** `false` explicitly restores the package default of rendering quiet passed rows. */
  readonly omitQuietPassedRow?: boolean;
}

/** 自定义随包 Check identity 时必须声明与返回类型一致的 runtime `checkId`。 */
export type PackageCheckIdentityInput<Id extends string> = Readonly<{ readonly checkId: Id }>;

const PACKAGE_CHECK_AUTHORING_KEYS = [
  "admissionPriority",
  "checkId",
  "checks",
  "dependsOn",
  "displayName",
  "enabledByFlags",
  "maxParallel",
  "mutex",
  "observes",
  "omitQuietPassedRow",
  "resourceClaims"
] as const;

type PackageCheckDefinition<Id extends string> = Readonly<{
  readonly checkId: Id;
  readonly displayName: string;
  readonly enabledByFlags?: CheckFlagEnablement;
  readonly checks?: readonly Check[];
  readonly dependsOn?: InheritableCheckCollection<string>;
  readonly observes?: InheritableCheckCollection<string>;
  readonly maxParallel?: number;
  readonly admissionPriority?: number;
  readonly mutex?: InheritableCheckCollection<string>;
  readonly resourceClaims?: CheckResourceClaims;
  readonly omitQuietPassedRow?: true;
}>;

/** 对一个 closed 构造输入执行安全 shape 校验，并分流领域 policy 与普通 Check 声明字段。 */
export function resolvePackageCheckAuthoringInput<const Id extends string>(
  input: PackageCheckAuthoringOptions<Id> & object,
  domainKeys: readonly string[],
  defaults: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly omitQuietPassedRow?: true;
  }>
):
  | Readonly<{
      readonly definition: PackageCheckDefinition<Id>;
      readonly domainOptions: Readonly<Record<string, unknown>>;
    }>
  | undefined {
  const snapshot = snapshotClosedPolicyRecord(input, {
    optional: [...domainKeys, ...PACKAGE_CHECK_AUTHORING_KEYS]
  });
  if (snapshot === undefined) return undefined;

  const checkId = snapshot.checkId ?? defaults.checkId;
  const displayName = snapshot.displayName ?? defaults.displayName;
  if (!isNonEmptyString(checkId) || !isNonEmptyString(displayName)) return undefined;
  if (
    (snapshot.omitQuietPassedRow !== undefined &&
      typeof snapshot.omitQuietPassedRow !== "boolean") ||
    !hasSafeProjectFieldShapes(snapshot)
  ) {
    return undefined;
  }
  const omitQuietPassedRow =
    snapshot.omitQuietPassedRow === undefined
      ? defaults.omitQuietPassedRow === true
      : snapshot.omitQuietPassedRow === true;

  const domainOptions = Object.freeze(
    Object.fromEntries(
      domainKeys.flatMap((key) => (Object.hasOwn(snapshot, key) ? [[key, snapshot[key]]] : []))
    )
  );
  const definition = Object.freeze({
    ...(snapshot.admissionPriority === undefined
      ? {}
      : { admissionPriority: snapshot.admissionPriority }),
    ...(snapshot.checks === undefined ? {} : { checks: snapshot.checks }),
    ...(snapshot.dependsOn === undefined ? {} : { dependsOn: snapshot.dependsOn }),
    ...(snapshot.enabledByFlags === undefined ? {} : { enabledByFlags: snapshot.enabledByFlags }),
    ...(snapshot.maxParallel === undefined ? {} : { maxParallel: snapshot.maxParallel }),
    ...(snapshot.mutex === undefined ? {} : { mutex: snapshot.mutex }),
    ...(snapshot.observes === undefined ? {} : { observes: snapshot.observes }),
    ...(omitQuietPassedRow ? { omitQuietPassedRow: true as const } : {}),
    ...(snapshot.resourceClaims === undefined ? {} : { resourceClaims: snapshot.resourceClaims }),
    // Runtime defaults are strings; constructor signatures bind this field to the input literal type.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The runtime default is fixed by the constructor, while the public signature retains an input literal ID.
    checkId: checkId as Id,
    displayName
  }) satisfies PackageCheckDefinition<Id>;
  return Object.freeze({ definition, domainOptions });
}

function hasSafeProjectFieldShapes(
  input: Readonly<Record<string, unknown>>
): input is Readonly<Record<string, unknown>> & PackageCheckAuthoringOptions {
  const scheduling = parseCheckScheduling(input);
  if (scheduling === undefined) return false;
  if (
    input.enabledByFlags !== undefined &&
    parseFlagEnablementControl(input.enabledByFlags) === undefined
  ) {
    return false;
  }
  return input.checks === undefined || snapshotClosedArray(input.checks) !== undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
