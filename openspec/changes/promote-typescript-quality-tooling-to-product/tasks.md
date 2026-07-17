本 change 的目标是先移除 Rust 产品路径，再把成熟的 TypeScript 质量脚本按现有行为上移为仓库自有产品源码；本清单仅形成待审计临时计划，不修改现有主规范或其它 change。

## 1. 实现前阻塞审计

- [ ] 1.1 **阻塞门禁：审计未完成前不得执行任何 2.x 及后续实现任务。** 逐项确认 proposal、design、`product-runtime` spec 和 tasks 都围绕开头核心句；capability ID 是稳定长期 owner；本 change 仍是待审计临时计划；除用户明确要求删除的旧 change 外没有修改主规范、schema、example 或其它 active change；`## Open Questions` 没有未回答问题；验证路径能够证明 Rust 删除、单一源码 owner 和行为 parity。
- [ ] 1.2 记录审计结论和允许差异清单；只有阻塞问题全部关闭后，才勾选门禁并开始实现。
- [ ] 1.3 固定迁移输入：记录 quality-core 与 foundation 来源 commit、当前 package commands 和运行时 import 闭包，并保存 quick、full、with-baseline 的迁移前基准。

## 2. 先删除 Rust 产品路径

- [ ] 2.1 删除 `crates/vibe-check/**`、根 Cargo 产品 workspace、Rust toolchain 配置、Rust 产品测试和仅服务该产品的构建 helper。
- [ ] 2.2 删除 package scripts、workspace verifier、CI 和仓库配置中的 Rust 产品执行接线，确保没有悬空命令。
- [ ] 2.3 增加可复现检查，证明仓库不再包含可构建或可调用的 Rust Vibe Check 产品入口；在 TypeScript 上移前不引入替代 Rust 层。

## 3. 原样上移 TypeScript 运行时

- [ ] 3.1 将 pinned quality-core source、测试和 fixtures 直接放入 `src/product/**`，并在 `src/product/README.md` 记录来源 commit 和仓库所有权。
- [ ] 3.2 将现有 scan 入口、参数、默认配置及实际可达的 foundation helper 闭包移动到 `src/product/**`，只做路径和所有权所需的机械调整。
- [ ] 3.3 移除 quality-core gitlink 与对应 `.gitmodules` 条目，并增加 import boundary 检查，禁止产品 runtime 导入 `scripts/**` 或 toolkit gitlink。
- [ ] 3.4 对照固定来源复核源码差异；超出路径、入口、仓库所有权、测试搬移或构建接线的差异一律回退或转为后续 change。

## 4. 建立单一产品入口

- [ ] 4.1 增加最薄的 `bun run product:cli -- scan [project-root]` 分流，复用上移后的参数解析、默认配置和扫描核心。
- [ ] 4.2 将 `scripts/quality/scan.ts` 和 `quality:check`、`quality:full-check`、`quality:scan` 改为单向调用产品入口的兼容 wrapper。
- [ ] 4.3 用入口测试证明正式命令和 dogfood 命令到达同一核心，并保持现有 flags、stdout/stderr 和状态映射。

## 5. 证明行为保持

- [ ] 5.1 运行产品 import、typecheck、lint 和迁移测试，修复且只修复由移动造成的错误。
- [ ] 5.2 对同一 source revision 执行迁移前后 quick 扫描，比较扫描范围、指标、warnings、artifacts 和结果状态。
- [ ] 5.3 对同一 current/baseline revisions 执行迁移前后 full 与 with-baseline 扫描，比较 baseline、changed warnings、完整 warnings 和报告数据。
- [ ] 5.4 运行 `bun run verify:vibe-check-workspace:full`；任何未列入允许差异的行为变化都阻塞完成。

## 6. 同步 owner 与交付材料

- [ ] 6.1 更新 architecture、script-tooling、testing、命令说明和 AGENTS 边界，使 `src/product/**` 成为唯一产品 owner，`scripts/quality/**` 成为 dogfood consumer。
- [ ] 6.2 记录迁移中发现但未修复的已知问题，并分别指向后续小 change，不把它们加入本次实现。
- [ ] 6.3 运行 `bun run validate`、严格 OpenSpec validation 和局部 diff 审查，确认旧 change 已删除、新 change 材料一致且没有夹带功能重写。
