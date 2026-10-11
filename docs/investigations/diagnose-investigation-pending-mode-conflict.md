---
title: "Investigation 暂存的可执行资源模式冲突"
id: "261011-diagnose-investigation-pending-mode-conflict"
formedAt: "2026-10-11T07:48:22Z"
question: "目标索引 pending 与 HEAD 相同且集合检查通过时，为什么 all 暂存仍报 pending-conflict，index/domain 分步能否安全恢复？"
tags:
  - "investigation-report"
  - "tooling"
relations: []
---

## 形成时背景

2026-10-11，为文件轨道文档构造本地待提交快照。Decision 的五条本轮记录已通过公开 CLI 暂存；
随后两次 `bun run investigations -- stage 261008-fast-glob-git-collection-boundaries` 均报告
`state-index.pending-conflict`、`outcome: no-change`。第二次调用前已核对目标索引 pending 与 HEAD 相同，
集合全量检查通过，且无已知并发写入。本轮不重复默认暂存，只调查门禁与安全恢复边界。

## 调查目的

解释目标索引字节没有 pending 冲突时，默认 `all` scope 为什么仍失败；
判断公开 `index` / `domain` 分步是否能保留其它 pending 并完成暂存。
范围仅为有界诊断、报告与既有 CLI 恢复，不修改工具、Product 或历史资源的模式。

## 调查范围与依据

证据在 2026-10-11 取得，HEAD 为 `cad0756ae6c9e4af90e7a74fa61de4c2a7d97a76`。
实际读取项目入口、Investigation skill 固定契约/恢复手册、`help stage`，
以 `git ls-files -s`、`git ls-tree HEAD`、`git rev-parse`、`git hash-object` 和 cached diff 核对现场。
CodeGraph 搜索 `pending-conflict` 无命中，随后读取
[公开入口](../../scripts/investigation-report/command.ts)及其
[实际加载工具的 source map](../../.codex/skills/investigation-report/scripts/check-investigations.mjs.map) 中内嵌源码。
这些源码是本次 bundled runtime 的诊断依据，不是项目内新的编辑入口。

| 对象 | 实际观察 |
| --- | --- |
| `docs/investigations/investigation-index.json` | pending 与 HEAD blob 均为 `0d3e586e0b3c7f0f493a6a0d9106beffd04ee184`；报告创建前工作树 blob 为 `0296c269241a1e1a358c8129a025068ce706ce9d`；cached diff 为空。 |
| 历史资源 `260908-calibrate-gate-duration-variation/measure.sh` | HEAD 和 pending 均为 `100755`，blob `5fac355aa653718d17e0db172b03a921f888be94`。 |
| 同 owner 的 `summarize.py` | HEAD 和 pending 均为 `100755`，blob `7801c1a46d9e2fa4803d08ac44b18b8e573a6302`。 |
| 已有 Decision pending | 本轮五条记录的索引/正文/迁移路径已暂存；诊断不更改它们。 |

实际加载源码的因果链：

1. `tools/investigation-report/src/staging-domain.ts` 的 `writeDomainPending` 将 `all` 和 `domain`
   都交给 `replacePendingFiles`，`pathScope` 是整个 `docs/investigations`，`expectedFiles` 是该范围的完整 pending。
2. `tools/shared/src/version-control/git-pending-replacement.ts` 先校验 revision，再读取完整范围并调用
   `assertExpectedEntries`；不通过时抛 `pending-conflict`，在实际写入之前停止。
3. `git-pending-values.ts` 的 `sameExpectedPendingEntries` 对每项要求 `mode === defaultGitBlobMode`，
   `git-core.ts` 将该常量定义为 `100644`。因此上述未变的 `100755` 资源也不满足门禁。
4. `tools/index-runtime/src/staging-operation.ts` 的 `index` scope 只替换目标索引单一路径，
   其当前 mode 为 `100644`，既有 pending 必须等于 HEAD；本现场符合该前置条件。

未运行产品测试、修改底层实现或构造额外模拟仓库；不声称已修复所有暂存失败类型。

## 调查结果与边界

**已确认阻断条件是整个调查范围内的历史可执行资源模式，而非目标索引 blob 的变化。**
两个资源原本就存在于 HEAD，保持原样仍触发严格 expected-entry 模式门禁；
该条件解释了无并发、目标索引未暂存时的默认 `all` 失败。

公开 `index` scope 可安全暂存所选旧报告的索引投影，保留其它 pending；
但 `domain` 仍覆盖同一个完整调查范围，拆分调用不能消除已确认的模式条件。
不修改历史资源 executable bit、不直接 Git add 报告、不替换索引实现，亦不盲试 `domain`。
新的诊断报告暂不进入 pending；只选择原报告 ID 不会把它混入该次索引投影。

本轮实际执行 `bun run investigations -- stage 261008-fast-glob-git-collection-boundaries --scope index` 成功，
仅暂存原报告的索引投影，无法闭合 `domain`。为避免不完整提交，主代理核对 HEAD 与 staged blob 后，
精确恢复该单个索引 pending 到 HEAD；目标工作树与 Decision pending 前后不变，两个历史 executable 资源保持原样。
本轮未留下部分索引暂存，工具当时尚未修复，未尝试绕过模式门禁。
后续修复应覆盖未变可执行资源、pending 模式保持和无关 pending 保护；
本报告保存上述基线的形成时认识，不代替升级后的实际恢复验收。
