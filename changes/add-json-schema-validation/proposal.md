# Proposal

本 Proposal 是实现显式、离线 JSON Schema validation built-in Check 的临时计划，稳定契约由实施后同步的 owner 承接。

**恢复门禁：** 本 Plan 的实现路径与 Git 基线早于当前 `src/{definition,checks,core,run,output,foundation}/**` module owners；不得按旧 `src/product/**` 细节直接实施。恢复时先对照当前 owner、代码和测试重新完成语义审阅，更新本 Change 的 proposal/design/tasks，并运行 `bun run change-plan -- plan changes/add-json-schema-validation` 刷新基线。

## Why

合法 JSON 不等于 schema 自身有效或 instance 满足项目数据契约；当前仓库脚本只验证本仓库固定 materials，不能成为扫描外部项目的产品能力。Vibe Check 需要一个由项目显式声明 schema registry 与 instance binding、默认零网络且诊断可定位到两侧文档的统一 Check。

## Outcome

Vibe Check 提供 stable `checkId = json-schema-validation` 的 built-in Check，验证 JSON Schema 2020-12 schema documents、显式 local references 和 bound instances。Project Definition 在工作前产生唯一 registry/binding plan；Check 复用 strict JSON document service、通过受限 Ajv 2020 boundary 编译和评价，发布 dialect、schema、compile、reference 与 instance record types，并把领域失败、dependent work 短路和执行失败明确分开。

## Scope

### Intended Change

纳入：

- Project Definition 中 closed、serializable 的 schema registry、instance bindings 和 Schema-owned `maximumBytes`，以及 JSON Schema owner 对 bounded safe ID、path、dialect、selector、limit 和冲突的 validation。
- Schema / instance strict JSON、role-specific document defects、2020-12 dialect/meta-validation、compile、local `$ref` / `$dynamicRef`、instance evaluation、双侧 pointer/location和稳定 records。
- 显式 registry-only、project-bounded、零网络 reference resolver；已注册 URI identity 优先解析为本地已批准 bytes，未注册 remote URI 才拒绝，raw reference、userinfo、query和 credential-safe diagnostics。
- 一个预建静态 Check task内完成的 registry-only transitive resource closure、named-reference comparison、cache、输出、owner 文档和测试证据。

不纳入：其它 JSON Schema drafts、自动 dialect negotiation、remote reference opt-in、schema download/cache、code generation、instance coercion/default insertion、自动修复，以及把仓库 `scripts/**` registry 提升为产品默认。

### Resulting Impacts

上述 registry/binding 方案要求在执行前完成合法性与冲突校验，并将离线 reference closure、双侧诊断、comparison/cache 与领域失败边界一并收敛到该 Check。

## Success Criteria

- `json-schema-validation` 及五个 record type 具有唯一公共身份；schema document defect进入 `json-schema-invalid`，bound instance document defect进入 `json-schema-instance`，且 omitted、无 binding work、领域 defect 与 execution failure保持不同 CheckRun/CheckResult 语义。
- `schemas[].id`与`bindings[].id`都必须是1..64字符、匹配`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`的ASCII lower-kebab identity；binding `schemaId`只引用前者。Project Definition 在任何 schema work 前拒绝非法/duplicate IDs、未知 schema ID、非法 `maximumBytes`、越界/非 inventory path 和一个 instance 匹配多个 bindings；Schema/file policy只能为已批准 schema/instance path解析合法 limit，不能扩大 inventory或 claimed paths，也不按文件名、目录、文档顺序或 instance 内容猜测 binding。
- 一个执行前预建的静态 task消费完整 frozen registry/binding plan，并在task内部依次完成 strict JSON、registry-only reference closure、dialect/meta-validation、compile和instance evaluation；运行期 closure不创建Task或Task edge，独立 bindings继续且不产生 synthetic blocked record。
- Resolver 只读显式 registry中的 project-local resources；canonical URI精确命中已注册 resource时即使是 HTTP(S) identity也只离线读取对应 approved bytes，未命中 table的 remote URI才形成 `remote-disabled`。Resolver不搜索目录、不访问 DNS/HTTP，也不在 record、message、log或 artifact泄漏 raw `$id` / `$ref`、credential、query、绝对路径或 backend wording。
- Public `schemaId` / `bindingId`与record identity只使用已验证的authoring IDs，绝不使用schema `$id`或canonical URI；comparison 与 cache覆盖实际 transitive schema closure而排除位置和无关设置。相关 owner、测试证据和 workspace required verification 全部通过。

## Affected Owners

- `docs/architecture.md`：Schema Check、JSON document service、private validator/resolver 与 Core 边界。
- `docs/configuration.md`：Project Definition registry/binding/`maximumBytes` authoring、neutral behavior和文件政策。
- `docs/scan-scope.md`：schema/instance exact inputs、claimed paths和local resource approval。
- `docs/output.md`：Check/record catalogs、双侧位置、安全诊断和 transitive relations。
- `docs/testing.md` 与 `docs/testing/cases/`：configuration、conformance、reference security、comparison/cache及入口证明。
- `src/product/**`：唯一 runtime 实现 owner；`package.json` / lockfile承接实际 runtime validator dependency。
