import {
  canonicalizeJsonValue,
  canonicalJsonText,
  type CanonicalJsonObject,
  type CanonicalJsonValue
} from "../data-boundary/canonical-data.ts";

/** 由采用方声明、用于匹配一个 finding 的语义身份与豁免理由。 */
export interface FindingWaiver<Identity> {
  /** 调用方定义的稳定 finding 身份；匹配时按 canonical JSON 结构比较。 */
  readonly identity: Identity;
  /** 解释该 finding 在当前范围内可被豁免的非空理由。 */
  readonly reason: string;
}

/** helper 安全 materialize 后保留的 waiver evidence；identity 是 detached canonical JSON。 */
export interface MaterializedFindingWaiver {
  /** 从 authored identity materialize 的 detached、deep-frozen canonical JSON。 */
  readonly identity: CanonicalJsonValue;
  /** 从 authored reason materialize 的非空理由。 */
  readonly reason: string;
}

/** 一项 finding waiver 的配置与匹配次数审计。 */
export interface FindingWaiverAudit {
  /** 被审计的 materialized authored waiver evidence，而非调用方可变输入引用。 */
  readonly waiver: MaterializedFindingWaiver;
  /** 该 waiver identity 在完整 finding 集合中匹配到的数量。 */
  readonly matchCount: number;
  /** 未使用、正常应用，或因过宽而没有应用。 */
  readonly status: "unused" | "applied" | "overmatched";
}

/** reconciliation 后单个 finding 的可执行处置；只有 `waived` branch 携带 matched waiver。 */
export type ReconciledFinding<Finding> = Readonly<
  | {
      /** 原始 finding；helper 不解释或改写它的领域字段。 */
      readonly finding: Finding;
      /** 没有匹配 waiver 的正常待处理 finding。 */
      readonly disposition: "actionable";
    }
  | {
      /** 原始 finding；helper 不解释或改写它的领域字段。 */
      readonly finding: Finding;
      /** 恰好匹配一项 waiver 的 finding。 */
      readonly disposition: "waived";
      /** applied waiver 的身份和理由。 */
      readonly waiver: MaterializedFindingWaiver;
    }
  | {
      /** 原始 finding；helper 不解释或改写它的领域字段。 */
      readonly finding: Finding;
      /** `overmatched` 保持为待处理，避免宽泛 waiver 静默覆盖多个 finding。 */
      readonly disposition: "overmatched";
    }
>;

/** 调用方提供完整候选集、身份识别器和 waiver 配置的输入。 */
export interface ReconcileFindingWaiversOptions<Finding, Identity> {
  /** 必须是完整 finding 候选集合，helper 才能审计每项 waiver 的匹配次数。 */
  readonly findings: readonly Finding[];
  /** 从完整 finding 提取调用方选择的稳定语义身份。 */
  readonly identify: (finding: Finding) => Identity;
  /** 要与识别器输出进行 canonical structural matching 的 waiver。 */
  readonly waivers: readonly FindingWaiver<Identity>[];
}

/** 独立 waiver reconciliation 的完整输出，保留 finding 处置和每项配置审计。 */
export interface FindingWaiverReconciliation<Finding> {
  /** 与 input finding 顺序相同的 reconciliation 结果。 */
  readonly findings: readonly ReconciledFinding<Finding>[];
  /** 与 input waiver 顺序相同的完整配置审计。 */
  readonly waiverAudits: readonly FindingWaiverAudit[];
}

/**
 * 按调用方定义的语义身份对完整 finding 集合和 waiver 配置做 canonical structural reconciliation。
 *
 * 每项 waiver 必须有唯一、可 canonicalize 的 identity 和非空 reason。匹配零项时产生 `unused` 审计；
 * 匹配一项时该 finding 为 `waived`；匹配多项时产生 `overmatched` 审计，相关 finding 保持待处理。
 */
export function reconcileFindingWaivers<Finding, Identity>(
  options: ReconcileFindingWaiversOptions<Finding, Identity>
): FindingWaiverReconciliation<Finding> {
  const waivers = materializeWaivers(options.waivers);
  const matchCounts = new Array<number>(waivers.length).fill(0);
  const waiverIndexesByIdentity = new Map<string, number>();
  for (const [index, waiver] of waivers.entries()) {
    const identity = canonicalIdentity(waiver.identity, "waiver identity");
    if (waiverIndexesByIdentity.has(identity)) {
      throw new TypeError("Finding waivers must not declare duplicate canonical identities");
    }
    waiverIndexesByIdentity.set(identity, index);
  }

  const matchedWaiverIndexes = options.findings.map((finding) => {
    const identity = canonicalIdentity(options.identify(finding), "finding identity");
    const waiverIndex = waiverIndexesByIdentity.get(identity);
    if (waiverIndex !== undefined) matchCounts[waiverIndex] += 1;
    return waiverIndex;
  });
  const waiverAudits = Object.freeze(
    waivers.map((waiver, index) =>
      Object.freeze({
        matchCount: matchCounts[index] ?? 0,
        status: waiverAuditStatus(matchCounts[index] ?? 0),
        waiver
      })
    )
  );
  const findings = Object.freeze(
    options.findings.map((finding, index) => {
      const waiverIndex = matchedWaiverIndexes[index];
      const audit = waiverIndex === undefined ? undefined : waiverAudits[waiverIndex];
      return reconciledFinding(finding, audit);
    })
  );
  return Object.freeze({ findings, waiverAudits });
}

function materializeWaivers<Identity>(
  waivers: readonly FindingWaiver<Identity>[]
): readonly MaterializedFindingWaiver[] {
  const canonicalWaivers = canonicalizeJsonValue(waivers);
  if (canonicalWaivers === undefined || !isCanonicalArray(canonicalWaivers)) {
    throw new TypeError("Finding waivers must be canonical JSON arrays");
  }
  return Object.freeze(canonicalWaivers.map(materializeWaiver));
}

function materializeWaiver(value: CanonicalJsonValue): MaterializedFindingWaiver {
  if (
    !isCanonicalObject(value) ||
    !Object.hasOwn(value, "identity") ||
    !Object.hasOwn(value, "reason")
  ) {
    throw new TypeError("Finding waivers must declare canonical identity and reason fields");
  }
  const reason = value.reason;
  if (typeof reason !== "string" || reason.length === 0) {
    throw new TypeError("Finding waiver reasons must be non-empty strings");
  }
  return Object.freeze({ identity: value.identity, reason });
}

function isCanonicalObject(value: CanonicalJsonValue): value is CanonicalJsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCanonicalArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

function canonicalIdentity(identity: unknown, kind: string): string {
  try {
    return canonicalJsonText(identity);
  } catch {
    throw new TypeError(`Finding ${kind} must be canonical JSON`);
  }
}

function waiverAuditStatus(matchCount: number): FindingWaiverAudit["status"] {
  if (matchCount === 0) return "unused";
  return matchCount === 1 ? "applied" : "overmatched";
}

function reconciledFinding<Finding>(
  finding: Finding,
  audit: FindingWaiverAudit | undefined
): ReconciledFinding<Finding> {
  if (audit === undefined) return Object.freeze({ disposition: "actionable", finding });
  if (audit.status === "applied") {
    return Object.freeze({ disposition: "waived", finding, waiver: audit.waiver });
  }
  return Object.freeze({ disposition: "overmatched", finding });
}
