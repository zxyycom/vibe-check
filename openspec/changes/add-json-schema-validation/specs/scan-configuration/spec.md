本 delta spec 将显式 schema registry/binding 纳入 semantic config v2；它是临时 change artifact，须通过实现前审计后才可执行。

## ADDED Requirements

### Requirement: Semantic config v2 owns JSON Schema validation policy

在 prerequisite `add-file-policy-overrides` 建立 complete、closed semantic config v2 后，existing `checks.files`、`checks.functions` 与 `checks.duplication` SHALL 继续 required；common check schema source另行允许optional closed `checks.jsonSchema` feature section。Section 缺失 MUST 表示 schema capability 未配置；loader MUST 保持缺失且不得补默认值。Section 存在时 MUST 完整、精确包含 boolean `enabled`、`schemas` array 与 `bindings` array。每个 closed `schemas[]` entry MUST 精确包含 unique non-empty string `name`、non-empty project-relative `files` glob array 与 literal `dialect = "2020-12"`；每个 closed `bindings[]` entry MUST 精确包含 unique non-empty string `name`、引用 existing schema name 的 string `schema` 与 non-empty project-relative `files` glob array。本feature SHALL向neutral default贡献并包含完整`checks.jsonSchema`，精确使用`enabled = true`及两个empty arrays；其同时依赖JSON feature对neutral default贡献的`checks.json.maximumBytes = 5242880`。

声明 `checks.jsonSchema` 的 base document MUST 同时声明完整 `checks.json`，因为 schema document/instance strict JSON stage消费其 `maximumBytes`；该shared bound MUST满足JSON owner规定的inclusive `1..67108864`。缺失该sibling section或bound无效 MUST是cross-field/field config error，loader不得从neutral default补入。`checks.jsonSchema`缺失时不反向要求`checks.json`。

`overrides[].checks.jsonSchema` SHALL 是从同一 source 派生的 closed partial patch 且只允许 boolean `enabled`；它只可 patch selected base document 已声明的 `checks.jsonSchema`。Base section 缺失而任一 override 声明该 patch MUST 是 path-aware config error，resolver MUST NOT用partial patch构造section。Registry/binding arrays 是 base-only invocation policy，不能按 path 替换或合并。Selectors MUST 使用 Product-owned file policy/path grammar，global scope 外 path 不可被重新加入。`ResolvedFilePolicy` 与 `explain-config` SHALL 显示每个 path 最终 schema enabled/provenance，同时 registry/bindings 仍来自同一 selected base document。

Runtime schema、derived type、neutral default、init candidate、editor schema、canonical example、docs 与 mapping MUST 同步 v2 exact shape。Current v1 MUST 保持 closed 并因 version/unknown fields 拒绝 schema policy；loader MUST NOT dual-read v1+extensions、partial merge、从 filename 生成 registry/binding，或暴露 engine/library name、command、args、remote fetch client 与 backend options。Config normalization/plan MUST 在 scan work 前拒绝 duplicate names、unresolved registry references、unsupported dialect、schema selector 不恰好命中一个 approved file、outside-root path 与 overlapping instance bindings，并提供 field/instance-path-aware exit `3` diagnostic。

Product capability registry SHALL 注册exact semantic check IDs `json-schema-dialect`、`json-schema-invalid`、`json-schema-compile`、`json-schema-reference`与`json-schema-instance`；schema/instance strict JSON defects复用`json-syntax`、`json-duplicate-key`与`json-unsupported-input`。Accepted-finding validation/matching SHALL从该registry承接，不在config schema另建手写enum。

#### Scenario: Complete v2 schema policy is accepted

- **WHEN** selected config v2 完整声明 2020-12 registry entries 与 non-overlapping instance bindings
- **THEN** Product Config 返回 detached、readonly、tool-neutral normalized policy
- **AND** schema capability 接收 explicit registry/bindings而不是重读 document 或推断 filename

#### Scenario: Missing section remains unconfigured

- **WHEN** complete v2 document 省略 `checks.jsonSchema` 且 overrides 也不声明 schema patch
- **THEN** loader 保持 schema feature absent，full/quick planning 都将 capability 标记为 `skipped`
- **AND** loader 不从 neutral default 补入 schema section

#### Scenario: Present section requires JSON base

- **WHEN** complete v2 document 声明完整 `checks.jsonSchema` 但省略 `checks.json`
- **THEN** Product Config 在 scan work 前报告 cross-field path-aware error
- **AND** loader 不补入 JSON section 或猜测 `maximumBytes`

#### Scenario: Present section must be complete

- **WHEN** v2 document 声明 `checks.jsonSchema` 但缺少 `enabled`、`schemas` 或 `bindings`
- **THEN** closed runtime schema 在 scan work 前拒绝 incomplete section
- **AND** loader 不补齐缺失 leaf

#### Scenario: Override only controls per-file enablement

- **WHEN** matching override 声明 `checks.jsonSchema.enabled = false`，或尝试声明 `schemas` / `bindings`
- **THEN** 前者只缩小该 path 的 schema exact-input eligibility，后者被 closed patch schema 拒绝
- **AND** registry/binding arrays 保持 selected base document 的 invocation-wide policy

#### Scenario: Override cannot construct missing base section

- **WHEN** complete v2 base 省略 `checks.jsonSchema`，但任一 override 声明 `checks.jsonSchema.enabled`
- **THEN** Product Config 在 scan work 前以 path-aware diagnostic 拒绝 document
- **AND** file policy resolver 不用 partial patch 构造 schema policy

#### Scenario: V1 cannot silently accept new shape

- **WHEN** version `"1"` document 添加 schema registry或 binding fields
- **THEN** closed v1 runtime schema 在 scan work 前拒绝 unknown fields并指向 v2 migration
- **AND** loader 不删除 fields、降级或按 v1 继续扫描

#### Scenario: Public policy does not expose backend

- **WHEN** reviewer 检查 config runtime schema、types、starter、editor schema、example与 docs
- **THEN** fields 只表达 dialect、schema IDs/selectors、instance selectors与 bindings
- **AND** 不包含 schema engine/library name、command、args、compile flags或 remote client配置

#### Scenario: Conflicting instance mappings are rejected

- **WHEN** normalized v2 selectors使一个 approved instance匹配多个 binding IDs
- **THEN** Product Config 以 exit `3` 报告 instance path与 conflicting IDs
- **AND** scan 不启动 schema compile/evaluation或按 declaration order选择 mapping
