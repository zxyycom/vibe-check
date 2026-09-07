# Tasks

先确认已批准的材料边界，再迁移声明与验收，最后核对真实包内容和文档影响。

## Readiness

- [x] 0.1 核对真实 notice、原文、provenance、源码头和用户批准范围。
- [x] 0.2 恢复相关决策并完成新计划与决策维护命令验证。

## Implementation

- [x] 1.1 收窄并移动归属说明，保留上游原文和来源头不变。
- [x] 1.2 同步 package contract、material inventory、audit、receipt、测试和文档引用。
- [x] 1.3 更新相关长期决策与必要 Case，不改旧 release evidence。

## Verification

- [x] 2.1 运行最窄 legal/material/manifest 测试、test-evidence 与 docs 校验。
- [x] 2.2 通过完整 Project Gate 验收新 tarball 和 installed candidate 材料。
- [x] 2.3 独立审查实际 diff、原文保留和说明范围，记录验证与未覆盖边界。

## 形成时验证与交接边界

- 最窄 legal/candidate unit/release tests 10/10 通过；完整 Gate 第一轮的包材料验收通过，整体 25/36，
  仍有 learned 迁移消费验收与质量检查待修正。单独冷安装测试曾在 install 阶段超时，不作为验收通过。
- 归属说明从真实 repository root 读取 Buffer，经 staging/tar/candidate reuse/install 显式传递；
  upstream 原文/provenance 固定 pin 保留，项目 notice receipt 从实际材料计算 digest，不锁手写正文措辞。
- 主代理已反查 notice 范围与原文保留。治理命令被运行策略拒绝，Change 仍是 draft，修订决策仍是 candidate；
  完整 Gate 内 Decision records 检查通过不表示它们已启用。没有改写旧 release evidence 或发布。
- 最终 `bun run check -- --all`：36/36 passed，日志为
  `.log/project-gate/2026-09-07T04-17-37.708Z-94077-ac59759b-ef2c-4364-bfcd-122ac85597be/`；
  它同时提供 Semantic Case ledger 完整性证据，直接命令仍受运行策略限制。
  已验收 `0.0.0-local.1ef8657cdd6d` 的 staging、tar 与实际安装包，不等同于正式发布。
  一次冷重建后的包导入失败在重跑消失，根因未证实；单独冷集成测试的超时边界也仍未闭合。

## 本轮正式化与复核（2026-09-07）

用户要求代理自行完成已交付工作的必要调整与正式化；上节被拒命令、draft/candidate 和版本读数均为形成时状态，不是当前阻塞。

- 经语义复核后，以正式 `bun run change-plan -- plan` 命令从 draft 进入 Plan，基线为 `6b19ec8fbb0e7840c3ca87b77a6b7caeb7d4a701`；所有未完成的治理收尾项已据实际结果闭合。
- 翻译来源材料目录后继决策已通过正式 activate 命令建立为 active + aligned，直接前序随事务归档；当前材料、安装依赖审计和 Case 已核对。本轮未修改法律材料或旧 release evidence。
- 独立非实施代理对决策与实际代码、使用文档和治理 diff 反查，无实质阻断；本轮没有产品或测试正文改动。
- 直接 `bun run test-evidence -- check --root .` 通过：557 个 test entities 全部映射；`decisions -- check` 通过（303 条已建立、0 candidate），`change-plan -- check-all changes` 通过（13/13），docs 链接 400 文件通过，`git diff --check` 通过。
- 本轮 `bun run check -- --all` exit 0、36/36 passed，候选 `0.0.0-local.d77a0b2917db`；日志 `.log/project-gate/2026-09-07T10-08-24.313Z-382302-f5097579-b1b3-4eb8-805b-d5d21fdddc42`。该验收覆盖已准备环境下的完整 Gate，不证明全新环境自举。
- 环境自举继续由 `env:setup` 承担，未自举的 cold `check` 不在支持承诺内；本轮不运行 setup、不修复该范围外路径、不改写形成时调查。没有 Git 暂存、提交、发布或 Change 归档。

## 归档授权与范围

2026-09-07 用户明确要求归档并整理工作区，随后明确要求创建本地 Git 提交。该授权承接本轮已完成的正式化与验收；通过正式 archive 命令归档本 Change，再按语义单元提交。不推送、不改写历史、不清理生成物或运行环境自举。前节“没有提交或 Change 归档”仅描述此前正式化阶段。
