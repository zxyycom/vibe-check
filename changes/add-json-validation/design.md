# Design

本设计把 strict JSON 建成一个领域自洽的 built-in Check，并只通过计划中的 Check/Record、Project Definition 和文件政策边界接入产品。

## Context

当前 `src/product/**` 已有 TypeScript/Bun CLI、normalized scan scope、JSON config parser、cache、comparison 和 machine/human output，但仍使用现有 capability/warning 模型；普通项目 JSON 不是独立产品检查。活动决策已确认后续使用 runtime-resolved Check/QualityRecord core、静态 TaskPlan、Bun TypeScript Project Definition、Check-owned 文件政策和格式感知 built-in Checks，这些方向目前仍是 unaligned，必须由其基础 Change 先完成或与本 Change 同一实施序列落地。

本 Change 使用以下实施前置：`establish-check-record-core`、`establish-check-task-orchestration`、`adopt-typescript-project-definition` 和 `add-file-policy-overrides`。计划可以先确认；实现任务只有在这些基础 contract 可用且与本文一致后才开始。

## Goals / Non-Goals

目标：

- 对 resolution 批准的普通 JSON exact inputs 给出严格、确定且可定位的领域结果。
- 固定 JSON Check 和 record type 的公共身份、record 语义与 CheckResult / CheckRun 分界。
- 让位置用于导航、语义字段用于 identity，使纯排版或行移动不制造新记录。
- 把 parser dependency、AST/token、异常和资源控制限制在一个可替换的 JSON document boundary。

非目标：

- 不支持 JSONC、JSON5、formatting、rewrite 或 formatter integration。
- 不替代 Project Definition loader 或仓库 docs validator，也不让 JSON 文件自动进入代码 metrics。
- 不执行 JSON Schema dialect、reference 或 instance validation；这些由 `add-json-schema-validation` 拥有。
- 不创建第二套 scope collector、policy evaluator、record manager、comparison engine 或 output serializer。

## Decisions

### 1. 基础 contract 是实现前置，不是阻塞 plan 成熟度的探索项

实现顺序为 Check/Record core → shared task orchestration → TypeScript Project Definition → file policy → 本 Change。实施开始时只核对实际 public ports、identifier grammar 和 authoring envelope；若基础最终名称发生机械变化，按同一语义更新本文，不增加旧模型兼容层。当前计划已经固定 JSON 自己拥有的行为、记录和验收，不再等待另一次产品方向决定。

### 2. 固定一个 Check 和三个 Record 类型

本 feature 固定 `checkId = json-validation`，并在其 catalog 下注册：

- `recordTypeId = json-syntax`：strict decoding / grammar / complete-consumption defect。
- `recordTypeId = json-duplicate-key`：同一 object scope 中 decoded 后相同的 member name。
- `recordTypeId = json-unsupported-input`：binary-like input 或超过 owner policy 的输入。

Project Definition 通过当前 built-in reference 选择该 Check。JSON owner 接受 owner-validated、serializable `maximumBytes`，范围为 `1..67108864`，Product neutral definition 使用 `5242880`。文件政策可以在 global inventory 已形成后关闭某个 path 的 JSON 资格或覆盖该 path 的 `maximumBytes`；它不能重新纳入 scope 外文件，也不能提供 parser/library/backend 字段。

Definition 被省略时 run 为 skipped；被选择但没有 ordinary JSON exact input 时在执行前完成为 not-applicable；存在输入时始终执行，即使任务数为零的实现细节发生变化。

### 3. Scan Scope 和 JSON owner 共同形成唯一 exact-input plan

Selector 只消费本 invocation 的 normalized project-relative inventory、format classification 和 resolved JSON policy，稳定排序后交给 Check binding；adapter 不接收 root 用于 walk/glob。首版只有 ordinary `.json` eligible，`.jsonc`、`.json5` 和其它 JSON-like formats 不因 suffix 猜测进入。

当同一 invocation 的 `json-schema-validation` 显式声明 schema 或 instance binding 时，resolution 把这些路径交给 schema Check；普通 JSON Check 不再为同一 bytes 生成平行 syntax/duplicate records。Schema Check 复用下述 document service，而不是复制 parser。该 arbitration 只消除重复 owner，不改变全局 inventory，也不让一个 Check 动态注册另一个 Check。

### 4. Product-owned JSON document service 固定 strict byte contract

内部 service 接收 approved path、immutable bytes 和 resolved limit，返回 closed Vibe Check-owned result：完整 parsed value + token/pointer location index、ordered document defects，或 typed execution failure。它必须：

