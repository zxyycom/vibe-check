# Tasks

按授权与契约恢复、实现、公共材料同步和独立验收推进；未勾选项不表示已完成。

## Readiness

- [x] 0.1 确认用户批准无内置特例的公共 prepared strategy 与无兼容迁移。
- [x] 0.2 核对当前 provider、public context、相关决策及既有优化 Plan 的边界。
- [x] 0.3 收敛工厂参数、caller identity、observation 与完整迁移范围，完成计划与决策命令验证。

## Implementation

- [x] 1.1 实现公开可配置工厂并删除 private learned kind、observer 与 diagnostic 特例。
- [x] 1.2 迁移 Gate、public inventory、示例、用户说明和内部 owner。
- [x] 1.3 同步测试 Case、长期决策与既有优化 Plan 的重新基线要求。

## Verification

- [x] 2.1 运行最窄 learned、Definition、lifecycle、diagnostic 与相关 Gate 测试及 test-evidence check。
- [x] 2.2 运行 docs 投影、文档校验、typecheck/lint 与完整 Project Gate 包验收。
- [x] 2.3 基于实际 diff 独立反查无特权接入、默认行为和随包使用路径，记录已验证与未覆盖边界。

## 形成时验证与交接边界

- 第一轮 `bun run check -- --all`：25/36 passed；产品与脚本 typecheck、产品 runtime、包材料验收通过。
  剩余失败涉及新 helper 的质量指标、迁移后示例/断言、Owner 链接和布局清单，尚在修正；不能据此发布。
- `decisions list/check`、`change-plan list/plan` 与直接 `test-evidence check` 的调用被当前运行策略拒绝；
  完整 Gate 内的 Decision records 检查通过，但不等同于候选决策启用或 Change plan 状态迁移。
- 主代理已基于实际 source/provider/guide diff 审查公开接入与边界，并要求补强终态持久化、排序和隐私证据；
  随后已完成完整 Gate 复跑。没有 Git 提交、发布、归档或清理旧生成目录。
- 最终 `bun run check -- --all`：36/36 passed，日志目录为
  `.log/project-gate/2026-09-07T04-17-37.708Z-94077-ac59759b-ef2c-4364-bfcd-122ac85597be/`。
  同轮验证了 Semantic Case ledger、Decision records、全部产品/脚本 tests、lint/typecheck、质量指标、
  实际安装包 runtime/types/documentation 与 artifact material。直接 test-evidence 命令仍被策略拒绝，
  完整性证据来自正式 Gate 内同一 checker，而非宣称被拒命令曾成功。
- 当前 local candidate 为 `0.0.0-local.1ef8657cdd6d`。最终通过前一次冷重建后的同进程 package import
  报 module missing，随后的只读 status 为 current，同一 Gate 重跑通过；原因尚未证实，不能据此宣称
  冷启动路径始终可靠。没有执行性能 rebaseline。

## 本轮正式化与复核（2026-09-07）

用户要求代理自行完成已交付工作的必要调整与正式化；上节被拒命令、draft/candidate 和版本读数均为形成时状态，不是当前阻塞。

- 经语义复核后，以正式 `bun run change-plan -- plan` 命令从 draft 进入 Plan，基线为 `6b19ec8fbb0e7840c3ca87b77a6b7caeb7d4a701`；所有未完成的治理收尾项已据实际结果闭合。
- 公开策略、统一 Invocation lifecycle 和独立诊断三条后继决策均已通过正式 activate 命令建立为 active + aligned，直接前序随事务归档。既有优化 Plan 只更新当前决策入口，Readiness 0.0 未完成，未开展算法实验或性能重新基线化。
- 独立非实施代理对决策与实际代码、使用文档和治理 diff 反查，无实质阻断；本轮没有产品或测试正文改动。
- 直接 `bun run test-evidence -- check --root .` 通过：557 个 test entities 全部映射；`decisions -- check` 通过（303 条已建立、0 candidate），`change-plan -- check-all changes` 通过（13/13），docs 链接 400 文件通过，`git diff --check` 通过。
- 本轮 `bun run check -- --all` exit 0、36/36 passed，候选 `0.0.0-local.d77a0b2917db`；日志 `.log/project-gate/2026-09-07T10-08-24.313Z-382302-f5097579-b1b3-4eb8-805b-d5d21fdddc42`。该验收覆盖已准备环境下的完整 Gate，不证明全新环境自举。
- 环境自举继续由 `env:setup` 承担，未自举的 cold `check` 不在支持承诺内；本轮不运行 setup、不修复该范围外路径、不改写形成时调查。没有 Git 暂存、提交、发布或 Change 归档。

## 归档授权与范围

2026-09-07 用户明确要求归档并整理工作区，随后明确要求创建本地 Git 提交。该授权承接本轮已完成的正式化与验收；通过正式 archive 命令归档本 Change，再按语义单元提交。不推送、不改写历史、不清理生成物或运行环境自举。前节“没有提交或 Change 归档”仅描述此前正式化阶段。
