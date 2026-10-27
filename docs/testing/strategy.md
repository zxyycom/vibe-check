# 测试策略

本文拥有 Vibe Check current test 分层、Case 账本和交付验证入口；产品语义仍以相应领域 owner 为准。

## 测试层级

| 层级 | 位置与直接证明 |
| --- | --- |
| Definition / Check facts | `src/project-definition/**`、`src/check-settlement/**`：authoring、validation、composition 与终态 Check/Record facts。 |
| Product Run / Output / Scheduler | `src/project-run/**`、`src/machine-output/v4/**`：Run controls、调度与取消、输出和 publication 不变量。 |
| 随包 Check | `src/package-checks/**`：Check-owned options、exact scope、cache、availability/process/parser failure 与 supplemental Records。 |
| Repository tooling | `scripts/**`：process、repository files、文档、package、Gate 和 Test Evidence 行为。 |
| Consumer / 独立验收 | `scripts/project/**` 证明 exact candidate import 与 Gate binding；`scripts/validation/**` 独立验证 current v4 schema/example 完整二文件集合。 |

具体行为与验收边界由相应[行为 owner](../navigation.md#如何阅读这些文档)定义，不在层级表重复配置字段或实现清单。

## 测试所有权

行为 owner 决定当前能力是否需要新增、修改或删除直接测试；Change、历史材料或已有 Case 本身不自动产生测试义务。测试
只有在能观察 owner 承诺的结果时才进入 current test surface 与 Case 账本；无法以稳定自动化方式证明的边界在 owner
验证说明或 Change 审查中记录为 `Manual CR:`，不创建名义 Case。

测试路径遵循[编码规范 §8](../development/coding-style.md#8-目录文件与模块命名)：单文件实现与其配对测试就近共置；证明多个 child
module 共同契约的测试保留在拥有该契约的最近父 owner；专属 test support 随它服务的行为 owner。不得为了目录整齐另建
`tests/` owner；Case 账本记录每个当前实体的实际路径。

## 测试设计与证据审查

[test-design](../../.codex/skills/test-design/SKILL.md) 用于设计、编写、审查或精简自动化测试：从行为契约选择
最小充分边界、有辨错能力的场景、独立预期与观察，并核对隔离、失败传播和运行维护成本。

最终测试入口与证明范围交给 [test-evidence-review](../../.codex/skills/test-evidence-review/SKILL.md)，审查证据质量，
并按[Case 维护](case-maintenance.md)处理语义连续性与全树闭合。设计阶段尚无直接测试的方案不创建名义 Case。

项目的行为契约、测试分层、Case 与验证规则仍由各自 owner 定义；skill 提供方法，不替代这些规则。
仅运行既有测试时直接使用下方验证入口，不额外开展测试设计或账本维护。

### JSON 内容与容器属性

具体 JSON 值断言可使用 [`assertJsonValueEqual`](../../src/data-boundary/json-value-equality.test-support.ts)：
它执行忽略原型的严格内容比较，保留字段、值类型与数组顺序检查。JSON 准入、原型、冻结和引用身份由拥有相应契约的测试独立断言。
默认 strict assert 保持原型检查；不得全局忽略原型、改用宽松相等，或用生产规范化构造 expected 形成同实现自证。

## Case 账本

`docs/testing/cases/**` 连接当前行为承诺与直接测试。每个 Case 按 owner 契约和可观察结果划分，
命名当前 owner、Bun entity 与可证伪的 `Proves`；存储、粒度、修改和全树闭合规则由[测试证据维护](case-maintenance.md)完整定义。

仅修改断言或输入、测试身份与映射未变时，重读相关 Case 和行为 owner，运行目标测试即可，不默认加载全树。
新增、删除、重命名、移动测试实体，或修改 Case、owner 引用、runner profile、发现/身份规则时，修改后运行完整账本闭合：

```bash
bun run test-evidence -- check --root .
```

该命令加载完整清单并注册测试，核对 static/JUnit identity 与 Case 映射，但**不执行测试正文**。需要区分既有阻断时可先运行起点检查，不把前后各跑一次作为固定步骤。
还需运行最窄目标测试，或由 Gate 对应 behavior Check 执行；定向证据不证明全树闭合。provider setup 的执行复用不产生新的测试目的或 Case。

Scheduler 的 scripted-clock、queue/delay/tail、history 和资源核算证明要求见[调度器验证边界](../development/scheduler.md#验证边界)。
这些域特定要求不改变通用 Case 粒度，也不扩张 Check/Record/machine/progress/RunResult 契约。

## 验证入口

验证以本次任务的改动和真实依赖为范围，按[交付验证](../navigation.md#交付验证)选择入口。普通文档和身份未变的测试正文改动不自动运行 Test Evidence；触及实体、Case 或其引用时按上方[Case 账本](#case-账本)完成闭合。

产品或 scripts 改动先运行最窄 Bun test，再按证据需要补相应 owner 的 typecheck/lint。需要 Gate 快速反馈时默认运行 `bun run check`；额外验证优先选目标测试或相关 preset，不因跨 owner、交付阶段或他人的大量改动自动扩大到 changed/all。

Project Gate 将 Test Evidence entity closure 与 behavior execution 分别结算；`--test` 强制执行全部 routine 测试 lanes，不是本任务目标测试的默认入口。package artifact 与 installed acceptance 按实际受影响边界选择，要求真实安装证明时不能以源码测试冒充。精确选择、保守回退与性能策略由 [Project Gate](../tooling/project-gate.md#selection-presets-and-scheduling)拥有。

发布验收使用 `bun run package:release:verify -- --receipt <path>`，将包含 types 的完整验收绑定到同一正式 tarball；不以日常 all 成功替代。未选择的 types/workbench 仍保留完整实体与 Case 映射。

必须报告实际运行的检查和未运行项及影响。

## 一致性审计

1. 每个 current test entity 至少映射一个 current Case，且每个 Case entity 都存在。
2. Definition test 证明 authoring/validation，不证明偶然发生的 runtime behavior。
3. Check-facts test 证明 Check/Record facts；machine publication、Run outputs 和 scheduler 各有 observable evidence。
4. docs validator 独立于 Product runtime validator；接受 schema/example artifact set 前验证完整 v4 two-file set。
5. scanner fixture 只证明 private adapter protocol，不公开 scanner resolution 或 environment override contract。
