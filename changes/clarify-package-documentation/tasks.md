# Tasks

## Readiness

- [x] 0.1 完成篇章级审查并取得用户实施批准。
- [ ] 0.2 通过 Change Plan 生命周期命令校验与状态迁移。

## Implementation

- [x] 1.1 重排 README、工具指南、API 机制和调度示例。
- [x] 1.2 迁移内部实现规则、修复直接迁移残留和 Case owner。
- [x] 1.3 同步 published inventory、示例来源与投影。

## Verification

- [x] 2.1 通过 docs projection、文档校验与目标 docs tests。
- [x] 2.2 完成独立信息保真审查、Case 完整性与完整 Gate 的 installed consumer 验收。

## Check guide follow-up

- [x] 3.1 修复十条摘要/五条 preview 表述与 function waiver 示例，收敛各 Check 通用说明重复。
- [x] 3.2 将 analyzer/cache 维护细节交回内部 owner，保留必要用户边界与差异。
- [x] 3.3 完成示例实际使用验证、独立语义复核和新 candidate 完整 Gate。

用户明确先修文档；preview 配置和截断 Hook 待方案确认，本轮不实施。

## Evidence

`change-plan list` 与直接 `test-evidence check` 被运行策略拒绝；没有通过别的运行器绕过。
Terra 的文档投影、docs validation、render/check-guides tests（5/5）与 diff check 已通过。
主代理反查用户说明、输出 readback 与示例，补回 progress visibility、tee failure 和 message/fact 分工；
Terra 对主代理维护的内部 owner、导航与 Gate 文档完成独立只读语义审查，无阻塞问题。
迁移 owner 后运行 Finding、console capture、diagnostic logger 与 progress 目标测试，17/17 通过。

最终 `bun run docs:api`、`bun run validate -- docs` 与 `git diff --check` 通过。
`bun run check -- --all` 36/36 通过，包含 Semantic Case ledger、Markdown links、package artifact 与
installed consumer type/documentation/runtime acceptance。候选包 `0.0.0-local.c69e989315ae`，
`bun run package:status` 为 `current`。Gate evidence：
`.log/project-gate/2026-09-07T04-52-58.547Z-116295-8bb99c70-44ab-47e3-8a18-e85ba281468a`。

直接治理命令仍未成功：`change-plan list` / `plan` 与 `test-evidence check` 被运行策略拒绝；
Case 完整性由正式 Gate 的独立 Check 证明，Change metadata 仍保持 draft，未伪造生命周期迁移。

后续 Check guide 修复验证：function waiver 示例通过实际 public constructor 构造，完整保留 `{ identity, reason }`；
Finding presentation、function waiver 与 Markdown parse-facts cache 的目标 tests 10/10 通过。
主代理对用户文档实际 diff 反查，Terra 对主代理新增的内部 cache/provenance owner 独立只读复核。
共同呈现规则合并到 Finding 指南；各 Check 的文件选择、parser 入口和独有业务差异没有强行统一。
`bun run docs:api`、`bun run validate -- docs`、`git diff --check` 与最终 `bun run check -- --all` 全部通过（Gate 36/36）。
候选包 `0.0.0-local.afada4b41fc8`，状态 `current`；最新 evidence：
`.log/project-gate/2026-09-07T06-10-20.373Z-142520-f0de0826-0e84-4e28-b77b-17730cd56d05`。
本轮公共 API、runtime 和测试正文均未修改；preview options / Hook 保持待确认设计，不作为当前能力。
