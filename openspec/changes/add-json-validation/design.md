本 design 说明 strict JSON capability 的实现边界与取舍；它是临时 change artifact，尚未完成阻塞审计。

## Context

当前 Product Core 从 normalized scope 构造三个 code-measurement capabilities 的 exact inputs，generic runtime 不校验项目 JSON；`scripts/**` 的 docs validator 只遍历本仓库固定 materials 并使用显式 registry，不是产品入口。Prerequisite `introduce-content-quality-foundation` 将提供 registry-owned capability selectors、通用 finding/completeness 和 machine v2；`add-file-policy-overrides` 将提供 semantic config v2 的 per-file check patches。Configuration 当前固定 v1、complete/closed/tool-neutral，不能原地增加字段。

JSON 文件同时跨越 byte decoding、grammar、source location、file policy、comparison 与 cache 边界。实现必须让 content defect 成为 finding、runtime defect 成为 capability failure，并避免 JSON suffix 反向扩大 code scanner scope。

## Goals / Non-Goals

**Goals:**

- 为 approved ordinary JSON exact inputs 提供 all-or-nothing strict parse 与完整 duplicate-key finding。
- 在 Product-owned selector、adapter、finding、comparison 与 cache owner 间建立清晰数据流。
- 让 source location 与 stable identity 分离：位置精确可读，行位移不制造 regression。
- 保持 parser implementation 和任何新增 dependency 在 internal boundary 内可替换。

**Non-Goals:**

- 不提供 general JSONC、JSON5、formatting、canonicalization、rewrite 或 formatter integration。
- 不替代 Product Config 的 Vibe Check JSON loader/runtime schema validation。
- 不让 JSON capability计算 LOC、function 或 duplicate-code metrics。
- 不在本 change 建立 schema meta-validation；它由 `add-json-schema-validation` 承接。

## Decisions

### Decision 1: 先完成共享 foundation 与 file-policy prerequisites

实现顺序固定为 `introduce-content-quality-foundation`、`add-file-policy-overrides`，然后才是本 change。JSON capability只注册 descriptor、selector、rules 与 adapter，不复制通用 `FindingRecord`、capability reducer、machine v2 或 per-file patch grammar。若 prerequisites 的最终 contract 与本 artifacts 不一致，阻塞审计必须先修订本 change，不能用兼容 glue 同时支持两套模型。

替代方案是在当前固定三 capability/machine v1 上直接添加 JSON warning；这会制造临时 output shape、重复 completeness 逻辑和后续迁移，因此拒绝。

### Decision 2: Common config v2 owner增加最小JSON base/patch

JSON只向`add-file-policy-overrides`建立的common check schema source增加optional-but-complete `checks.json.{enabled,maximumBytes}`；缺失保持未配置且不得由loader补默认。本feature规范性地向neutral default贡献enabled和5 MiB上限，runtime schema将maximum约束为1..64 MiB inclusive。Partial patch只可作用于base已声明section，base缺失时patch是config error；存在时复用ordered later-wins，`explain-config`复用同一resolution trace。Semantic check IDs `json-syntax`、`json-duplicate-key`与`json-unsupported-input`由Product registry注册并供acceptance复用。不建立JSON专用merge、global scope开关或backend options；v1继续closed hard cut。

`maximumBytes`是capability-owned resource/quality policy，适合按文件override；binary grammar无可用语义，不提供`allowBinary`。Formatting knobs在首版没有行为，因此不预留。

### Decision 3: Selector 是 exact-input 与格式分类的唯一 owner

Descriptor request predicate先处理profile/config：quick或section缺失为`skipped`；full时base enabled或至少一个in-scope path被override解析为enabled才请求，effective enabled全为false则`skipped`，requested selector空集为`no-input`。Selector消费normalized inventory与`ResolvedFilePolicy.checks.json`，输出deterministic project-relative JSON exact inputs以及binary/size disposition。Global generated/excluded path在inventory前已移除且override不能重新纳入。Adapter只读取这份plan，禁止root walk/glob expansion。Product-known`.vibe-check/config.json`在inventory中使用Configuration-owned document kind排除；generic`.jsonc`首版不eligible。JSON eligibility与code capabilities分别求值。

替代方案让 parser 递归查找 `.json` 或复用 file-metrics input list；前者越过 Product scope，后者会遗漏非代码 JSON并把格式资格耦合到 scanner language，均拒绝。

### Decision 4: Internal parser boundary同时返回完整 findings与位置索引

建立 JSON-specific internal boundary，输入为一个 approved path、immutable bytes与 resolved limits，输出为 closed result：valid root/position index、ordered content findings，或 typed execution failure。解析必须 fatal decode、拒绝 BOM、严格 grammar并在 object scope内比较 decoded key。实现可选用满足 duplicate-key callback和token span的现有 dependency，或由 Product-owned parser完成；具体依赖只有通过实现前审计的维护、license、Bun兼容、位置准确与 adversarial fixtures 后才能确定。

