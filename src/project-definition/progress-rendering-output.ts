import { snapshotClosedRecord } from "../data-boundary/closed-values.ts";

/** Progress formatter 只接收当前 selected preview 的默认正文，不接收 Check 或事实对象。 */
export type ProgressPreviewFormatter = (
  this: void,
  context: Readonly<{
    readonly kind: "record" | "message";
    readonly text: string;
    readonly maxCodePoints: number;
  }>
) => string;

/** 人读 progress rendering 的作者配置；省略 preview 字段时使用 Product 默认值。 */
export interface ProgressRenderingOutput {
  /** `false` 时不构造或写入 progress writer。 */
  readonly enabled: boolean;
  /** 每个 settled block 预览的 Record 数量；非负 safe integer，默认 `5`，`0` 只隐藏 detail。 */
  readonly recordPreviewLimit?: number;
  /** 每个 settled block 预览的 message 数量；非负 safe integer，默认 `5`，`0` 只隐藏 detail。 */
  readonly messagePreviewLimit?: number;
  /** 每条 preview 正文的 Unicode code point 上限；正 safe integer，默认 `240`。 */
  readonly textPreviewCodePointLimit?: number;
  /** `null` 或省略保持默认正文；函数返回文本仍由 Product escape 并限制长度。 */
  readonly formatter?: ProgressPreviewFormatter | null;
}

/** 已补齐 defaults、可直接交给 progress renderer 的配置。 */
export interface ResolvedProgressRenderingOutput {
  readonly enabled: boolean;
  readonly formatter: ProgressPreviewFormatter | null;
  readonly messagePreviewLimit: number;
  readonly recordPreviewLimit: number;
  readonly textPreviewCodePointLimit: number;
}

type ProgressRenderingFieldSpec = Readonly<{
  readonly key: keyof ProgressRenderingOutput;
  readonly accepts: (value: unknown) => boolean;
  readonly expected: ProgressRenderingFieldExpectation;
}>;

/** Closed expectations shared with invocation diagnostics; never contains authored values. */
export type ProgressRenderingFieldExpectation =
  | "plain-data-object"
  | "boolean"
  | "function-or-null"
  | "non-negative-safe-integer"
  | "positive-safe-integer";

type ProgressRenderingFieldsResult = Readonly<
  | { readonly ok: true; readonly value: Partial<ProgressRenderingOutput> }
  | {
      readonly ok: false;
      readonly key: string | null;
      readonly reason: "unknown-key" | "invalid-value";
      readonly expected?: ProgressRenderingFieldExpectation;
    }
>;

const PROGRESS_RENDERING_FIELD_SPECS = Object.freeze([
  { key: "enabled", accepts: isBoolean, expected: "boolean" },
  { key: "formatter", accepts: isProgressPreviewFormatterOrNull, expected: "function-or-null" },
  {
    key: "messagePreviewLimit",
    accepts: isNonNegativeSafeInteger,
    expected: "non-negative-safe-integer"
  },
  {
    key: "recordPreviewLimit",
    accepts: isNonNegativeSafeInteger,
    expected: "non-negative-safe-integer"
  },
  {
    key: "textPreviewCodePointLimit",
    accepts: isPositiveSafeInteger,
    expected: "positive-safe-integer"
  }
] satisfies readonly ProgressRenderingFieldSpec[]);

/** Parses the fields shared by Definition output and RunControls override grammar. */
export function parseProgressRenderingFields(value: unknown): ProgressRenderingFieldsResult {
  const data = snapshotClosedRecord(value);
  if (data === undefined) {
    return { ok: false, key: null, reason: "invalid-value", expected: "plain-data-object" };
  }
  const unknownKey = Object.keys(data).find(
    (key) => !PROGRESS_RENDERING_FIELD_SPECS.some((field) => field.key === key)
  );
  if (unknownKey !== undefined) return { ok: false, key: unknownKey, reason: "unknown-key" };
  for (const { key, accepts, expected } of PROGRESS_RENDERING_FIELD_SPECS) {
    if (data[key] !== undefined && !accepts(data[key])) {
      return { ok: false, key, reason: "invalid-value", expected };
    }
  }
  return {
    ok: true,
    value: Object.freeze(
      Object.fromEntries(
        PROGRESS_RENDERING_FIELD_SPECS.flatMap(({ key }) =>
          data[key] === undefined ? [] : [[key, data[key]]]
        )
      ) as Partial<ProgressRenderingOutput>
    )
  };
}

function isBoolean(value: unknown): boolean {
  return typeof value === "boolean";
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isProgressPreviewFormatterOrNull(value: unknown): boolean {
  return value === null || typeof value === "function";
}
