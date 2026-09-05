# Proposal

本 Change 将 source-aligned Lizard 移植的来源到仓库文件映射收敛为可维护的单一编辑源，并保留来源、identity 与行为证据的边界。

## Why

当前移植文件的来源信息、identity evidence 与路径整理需要跨多个材料保持一致。人工同步容易在上游来源、仓库路径或派生产物之间留下漂移，也难以让维护者区分“更新映射”与“重新证明行为”。

## Outcome

维护者能只编辑 provenance ledger，并通过经验证的维护流程检查来源到 target 的闭合；source identity 的 symbol/host-seam 人工选择与 analyzer 行为/parity 证据保持独立。

## Scope

### Intended Change

令 `licenses/lizard-1.24.0-provenance.json` 作为上游 source/range/hash/SPDX 到 translated target inventory 的唯一编辑源。直接从 inventory 得出 target closure，不保存无消费者的 count；以显式同步把 ledger 字节的 SHA-256 投影为 package legal-material audit 消费的 package-contract pin，并清除 identity JSON 的遗留派生 count。同步代码、最窄测试、Case 和维护说明。

### Resulting Impacts

`src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/lizard-1.24-source-identity.json` 继续拥有 source→symbol/host-seam 的人工 identity 选择及独立 `classes`/`symbols` completeness signal，不能由 ledger 推导或覆盖。维护命令不得推导或改写 symbol、host seam、hash、SPDX、license、oracle 或 analyzer 行为；不是一次 upstream update、运行时 API 或 Gate policy 变更。

## Success Criteria

唯一 ledger、identity evidence 和选定派生事实的 owner 可从文档恢复；默认 check 不写工作树，sync 仅更新 package pin 和遗留 identity count，且其预验证、拒绝零写入与后续写入失败恢复边界可验证；来源映射闭合、identity coverage 与行为/parity 各有独立证据；目标测试、Case closure、docs/Plan 检查及最终范围匹配 Gate 通过，或有明确失败归因。

## Affected Owners

`scripts/package/legal-materials/**`、`licenses/lizard-1.24.0-provenance.json`、analyzer source identity evidence、package legal-material audit、[脚本工具](../../docs/script-tooling.md)、[Check-owned scanner dependencies](../../docs/scanner-dependencies.md) 与相关 Case 账本。
