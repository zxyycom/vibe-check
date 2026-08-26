import type { ProjectFileSelection } from "../project-files/configuration.ts";

/** `jsonValidation` 的完整 Check-owned options。 */
export interface JsonValidationOptions {
  /** 参与本 Check 的完整 repository-file selection。 */
  readonly files: ProjectFileSelection;
  /** 单个 JSON document 允许的最大 raw byte 数；必须是正安全整数。 */
  readonly maximumBytes: number;
}
