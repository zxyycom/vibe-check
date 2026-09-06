import type {
  ProjectFileSelection,
  ProjectFileSelectionOptions
} from "../project-files/configuration.ts";

/** 已注册 schema 的 root `$id` 与配置 identity 之间的全 Check 统一规则。 */
export type JsonSchemaIdentityMode =
  /** root `$id` 必须等于 `schemas[].id`，该配置 ID 也是 engine identity。 */
  | "require-match"
  /** 配置 ID 是 engine identity；object schema 的 invocation-local compile copy 使用该 `$id`。 */
  | "configuration-authoritative"
  /** 安全的 root `$id` 是 engine identity；配置 ID 仍是 binding 与公开事实的标签。 */
  | "document-authoritative";

/** 整个 Check 共用、不能按单个 schema 混用的 root schema identity policy。 */
export interface JsonSchemaIdentity {
  /** root `$id` 与配置 `schemas[].id` 的关系。 */
  readonly mode: JsonSchemaIdentityMode;
}

/** allowlisted 引用解析可读取的单一 Schema 来源及其固定边界。 */
export type JsonSchemaReferenceSource =
  /** Package 固定的 JSON Schema catalog；它不授权网络请求。 */
  | Readonly<{ readonly kind: "bundled"; readonly catalog: "json-schema-2020-12" }>
  | Readonly<{
      /** 只允许本 source 明确限定的 HTTPS reference scope。 */
      readonly kind: "https";
      /** 调用方为本 source 选择的安全稳定 identity，不是请求 URL。 */
      readonly id: string;
      /** 精确 HTTPS origin；不含 path、credentials、query 或 fragment。 */
      readonly origin: string;
      /** 已授权 URL path 的边界；从 `/` 开始，非 root prefix 必须以 `/` 结束。 */
      readonly pathPrefix: string;
    }>;

/** 本次 Check 解析 local、bundled 与 allowlisted Schema 引用的封闭策略。 */
export type JsonSchemaReferenceResolution =
  /** 只使用 local schemas 和允许的 bundled catalog，不读取额外 HTTPS schema。 */
  | Readonly<{ readonly mode: "offline" }>
  | Readonly<{
      /** 只从 `sources` 的精确 scope 读取额外 schema；没有 implicit registry、headers 或 redirects。 */
      readonly mode: "allowlisted";
      /** 完整替换的明确 source 集合；每项决定自身可读取的 reference scope。 */
      readonly sources: readonly JsonSchemaReferenceSource[];
    }>;

/** 调用方注册的一份 local schema resource；注册表不自动发现 schema。 */
export interface RegisteredJsonSchema {
  /** binding 与公开 facts 使用的安全 schema identity。 */
  readonly id: string;
  /** 已由 `files` selection 批准的 normalized project-relative `.json` path。 */
  readonly path: string;
}

/** 调用方将一个已批准 local JSON instance 明确绑定到已注册 schema 的关系。 */
export interface JsonSchemaInstanceBinding {
  /** 本次 Check 内唯一、用于公开 facts 的 binding identity。 */
  readonly id: string;
  /** 已由 `files` selection 批准的 normalized project-relative `.json` instance path。 */
  readonly instancePath: string;
  /** 必须引用 `schemas` 中已注册 schema 的 identity。 */
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
