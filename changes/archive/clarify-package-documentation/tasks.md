# Tasks

按已完成的文档实施、形成时验收与本轮治理收尾恢复交付状态；不把旧执行限制当作当前阻塞。

## Readiness

- [x] 0.1 完成篇章级审查并取得用户实施批准。
- [x] 0.2 通过 Change Plan 生命周期命令校验与状态迁移。

## Implementation

- [x] 1.1 重排 README、工具指南、API 机制和调度示例。
- [x] 1.2 迁移内部实现规则、修复直接迁移残留和 Case owner。
- [x] 1.3 同步 published inventory、示例来源与投影。

## Verification

- [x] 2.1 通过 docs projection、文档校验与目标 docs tests。
- [x] 2.2 完成独立信息保真审查、Case 完整性与完整 Gate 的 installed consumer 验收。

### Check guide follow-up

- [x] 3.1 修复十条摘要/五条 preview 表述与 function waiver 示例，收敛各 Check 通用说明重复。
- [x] 3.2 将 analyzer/cache 维护细节交回内部 owner，保留必要用户边界与差异。
- [x] 3.3 完成示例实际使用验证、独立语义复核和新 candidate 完整 Gate。

用户明确先修文档；preview 配置和截断 Hook 待方案确认，本轮不实施。

## 形成时证据

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

## 本轮正式化与复核（2026-09-07）

用户要求代理自行完成已交付工作的必要调整与正式化；上节被拒命令、draft/candidate 和版本读数均为形成时状态，不是当前阻塞。

- 经语义复核后，以正式 `bun run change-plan -- plan` 命令从 draft 进入 Plan，基线为 `6b19ec8fbb0e7840c3ca87b77a6b7caeb7d4a701`；所有未完成的治理收尾项已据实际结果闭合。
- 修复 tasks 的固定结构，将 Check guide follow-up 纳入 Verification；前轮已交付的文档和 installed-consumer 证据保留，没有重新实施文档结构调整或新增 preview API。
- 独立非实施代理对决策与实际代码、使用文档和治理 diff 反查，无实质阻断；本轮没有产品或测试正文改动。
- 直接 `bun run test-evidence -- check --root .` 通过：557 个 test entities 全部映射；`decisions -- check` 通过（303 条已建立、0 candidate），`change-plan -- check-all changes` 通过（13/13），docs 链接 400 文件通过，`git diff --check` 通过。
- 本轮 `bun run check -- --all` exit 0、36/36 passed，候选 `0.0.0-local.d77a0b2917db`；日志 `.log/project-gate/2026-09-07T10-08-24.313Z-382302-f5097579-b1b3-4eb8-805b-d5d21fdddc42`。该验收覆盖已准备环境下的完整 Gate，不证明全新环境自举。
- 环境自举继续由 `env:setup` 承担，未自举的 cold `check` 不在支持承诺内；本轮不运行 setup、不修复该范围外路径、不改写形成时调查。没有 Git 暂存、提交、发布或 Change 归档。

## 归档授权与范围

2026-09-07 用户明确要求归档并整理工作区，随后明确要求创建本地 Git 提交。该授权承接本轮已完成的正式化与验收；通过正式 archive 命令归档本 Change，再按语义单元提交。不推送、不改写历史、不清理生成物或运行环境自举。前节“没有提交或 Change 归档”仅描述此前正式化阶段。
