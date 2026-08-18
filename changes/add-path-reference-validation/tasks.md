# Tasks

任务先锁定 segment ownership 与 grammar evidence，再实现 inventory-only resolution、Check/Record 接入和 owner 同步。

## Readiness

- [x] 0.1 已核对 proposal、design 与 tasks 均以“批准文本中的高置信度 project-local reference”为目标，并明确不是 Markdown destination、absolute-path audit 或 dependency graph。
- [x] 0.2 已读取 Scan Scope、Architecture、Configuration、Output owner，恢复 format-aware Check、Check/Record identity 活动决策，并核对 Check/Record、Project Definition、file policy 与 Markdown Link 的实施依赖。
- [x] 0.3 已确定首版 segments、token grammar、base resolution、inventory-only target index、defect record types、line-independent identity、无缺陷/defect 的 `passed/failed` 映射、informational-record 分类边界、execution/protocol failure 和非目标；没有阻塞实施的开放问题。

## Implementation

- [ ] 1.1 在依赖 seam 落地后先运行 `bun run test-evidence -- check --root .` 并恢复相关 Markdown、scope、record/output Cases；为 supported/unsupported grammar、destination exclusion、inventory lookup、escape、identity 和 safe output建立失败证据。
- [ ] 1.2 接入 Markdown visible-prose/inline-code segment handoff与显式 plain-text inputs，在结构边界排除 destination、GFM autolink、reference target、image target、fenced code 和 front matter，不重新解析 raw Markdown。
- [ ] 1.3 实现封闭 token classifier与 source-relative/project-root-relative lexical normalization，覆盖directory与line/column suffix、case semantics、URL/absolute/drive/UNC/glob/template/import排除，以及root escape的zero-filesystem-access证据。
- [ ] 1.4 从 global normalized inventory建立 immutable file/directory index；实现 unresolved/out-of-scope resolution，证明 resolver 不 lstat、realpath、follow symlink、读取 target、重新遍历 root或恢复excluded/generated/vendor path。
- [ ] 1.5 注册 Path Reference Check、两个 defect record types、closed policy 与私有 binding；实现 safe semantic identity、current location、deterministic record order，并明确映射无本 Check 领域缺陷为 CheckResult `passed`、存在 unresolved/out-of-scope 缺陷为 `failed`、execution/protocol failure 为 failed CheckRun + result null。未来 informational record 必须按 record type 分类而非使用总 record count；保留失败后已提交 record，并接入通用 DecisionPolicy/output snapshot。
- [ ] 1.6 同步 Scan Scope、Architecture、Configuration、Output、authoring declarations与语义 Cases，记录首版 source/grammar/non-goals和 Markdown occurrence owner。

## Verification

- [ ] 2.1 运行最窄 segment、classifier、resolver、scope、identity、no-defect/defect closed verdict、unsupported-token exclusion、record-type classification、record validation、execution/protocol CheckRun failure 和 output tests；测试正文或 Case 变化后运行 `bun run test-evidence -- check --root .`。
- [ ] 2.2 运行产品 import boundary、`bun run typecheck -- product`、`bun run lint -- product`、`bun run test -- product` 与相关 CLI acceptance，使用不同宿主 checkout root证明公开结果只含project-relative信息。
- [ ] 2.3 运行 `bun run validate` 和 `bun run verify:vibe-check-workspace:required`，复核最终 diff 没有第二个 Markdown parser、target filesystem scan、dependency inference、location-based identity或未记录 public contract drift。
