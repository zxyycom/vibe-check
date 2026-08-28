import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";

/** `jsonValidation(options?)` 接受的可省略 authoring policy。 */
export interface JsonValidationOptions {
  /** 参与本 Check 的 repository-file selection；省略字段使用 package defaults。 */
  readonly files?: ProjectFileSelectionOptions;
  /** 单个 JSON document 允许的最大 raw byte 数；省略时为 1 MiB。 */
  readonly maximumBytes?: number;
}

/** `json-validation` execution 消费的完整、冻结 options。 */
export interface ResolvedJsonValidationOptions {
  readonly files: ProjectFileSelection;
  readonly maximumBytes: number;
}
