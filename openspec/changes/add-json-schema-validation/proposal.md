本 proposal 为显式绑定的 JSON Schema 2020-12 文档与 JSON instances 增加分阶段校验；它是临时 change artifact，尚未表示方案已审计或获准实现。

## Why

仅证明文件是合法 JSON 不能证明 schema 自身有效、引用可解析或实例符合预期契约；仓库脚本中面向固定 docs registry 的校验也不能替代通用 Product 能力。Vibe Check 需要一个受项目显式配置约束、可复现且不会隐式访问网络的 schema validation boundary。

## What Changes

- 在 `add-json-validation` 之后新增 JSON Schema capability，复用其 strict JSON parser/location contract，并严格分开 schema document/instance 自身 JSON、dialect meta-validation、compile、`$ref` resolution、instance binding 与 instance evaluation；同一路径只由一个 capability plan 负责，避免重复 finding。
- 首版明确支持 JSON Schema 2020-12；optional-but-complete `checks.jsonSchema` 缺失或未启用时 capability 为 `skipped`，启用后 schema selectors、registry entries 与 schema-to-instance bindings 必须显式配置，不按文件名、目录邻接、`$schema` 之外的猜测或“上一份 schema”推断。
- 本地引用只允许解析到normalized project-root内显式registry或被批准的schema documents；remote references默认禁用。引用finding只公开normalized schema/registry identity、project-relative target/pointer或stable reason，绝不输出raw `$ref`、userinfo、query、credential token或其digest。
- 注册exact checks `json-schema-dialect`、`json-schema-invalid`、`json-schema-compile`、`json-schema-reference`与`json-schema-instance`；primary location使用finding common fields，binding/instance/schema pointers、schema secondary location、keyword与stable reason使用typed evidence catalog，message/suggestion只做人读。
- Descriptor以primary path加binding实际使用的root/transitive schema/reference/instance paths构造causal input closure，维持`regressions ⊆ changed`；schema defect只产生已定义root finding并在internal plan短路dependent bindings，不新增binding machine diagnostic/shape。
- 复用content foundation、file policy、JSON validation与immutable machine v2 generic evidence语义；feature注册checks/catalog必须更新sorted public catalog的`semanticRegistryFingerprint`及examples/validator fixtures，但不得改变canonical schema bytes，adapter只接收Product-approved schema/instance inputs和已归一化bindings，不重新遍历root。

## Capabilities

### New Capabilities

- `json-schema-validation`: 定义 2020-12 schema lifecycle、显式 registry/binding、受限引用解析、instance evaluation 与精确诊断。

### Modified Capabilities

- `scan-configuration`: 在 common check schema 的 v2 base policy 增加 optional schema selectors、local registry 与 instance bindings；partial patch 只可作用于已声明 base section并控制 `enabled`，accepted check IDs 由 Product registry 承接。

## Impact

- 依赖 `standardize-quality-capability-contract`、`add-file-policy-overrides` 与 `add-json-validation` 先完成其 apply 前审计和实现。
- 影响 Product Config v2 schema/default/mapping/init materials、Core capability selector、schema dependency boundary、reference resolver、finding/completeness/comparison/cache、machine/human output 与对应 tests/fixtures。
- 该显式配置 shape 必须与 `add-file-policy-overrides` 的 single-active semantic config v2 原子交付并对 v1 执行 hard cut；不得让 v1 静默接受未知字段，也不得另建 merge engine 或在 public config 中暴露 schema engine/backend 名称。
