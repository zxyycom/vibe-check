# Proposal

本 Draft 在旧 workspace verifier 仍保留为正式门禁时，建立一个由候选 npm package 驱动的完整 Project Gate consumer。它把必要的仓库验收类别表达为 project-owned Definition、bound Run 和 adapter，并消费前置的 invocation controls 与 Product-owned progress；完成后可作为真实、并行验证的 gate，但尚不切换仓库唯一入口或删除旧实现。

## Why

现有 workspace verifier 有 20 个 command leaves、自己的 profile selection、process execution、日志、逐项输出与 exit mapping。若在同一 Change 内既重建这些核心结果、又把 CI/开发者唯一入口切换并删除旧脚本，任何迁移错误都会同时失去对照、回退和诊断路径。

构建一个可独立运行、candidate-backed 的 Project Gate 与把它设为唯一正式门禁是两个可审阅的交付：前者证明产品功能与 consumer integration，后者证明组织和仓库的 cutover。前者应先完成，且不以逐字兼容旧 verifier 为目标。

## Outcome

完成后会有一个项目拥有的 Gate Definition、bound Run 和明确的预切换 adapter。它通过 built 或 exact-tarball <code>vibe-check</code> package 覆盖当前基础门禁的必要类别，支持 project-local profile/disabled-tag eligibility，直接启用 Product progress effect，并把详细 process output 写入 project-owned per-Check logs。

旧 verifier 仍存在且仍是正式入口。此 Draft 写出 <code>gate-readiness-handoff.md</code>，其中记录类别映射、candidate identity、控制/输出行为、固定 capacity、对照验证及最终切换条件，供 [replace-workspace-verifier-with-project-gate](../replace-workspace-verifier-with-project-gate/) 使用。

完整上游输入与下游 handoff 见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。该导航不替代本 Draft 对 core-category mapping、对照和 acceptance 的具体设计。
