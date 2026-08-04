本 proposal 为非代码质量检查建立共享产品契约；它是临时 change artifact，尚未表示方案已审计或获准实现。

## Why

Vibe Check 当前只能把文件行数、函数结构和重复片段归一化为数值 warning，且 scan completeness 与 machine v1 固定为三个 capability。Markdown、JSON、schema、secret 与网络链接检查如果直接挂到现有 file metrics 上，会重新混淆输入资格、检查完成状态和 finding 语义，并让不理解该格式的 scanner 消费非代码文件。

## What Changes

- 新增 Product-owned capability descriptor 与 selector 边界：所有 capability 只从 normalized scan inventory 选择自己的 exact inputs，adapter 不重新遍历 project root 或解释 scope globs。
- 新增通用 `FindingRecord` 核心模型，以 discriminated metric、content 与 security variants 表达共同位置、严重度、语义 check identity、message、suggestion、acceptance、可选稳定 fingerprint 与 registry-owned typed evidence；非数值 finding 不再伪造 numeric value，feature-specific pointer、threshold 与关联位置也不必塞进 backend message。
- 新增与 finding 正交的 `ObservationRecord`：成功 capability 可发布 current-only、非阻断的路径级数值事实；descriptor registry 拥有 metric ID、unit 与 subject-kind catalog，Markdown 长度等“无违规也应可见”的度量不必伪装成 finding。
- 将 current capability results、completeness reducer、finding channels 与 gate evaluator 改为消费 descriptor registry；descriptor-owned causal input path set 让 multi-input finding 按实际 source/target/transitive dependency 判断 changed，同时保持 `regressions` 是 `changed` 子序列且baseline只接受调用者显式指定；现有 file/function/duplicate capabilities 作为已注册成员保持原测量语义。
- **BREAKING**：将 current machine contract 升级到 v2，使 metrics schema 能无损投影 observations、finding variants 和 registry-owned capability results，warning stream schema 投影 findings；保持 canonical artifact filenames 与单一 mapper/validator/publication chain，不提供 dual writer 或宽松 v1/v2 reader。
- 保持 normalized scope、profile request、`skipped` / `no-input` / `succeeded` / `failed`、overall completeness、accepted/non-blocking finding 与 output failure 的既有优先级；本 change 不实现任何具体 Markdown、JSON、schema、secret 或网络规则。

## Capabilities

### New Capabilities

- `content-findings`: 定义 capability descriptor、capability-specific exact inputs、通用 finding variants 及其与 comparison、acceptance 和 gate 的共享语义。
- `content-observations`: 定义成功 capability 产生的非阻断 current observation、registered metric catalog、稳定位置与 machine/human projection。

### Modified Capabilities

- `scan-scope`: 从单一 scanner 分类扩展为 registry-owned capability selectors，并继续保证所有 adapter 只接收 Product-approved exact inputs。
- `scan-completeness`: 从固定三项手写 membership 改为 descriptor registry 的完整 final-result membership，同时保持 status 与 overall reducer 语义。
- `quality-metrics`: 将 metric-only warning generation、channels 与 gate evaluation 扩展为通用 findings，且不把 capability failure 当作 finding。
- `output-contract`: 发布 single-active machine v2 finding union 与 registry membership，保持 byte grammar、set invariants、可信 publication 和 consumer validation 边界。
- `scan-configuration`: 将 selected config context 对 machine output 的引用从 superseded v1 更新为 current v2，不改变本 change 的 public config v1 field tree。

## Impact

- 影响 `src/product/quality-core/**` 的 scope selector、capability model、observation、finding/channel、gate、validation 和 cache identity。
- 影响 `src/product/**` 的 machine schema-derived DTO、mapper、serializer、artifact-set validator、report/console projection 与 shallow public boundary。
- 影响 published machine schemas/examples、annotation consumer、相关 owner docs 和测试 fixture；v1 consumers 需要迁移到 v2。
- 后续 content/security capabilities 必须依赖本 foundation，并各自拥有规则、配置、scanner dependency 与验收边界。
