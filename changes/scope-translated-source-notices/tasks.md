# Tasks

先确认已批准的材料边界，再迁移声明与验收，最后核对真实包内容和文档影响。

## Readiness

- [x] 0.1 核对真实 notice、原文、provenance、源码头和用户批准范围。
- [ ] 0.2 恢复相关决策并完成新计划与决策维护命令验证。

## Implementation

- [x] 1.1 收窄并移动归属说明，保留上游原文和来源头不变。
- [x] 1.2 同步 package contract、material inventory、audit、receipt、测试和文档引用。
- [ ] 1.3 更新相关长期决策与必要 Case，不改旧 release evidence。

## Verification

- [x] 2.1 运行最窄 legal/material/manifest 测试、test-evidence 与 docs 校验。
- [x] 2.2 通过完整 Project Gate 验收新 tarball 和 installed candidate 材料。
- [x] 2.3 独立审查实际 diff、原文保留和说明范围，记录验证与未覆盖边界。

## 验证进展与交接边界

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
