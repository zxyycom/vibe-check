# Proposal

本Draft从仓库真正需要证明的质量事实重新形成权威Project Gate：Gate直接组合普通public`Check`values，TypeScript capability不再通过CLI/退出码回环，只有真实外部执行边界才保留subprocess。Minimal Check/Record Plan已经拥有aggregation与adapter cutover，本Draft只消费该结果，不重复迁移。

## Why

首轮 Gate build 为降低切换风险，明确把 legacy verifier 的 20 个 command leaves 一一迁入独立 process catalog；后续 hard cutover 只替换正式 bindings 并删除 legacy implementation，没有重新判断每个 leaf 是否仍是独立质量事实。这些归档证据证明切换安全，不证明迁移 catalog 是长期 authoring 或执行模型。

当前权威 Gate 仍把每个 entry 写成 `command` / `args` descriptor，再统一转换成 process Check。已有结构化 TypeScript API 的 docs、Decision Records 与 Test Evidence 因而经过 argv、console 和 exit code 后才重新形成 `CheckResult`；真正的外部工具也常先启动 Bun wrapper，再由 wrapper 启动目标程序。CLI 是否继续服务 focused developer workflow，与 Gate 是否应调用 CLI 是两个独立问题，不能用 CLI 的存在证明 process catalog 合理。

形成时 catalog 还保留了需要重新审计的重复或派生差异：quick/full quality 使用同一入口却占两个 Check identities；Test Evidence 已运行完整 Bun test surface，full profile 又重复运行部分 tests；foundation package gates 与 workspace scopes 存在覆盖重叠；scripts typecheck 在 Gate 已准备 candidate 后再次进入 preparation。固定的 `20 / 14 / 19` 数量与这些迁移选择绑定，不能继续代替质量事实判断。

相邻的[`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/)将Check final result收敛为`passed | failed | not-applicable | unavailable`，实现显式RunControls aggregation并迁移required/full adapter。本Draft以已经迁移的package aggregate和raw facts为输入，不重新设计aggregation。

## Outcome

### 主要结果

完成后，Project Gate 以“一个独立质量事实对应一个稳定 Check identity”为 catalog 原则。TypeScript-owned checks 直接调用 import-safe typed capability；需要外部程序、package cwd、锁定 toolchain 或 exact consumer isolation 的 Check 在自己的 execution 内显式建立 process boundary。focused CLI 可以继续作为同一 capability 的独立 adapter，但 Gate 不调用 CLI adapter，零独立消费者的 wrapper 才在单独 caller audit 后删除。

Repository quality 使用一个稳定 Check identity；required/full 确有不同行为时由同一 Check 读取规范化 profile flag 选择模式，没有真实差异时不创建虚假分支。Gate 删除重复 checks、迁移数量锁和不必要 wrapper chain，并重新证明 profile membership、dependency、candidate identity、partial eligibility、progress、process transcript 与 `0/1/2` adapter closure。上游 Record、typed dependency output、首版 result presentation 与 package API documentation 收敛后，本 Change 以 current exact artifact 写出 <code>gate-optimization-handoff.md</code>，供公开发布使用。

Minimal Check/Record Plan完成后，Project Gate已经消费package-owned aggregate，CLI adapter不再从snapshot或legacy GateResult重建summary。本Draft保持该边界，并只优化catalog、profile、native capability、CLI与process responsibilities。
