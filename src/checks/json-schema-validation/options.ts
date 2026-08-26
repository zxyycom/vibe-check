import type { ProjectFileSelection } from "../../project-files/configuration.ts";

type JsonSchemaIdentityMode =
  | "require-match"
  | "configuration-authoritative"
  | "document-authoritative";

interface JsonSchemaIdentity {
  readonly mode: JsonSchemaIdentityMode;
}

type JsonSchemaReferenceSource =
  | Readonly<{ readonly kind: "bundled"; readonly catalog: "json-schema-2020-12" }>
  | Readonly<{
      readonly kind: "https";
      readonly id: string;
      readonly origin: string;
      readonly pathPrefix: string;
    }>;

type JsonSchemaReferenceResolution =
  | Readonly<{ readonly mode: "offline" }>
  | Readonly<{
      readonly mode: "allowlisted";
      readonly sources: readonly JsonSchemaReferenceSource[];
    }>;

interface RegisteredJsonSchema {
  readonly id: string;
  readonly path: string;
}

interface JsonSchemaInstanceBinding {
  readonly id: string;
  readonly instancePath: string;
  readonly schemaId: string;
}

/** `jsonSchemaValidation` 的完整 Check-owned options。 */
export interface JsonSchemaValidationOptions {
  /** schema/instance declarations 必须属于的完整 repository-file selection。 */
  readonly files: ProjectFileSelection;
  /** 每个 local schema/instance document 允许的最大 raw byte 数；必须是正安全整数。 */
  readonly maximumBytes: number;
  /** 整个 Check 共用的 schema root identity 规则；不得按 schema 混用。 */
  readonly schemaIdentity: JsonSchemaIdentity;
  /** 默认离线；额外 schema source 必须显式 allowlist。 */
  readonly referenceResolution: JsonSchemaReferenceResolution;
  /** 显式注册的 schema resources；ID 是 binding 和 public fact 使用的安全 authoring identity。 */
  readonly schemas: readonly RegisteredJsonSchema[];
  /** 明确把一个由本 Check file selection 批准的 instance path 绑定到已声明 schema。 */
  readonly bindings: readonly JsonSchemaInstanceBinding[];
}
