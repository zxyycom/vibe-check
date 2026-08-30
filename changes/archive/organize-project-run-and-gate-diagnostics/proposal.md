# Proposal

本 Change 让一次 Project Gate invocation 的核心时间线、外层终端过程和子进程输出按阅读目的直接可查。

## Why

当前 Product diagnostic log 为每个事件输出英文摘要和完整 `details` JSON：实际一次 full Gate 的 354 个事件形成 708 行、约 152 KB，其中 Record 与 Scheduler 决策占据大部分篇幅。维护者难以快速筛选 Check、阶段、决策和异常。与此同时，Gate 在 Product Run 之外形成的 candidate、selection、聚合说明、性能 observation、最终结果和退出映射只出现在终端；Check-owned process transcripts 又与 invocation 根级事实平铺，降低目录可读性。

## Outcome

维护者无需断点调试或额外重跑，即可从一个 invocation directory 中筛选紧凑的 Product core 时间线、读取从 Gate transcript 建立后开始的外层 plain transcript，并在独立子目录检查具体 Check 的 process transcript。

## Scope

### Intended Change

- 将 Product-private diagnostic rendering 改为一条主行表达一个事件：使用 `[]` 标签突出 component、Check、phase、decision/outcome 等高频筛选维度，并用有界语义 facts 代替强制的英文摘要加通用 JSON 包装。
- 在成功创建 Gate invocation directory 后同步记录 Gate console 与 direct stdout/stderr plain transcript 到根级 `gate.log`，覆盖 Product progress、Gate performance observation、最终结果和 process exit mapping。
- 将 Check-owned process transcripts 从 invocation 根移动到 `process/<check-id>.log`。
- 同步 current owner 文档、目标测试和语义 Case 账本；保持 `run.json`、`records.ndjson` 和 Product core log 的既有事实责任。

### Resulting Impacts

- Product diagnostic observation 的私有形状、格式化测试和 Run/scheduler/Check lifecycle 测试需要同步；该一次性文本仍不建立 parser、schema/version 或跨版本兼容契约。
- Gate transcript 必须在不改变终端输出的前提下按 invocation 隔离、恢复被包装的 console/process writers，并明确处理创建、追加和关闭失败。
- Gate process adapter、测试 fixture、文档和 Case 证明需要使用 `process/` 新路径；不提供根目录旧路径的双写或兼容读取。
- Gate invocation 根新增一份 `gate.log`，但不新增 `gate-result.json`，也不复制 machine Check/Record facts 形成第二事实源。

## Success Criteria

- Product diagnostic log 的普通事件各有一条带可筛选 `[]` 标签的主行；Scheduler 每次决策仍保留当时 capacity、blocker、trigger 与 reservation 事实，Record 和异常的长数据使用有界续行。
- 一次成功建立 transcript 并完成关闭的 Gate 在 `gate.log` 中留下无 TTY 控制序列的 Gate console/direct stdout/stderr 内容、性能 observation、唯一最终 result 与 exit status，同时终端继续获得原输出；setup 或 close 失败明确映射为 unavailable 并显示已创建的 invocation directory。
- 所有已进入 process handoff 的 Check-owned transcripts 只写入 `process/` 子目录，invocation 根保留 Gate、Product 和 machine 根级事实。
- current owner 文档、目标测试、Case 账本、Test Evidence 闭合和 required workspace verification 与实现一致。

## Affected Owners

- `docs/api-mechanics.md#outputs-与-runresult-边界`
- `docs/architecture.md#runtime-boundary`
- `docs/script-tooling.md#project-gate`
- `docs/coding-style.md`
- `docs/testing.md` 与 `docs/testing/cases/**`
- `src/project-run/diagnostic-logging/**` 及相邻 Run、Check execution、scheduler 实现和测试
- `scripts/project/gate/**` 及相邻 repository tooling tests
