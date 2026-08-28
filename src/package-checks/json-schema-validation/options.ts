import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";

export type JsonSchemaIdentityMode =
  | "require-match"
  | "configuration-authoritative"
  | "document-authoritative";

export interface JsonSchemaIdentity {
  readonly mode: JsonSchemaIdentityMode;
}

export type JsonSchemaReferenceSource =
  | Readonly<{ readonly kind: "bundled"; readonly catalog: "json-schema-2020-12" }>
  | Readonly<{
      readonly kind: "https";
      readonly id: string;
      readonly origin: string;
      readonly pathPrefix: string;
    }>;

export type JsonSchemaReferenceResolution =
  | Readonly<{ readonly mode: "offline" }>
  | Readonly<{
      readonly mode: "allowlisted";
      readonly sources: readonly JsonSchemaReferenceSource[];
    }>;

export interface RegisteredJsonSchema {
  readonly id: string;
  readonly path: string;
}

export interface JsonSchemaInstanceBinding {
  readonly id: string;
  readonly instancePath: string;
  readonly schemaId: string;
}

/** `jsonSchemaValidation(options?)` 接受的可省略 authoring policy。 */
export interface JsonSchemaValidationOptions {
  /** schema/instance declarations 必须属于的 repository-file selection。 */
  readonly files?: ProjectFileSelectionOptions;
  /** 每个 local schema/instance document 允许的最大 raw byte 数；省略时为 1 MiB。 */
  readonly maximumBytes?: number;
  /** 整个 Check 共用的 schema root identity 规则；不得按 schema 混用。 */
  readonly schemaIdentity?: JsonSchemaIdentity;
  /** 默认离线；额外 schema source 必须显式 allowlist。 */
  readonly referenceResolution?: JsonSchemaReferenceResolution;
  /** 显式注册的 schema resources；ID 是 binding 和 public fact 使用的安全 authoring identity。 */
  readonly schemas?: readonly RegisteredJsonSchema[];
  /** 明确把一个由本 Check file selection 批准的 instance path 绑定到已声明 schema。 */
  readonly bindings?: readonly JsonSchemaInstanceBinding[];
}

/** `json-schema-validation` execution 消费的完整、冻结 options。 */
export interface ResolvedJsonSchemaValidationOptions {
  readonly files: ProjectFileSelection;
  readonly maximumBytes: number;
  readonly schemaIdentity: JsonSchemaIdentity;
  readonly referenceResolution: JsonSchemaReferenceResolution;
  readonly schemas: readonly RegisteredJsonSchema[];
  readonly bindings: readonly JsonSchemaInstanceBinding[];
}
