import type { FindingWaiver } from "../../finding-waivers/reconciliation.ts";
import type { ProjectFileSelection } from "../project-files/configuration.ts";

/** `secretDetection(options)` 的明确 authoring policy。 */
export interface SecretDetectionOptions {
  /** 必填的完整 project-file policy；只有它选中的 path 可以被读取或传给 detector。 */
  readonly files: ProjectFileSelection;
  /** 单个输入允许的最大 raw byte 数；超过时形成不可豁免的 coverage gap。 */
  readonly maximumFileBytes?: number;
  /** 一次 invocation 中允许读取和检测的累计 raw byte 数；超过时形成 coverage gap。 */
  readonly maximumTotalBytes?: number;
  /** 一次 invocation 中允许处理的 selected file 数；超过时形成 coverage gap。 */
  readonly maximumFileCount?: number;
  /** 对安全 finding identity 的精确、可审计误报豁免。 */
  readonly findingWaivers?: readonly FindingWaiver<SecretDetectionFindingIdentity>[];
}

/** 不含 raw value、message、hash 或 location 的 secret finding 身份。 */
export interface SecretDetectionFindingIdentity {
  readonly ordinal: number;
  readonly path: string;
  readonly ruleId: "@secretlint/secretlint-rule-privatekey";
  readonly structuralClass: "text-document";
}

/** `secretDetection` execution 消费的完整冻结 options。 */
export interface ResolvedSecretDetectionOptions {
  readonly files: ProjectFileSelection;
  readonly findingWaivers: readonly FindingWaiver<SecretDetectionFindingIdentity>[];
  readonly maximumFileBytes: number;
  readonly maximumFileCount: number;
  readonly maximumTotalBytes: number;
}

/** `findingWaivers` 的 public authoring alias。 */
export type SecretDetectionFindingWaiver = FindingWaiver<SecretDetectionFindingIdentity>;
