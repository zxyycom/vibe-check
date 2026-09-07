# Tasks

任务先固定路径与安装图责任，再实施 package 和测试变更，最后以 exact candidate 与治理检查闭合。

## Readiness

- [x] 0.1 核对两个目录的历史来源、package contract、artifact/installed/release data flow 与当前直接/安装依赖数量。
- [x] 0.2 读取 package lifecycle、相关长期决策、测试策略与 Case owner，并完成修改前 test-evidence check。
- [x] 0.3 核对 npm 普通依赖、files/node_modules、bundleDependencies 与动态安装图边界，确定不复制动态传递图。

## Implementation

- [x] 1.1 删除普通 npm dependencies 的选择性镜像文本与 package `third-party-licenses/` 路径，使 translated/embedded legal material 只由 `licenses/` 承载并同步 contract/audits/receipt。
- [x] 1.2 增加 private candidate 完整安装图的许可声明审计，并闭合 scoped/nested/legacy/fail-closed 边界。
- [x] 1.3 更新 `THIRD_PARTY_NOTICES.md`、README、package lifecycle 与长期 Decision，明确材料目录和动态 dependency graph 的不同责任。
- [x] 1.4 更新相邻 package tests 与语义 Case，使新增审计拥有可证伪证据。

## Verification

- [x] 2.1 运行最窄 package/candidate tests 与修改后 test-evidence 完整检查。
- [x] 2.2 重建并核对 exact candidate 的 staging、tarball 与 installed dependency license audit。
- [x] 2.3 运行 docs、typecheck、lint、format/dependency checks 与 `bun run check -- --all`。
- [x] 2.4 由非实施代理按实际 diff 反查用户文档、内部 owner、测试语义和残留路径，并完成 Decision/Change/diff 最终检查。
- [x] 3.1 按 `ai-ready-docs` 复核本次 README、notice、package lifecycle、Decision、Change 与 Case 改动，收敛 owner、事实源、平台范围和非结论边界。
- [x] 3.2 按项目编码规范复核本次 package 实现与测试，消除静默文件系统降级、隐含 mutation、含混许可状态和未被直接证明的失败路径。
- [x] 3.3 重新运行目标测试、Test Evidence、文档/静态校验、exact candidate 与 complete Gate，并由非实施代理复核最终 diff。
