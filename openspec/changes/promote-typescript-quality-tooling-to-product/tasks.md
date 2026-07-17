执行顺序是文档调整、Rust 产品删除、TypeScript/Bun 源码迁移、正式入口接线和行为对照。Rust 只属于删除任务，迁移任务只使用固定版本的 TypeScript/Bun 源码与测试资产。

## 0. Change 审计门禁

- [x] 0.1 审核 proposal、design、delta specs 和 tasks 的目标、内容 owner、范围与执行顺序；确认两个代码任务相互独立，文档先行，且没有未回答问题或起草期状态说明。
- [x] 0.2 运行 `bun run validate`、`openspec validate promote-typescript-quality-tooling-to-product --strict`、起草期关键词检查和局部 diff 审查；change artifacts 无阻塞问题，可以进入 1.x 文档任务。

## 1. 文档先行

- [ ] 1.1 更新 `docs/architecture.md`、`docs/coding-style.md`、`docs/cli.md`、`docs/scan-scope.md`、`docs/quality-metrics.md`、`docs/output.md`、`docs/scanner-dependencies.md`、`docs/script-tooling.md`、`docs/testing.md`、`docs/navigation.md` 和 `AGENTS.md` 中受本 change 直接影响的 owner、路径、入口与实现状态；分别描述 Rust 删除和 TypeScript 产品归位，代码完成前继续明确标注当前实现状态。
- [ ] 1.2 对照本 change 的 `duplicate-scanning`、`structural-scanning` 和 `test-fixtures` delta，确认长期文档删除 Rust-only scanner 与 fixture requirements，并记录现有 TypeScript/Bun 脚本的 jscpd 和 Python/Lizard boundary；现有 TypeScript 测试资产原样上移，不在本 change 中补建缺失 coverage。配置、输出、scanner algorithm、gate、schema、examples 和其它质量规则保持不变。
- [ ] 1.3 运行 `bun run validate`、严格 OpenSpec validation、Rust-current-state 关键词检查和局部 diff 审查；文档门禁通过后再开始代码切片。
- [ ] 1.4 在进入 2.x 前确认 pinned quality-core `3acea8c2f643ea86f7a1e8f2a6db716b7e320c76` 与 foundation `f593edbf55fd03be7db54ef44a38d0a9feda4dbd` 源码可读取，并记录 consumer 仓库 revision；任一来源不可用时停止代码切片。

## 2. 删除 Rust 产品

- [ ] 2.1 完整删除 `crates/vibe-check/**`，包括 Rust 源码、测试和 fixtures；不得把其中任何资产移动、复制或改写到 `src/product/**`。
- [ ] 2.2 删除根 Cargo 产品 workspace、Cargo lockfile、Rust toolchain 配置和仅服务 Rust 产品的构建 helper。
- [ ] 2.3 删除 package scripts、workspace verifier、CI 和仓库配置中的 Rust 产品执行接线，并检查仓库不再存在可构建或可调用的 Rust Vibe Check 产品入口。

## 3. 迁移 TypeScript/Bun 产品源码

- [ ] 3.1 只使用 1.4 记录的 TypeScript/Bun 来源 revision，将 pinned quality-core source、测试和 fixtures 直接迁移到 `src/product/**`，并在 `src/product/README.md` 记录来源 commit 和仓库所有权。
- [ ] 3.2 将现有 scan 入口、参数、默认配置及实际可达的 foundation helper 闭包移动到 `src/product/**`，只做路径和所有权所需的机械调整。
- [ ] 3.3 从 dogfood 默认配置删除已失效的 Rust 产品与 Cargo 路径，并按现有 TypeScript 配置结构增加 `src/product/**` source area；threshold、profile、scanner、warning、baseline、artifact 和 gate 算法保持不变。
- [ ] 3.4 移除 quality-core gitlink 与对应 `.gitmodules` 条目，增加 import boundary 检查，并对照固定 TypeScript 来源确认差异只包含路径/import、入口/wrapper、仓库所有权、TypeScript fixture/test 搬移、dogfood 路径调整和必要构建接线。

## 4. 建立单一产品入口

- [ ] 4.1 增加最薄的 `bun run product:cli -- scan [project-root]` 分流，复用上移后的参数解析、默认配置和扫描核心；省略 project root 时使用启动 cwd。
- [ ] 4.2 将 `scripts/quality/scan.ts` 和 `quality:check`、`quality:full-check`、`quality:scan` 改为单向调用产品入口的薄 wrapper，并显式传入 Vibe Check 仓库根。
- [ ] 4.3 用入口测试证明正式命令和 dogfood 命令到达同一核心，并保持现有 flags、stdout/stderr 和状态映射。

## 5. 行为保持与交付

- [ ] 5.1 运行 product import、typecheck、lint、test、dependency 和入口检查，修复且只修复由源码移动、入口接线或 dogfood 路径映射造成的错误。
- [ ] 5.2 使用迁移后的 TypeScript test fixtures 建立隔离的 Git fixture project，固定 baseline/current commits 和显式 changed-files 输入；让 pinned 上移前 TypeScript consumer 与新产品入口扫描同一 project，并完成 quick 对照。
- [ ] 5.3 对同一 current/baseline revisions 使用上移前 TypeScript consumer 与新产品入口执行 full 和 with-baseline 扫描，比较 baseline、changed warnings、完整 warnings 和报告数据。
- [ ] 5.4 使用同一显式 changed-files 输入对照上移前 TypeScript consumer 与新产品入口，确认 changed warning context 和相关 artifacts 保持。
- [ ] 5.5 运行迁移后的 `quality:check`、`quality:full-check`、`quality:scan` 和 `bun run verify:vibe-check-workspace:full`；任何非源码位置、入口或明确非语义字段造成的行为变化都阻塞完成。
- [ ] 5.6 更新被迁移 TypeScript 测试的 `docs/testing/cases.md` 路径和状态，将长期文档的实现状态收口为产品化完成状态，并把发现的既有问题交给后续 change；随后运行 `bun run validate`、严格 OpenSpec validation、Rust 产品路径关键词检查和局部 diff 审查。
