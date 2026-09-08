# Tasks

先分类和配置，再验证与交接；资源实测不是启动前置。

## Readiness

- [x] 0.1 核对 Product 与 Gate owner：仅消费已有资源能力，保留 root maxParallel=3、mutex 和唯一 root entry。
- [x] 0.2 核对证据边界：资源分类来自静态工作特征；调查只提供波动线索，不证明竞争或配置收益。
- [x] 0.3 审核分类、逻辑单位、配置与不声明规则，确认具体数值由实施任务形成。
- [x] 0.4 完成独立方案审查，确认测试、正式 Gate 与下游交接路径可直接执行。

## Implementation

- [x] 1.1 阅读 manifest 与 Check owner，形成包含用途、单位、预算、claims 和不声明理由的映射。
- [x] 1.2 在 Gate Definition 落地经静态评审的配置，保留 Product、root 和 mutex 边界。
- [x] 1.3 同步 Gate 配置测试、Case 和维护说明；删除无独立用途的拟议声明。

## Verification

- [x] 2.1 修改测试前后运行 bun run test-evidence -- check --root .，通过 bun test scripts/project/gate/definition.test.ts 及新增直接测试。
- [x] 2.2 完成非实施代理文档影响审查和 bun run check -- --all；如实记录耗时观察，不将其解释为加速证明。
- [x] 2.3 向稳定 owner 交接映射理由与验证边界，供平台和算法从本 Change 的后续提交继承。

验收证据：目标测试 6/6、Test Evidence 572/572、scripts typecheck/lint、格式与文档检查通过；独立正确性审查和最终 AI-ready/编码规范优化检查均无阻断。完整 Gate 在 `2026-09-08T09-21-40.587Z-1767742-60531860-41b2-4ebf-95ea-5618d7c518b2` 为 36/36 passed、elapsed 19.3s。该运行使用包含平台在制纵切的共享工作树，耗时只作观察；资源提交不包含平台改动。映射和验证边界已由 `docs/tooling/project-gate.md` 承接并交给平台负责人。
