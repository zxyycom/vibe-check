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

## Case 账本

`docs/testing/cases/**` 连接当前行为承诺与直接测试。每个 Case 按 owner 契约和可观察结果划分，
命名当前 owner、Bun entity 与可证伪的 `Proves`；存储、粒度、修改和全树闭合规则由[测试证据维护](case-maintenance.md)完整定义。

新增、删除、重命名、移动测试节点，修改测试正文或 Case Owner / Proves 前后，均运行：

```bash
bun run test-evidence -- check --root .
```

该命令加载完整清单并注册测试，核对 static/JUnit identity 与 Case 映射，但**不执行测试正文**。
还需运行最窄目标测试，或由 Gate 对应 behavior Check 执行。provider setup 的执行复用不产生新的测试目的或 Case。

Scheduler 的 scripted-clock、queue/delay/tail、history 和资源核算证明要求见[调度器验证边界](../development/scheduler.md#验证边界)。
这些域特定要求不改变通用 Case 粒度，也不扩张 Check/Record/machine/progress/RunResult 契约。

## 验证入口

文档、schema、example 或 Case 改动运行：

```bash
bun run validate -- docs
bun run test-evidence -- check --root .
```

产品或 scripts 改动先运行最窄 Bun test，再按 owner 运行 typecheck/lint。Project Gate 将 Test Evidence entity
closure 与按稳定 owner 分区的 behavior execution 分别结算；默认 required 还保留同次 exact package candidate 的 typed
provider，但不选择高成本的 artifact、external-consumer provider 及其 types/docs/runtime acceptance Checks。

跨 owner、Gate 或 output contract 的日常交付运行：

```bash
bun run check
```

涉及 package artifact、candidate、外部 consumer 或发布验收时显式运行 complete Gate：

```bash
bun run check -- --all
```

必须报告实际运行的检查和未运行项及影响。

## 一致性审计

1. 每个 current test entity 至少映射一个 current Case，且每个 Case entity 都存在。
2. Definition test 证明 authoring/validation，不证明偶然发生的 runtime behavior。
3. Check-facts test 证明 Check/Record facts；machine publication、Run outputs 和 scheduler 各有 observable evidence。
4. docs validator 独立于 Product runtime validator；接受 schema/example artifact set 前验证完整 v4 two-file set。
5. scanner fixture 只证明 private adapter protocol，不公开 scanner resolution 或 environment override contract。