不使用 `JSON.parse` 加 regex pre-scan：`JSON.parse` 丢失 duplicate-key 与token位置，regex无法正确处理escape/nesting。也不向Core暴露第三方 AST/error object；boundary立即归一化成Vibe Check types，底层更换只影响这一处。

### Decision 5: 内容缺陷是 succeeded finding，执行缺陷是 failed capability

Syntax、duplicate-key、binary/size unsupported-input都是用户可修复、确定性内容结果；所有exact inputs均完成计划工作时 capability为`succeeded`，不因findings降为execution failure。Read error、unexpected internal exception、budget执行中断或normalized result invalid使 capability为`failed`；已收集partial findings可作诊断但不得形成可信成功。`no-input`仅在selector产生空exact-input plan时成立。

替代方案把parse error设为`failed`会让普通质量缺陷使scan completeness不可用；把read error设为finding又会误称已完整检查，均拒绝。

### Decision 6: Primary location与typed evidence catalog分别建模

Finding common path/location只承载current primary source：syntax最窄failure或duplicate第二次定义。Descriptor为`json-syntax`注册`syntaxReason:string` required、`jsonPointer:string` optional；为`json-duplicate-key`注册`jsonPointer:string`和`firstDefinition:location` required；为`json-unsupported-input`注册`unsupportedReason:string` required及size-only `actualBytes:number`/`maximumBytes:number` optional。每个catalog固定order、identity participation与normalized-structural-only redaction；secondary location/byte counts不参与identity，message/suggestion不作为machine data source。

Machine v2 schema已经拥有generic closed evidence union，只验证key/kind/value structure；JSON descriptor/artifact-set validator负责check-specific required/order/redaction。注册JSON catalog会进入sorted public catalog canonical SHA-256，因此实现必须更新expected `semanticRegistryFingerprint`、examples与validator expectations；同时用双向exact drift test证明fingerprint按预期改变而canonical v2 schema bytes不变，不能为JSON新增schema fields/branches。

### Decision 7: Stable fingerprint与source location分别建模

Finding保留current byte offset/line/column/pointer用于定位；comparison fingerprint使用check ID、normalized path、kind与pointer/member identity。没有完整pointer的syntax finding使用normalized kind和bounded token context hash，offset只作位置，不作identity。Changed先由invocation changed-file scope决定，regression再按foundation fingerprint语义比较。

替代方案把message或line/offset放入identity会让parser wording和whitespace位移制造噪声；完全忽略局部context又会把同文件多个syntax defects合并，故采用bounded context。

### Decision 8: Cache按单文件规则与内容闭合

JSON cache unit为单个exact input。Identity包含JSON rules version、measurement-relevant policy、content fingerprint与internal implementation identity；success zero/finding result可缓存，execution failure不可缓存。Current/baseline共享rules snapshot但各自基于revision bytes建key。Cache payload只保存normalized findings/必要位置数据，不保存backend-private对象。

替代方案使用全量config hash会被report/artifact等无关变化误伤；只使用path/mtime无法覆盖Git baseline materialization和content correctness，均拒绝。

### Decision 9: Formatting保持独立未来能力

Parser允许所有strict JSON insignificant whitespace与key order，不产生style finding、不rewrite bytes。未来若有真实需求，应以独立check ID/policy/fingerprint加入，不改变syntax/duplicate identity。

## Risks / Trade-offs

- [准确duplicate-key和source spans可能需要新增parser dependency] → 阻塞审计比较维护状态、license、Bun兼容和边界封装；用escaped-key、Unicode、CRLF、多字节UTF-8与deep nesting fixtures验证。
- [超深/超大JSON可能造成CPU或memory压力] → inventory/file-policy先执行size guard，parser配置明确depth/work budget；budget exceeded映射为actionable execution failure而非hang。
- [binary/size finding代表“有意不解析”，可能被误读为validated] → stable `unsupported-input` kind、action与capability summary明确文件未进入grammar stage。
- [syntax finding的bounded context fingerprint可能在大幅编辑后变化] →只承诺best-effort stable identity；pointer/duplicate-key拥有更强identity，并用comparison tests固定边界。
- [prerequisite artifacts并行演进] → tasks中的首项阻塞审计逐个核对capability ID、config v2 patch grammar、finding union、machine v2与exact-input contract。

## Migration Plan

1. 完成并审计 `introduce-content-quality-foundation` 与 `add-file-policy-overrides`，确认其长期 specs/docs/source已生效。
2. 在semantic config v2的common check schema注册JSON base/partial patch与semantic check IDs，同步neutral default、init/editor/example/docs；v1继续按hard cut拒绝。
3. 实现internal parser boundary、descriptor selector、finding normalization与single-file cache，先用direct fixtures证明byte/grammar/location。
4. 接入current/baseline、channels/gate与machine/human output，补formal Product CLI acceptance。
5. rollback以移除JSON descriptor/default并恢复相同v2 schema的feature-absent版本为边界；不得恢复machine v1或引入dual reader。

## Open Questions

无未回答开放问题，可以进入实现前审计；具体parser dependency只有在审计证据满足本design contract后才可选定。