- fatal decode UTF-8 并拒绝 leading UTF-8 BOM；
- 实施 RFC 8259 strict grammar，允许任意合法 root value和合法 insignificant whitespace；
- 拒绝 comments、trailing comma、malformed escape/number 和 root 后非空白 bytes；
- 在每个 object scope 比较 decoded key，识别 literal/escape 等价的 duplicate keys；
- 保留 one-based line/column 和 zero-based byte range，但不向 Core 暴露 parser-native AST/error。

实现可以选择满足 contract 的最小 dependency 或 Product-owned parser；选择只需通过 Bun compatibility、license、维护性、duplicate-key/token-span、深度和 adversarial fixture 审计，不建立 public provider/factory。禁止 `JSON.parse` 加 regex pre-scan，因为它不能可靠保留 duplicate-key 与嵌套 token span。

### 5. 领域 defect、领域 verdict 与执行失败保持分离

每个 input 是一个静态 domain-work handle；TaskPlan 可以一文件一 task，并由 shared scheduler 统一预算。成功完成 parsing 后即 acknowledgement，即使产生 defect records。所有 applicable inputs 正常完成且没有 defect record时 CheckResult 为 passed；存在任一 syntax、duplicate 或 unsupported record 时为 failed。

Read error、parser boundary throw、资源预算中断或 normalized result 违反 catalog 是 execution failure：CheckRun failed 且 result 为 null。已经由 RecordManager 有效提交的 records 不撤销，但不能据此把 run 提升为 completed。`not-applicable` 只由执行前的空 exact-input plan产生。

### 6. Record fields、位置、identity 与排序由 JSON owner 固定

所有 records 使用 normalized project-relative subject path 和当前 source location。闭合领域字段为：

- `json-syntax`：stable `reason`，可用时带 normalized JSON Pointer 和 bounded structural context kind。
- `json-duplicate-key`：normalized JSON Pointer、decoded key 的安全结构 identity，以及第一次定义的 secondary location；primary location 指向后一次定义。原始 member value 不进入 record。
- `json-unsupported-input`：`reason = binary | maximum-bytes-exceeded`；size case带 `actualBytes` / `maximumBytes`，binary case不保留原始 bytes。

Record identity 只使用 `(checkId, recordTypeId)`、normalized subject path 与 catalog 标记的 reason/pointer/semantic occurrence fields。Line、column、range、byte offset、message、suggestion、actual byte count、threshold、parser wording和arrival order都不参与。没有 pointer 的 syntax defect使用 stable reason + bounded normalized token-context identity，不能只用绝对 offset。Records 按 path、record type、pointer/semantic occurrence稳定排序。

### 7. Comparison 和 cache 都由 producing Check 管理

调用者显式提供 named reference 后，current 与 reference 复用同一个冻结 Project Definition、JSON policy和 parser rules snapshot，但读取各自 revision 的 approved bytes。JSON Check 按 stable record identity生成 foundation 支持的 comparison relations；没有 reference 时保持 current-only，不从 Git history、cache 或 previous commit 推断。

Cache unit 为单个 exact input。Key 只包含 JSON rules version、relevant resolved policy、content fingerprint 和 internal implementation identity；report、artifact directory、acceptance reason、sibling Check settings 和 line location不参与。Completed zero/defect result可缓存；read/execution/invalid-result failure不能伪装成成功 cache entry。

### 8. Formatting 与 schema 保持独立

Strict JSON 的 whitespace、indentation、newline、key order 和合法 number representation不产生 record，也不改写 source。Formatting 若将来成立，使用独立 Check/record identity。JSON Schema 通过共享 document service获得 parse/location事实，但自己拥有 schema/instance result、records、reference graph和bindings。

## Risks / Trade-offs

- Accurate duplicate-key spans 可能增加 parser 维护面；用 escape-equivalent keys、Unicode、多字节 UTF-8、CRLF、deep nesting 和 malformed corpus约束最小 boundary。
- 大文件或深层输入可能耗尽 CPU/memory；selector先应用 `maximumBytes`，parser另有 invocation-owned depth/work budget，超预算不得 hang 或泄漏 partial trusted result。
- 无 pointer 的 syntax identity 只能 best-effort 稳定；bounded structural context比位置稳定，但大幅内容重写仍可合理形成新 record。
- JSON Schema ownership arbitration 需要两个 Check 共享 resolution 事实；用单一 claimed-path set和document service验证，不创建双 parser或重复 records。
- 基础 Changes 尚未实施；实际 ports 变化只允许机械重映射，若行为/owner 不再满足本文则重新审阅本计划而不是添加兼容 glue。

## Open Questions

无。公共行为、owner、identity、资源边界和验收已固定；具体 parser package 是受上述 contract 约束的私有实现选择。
