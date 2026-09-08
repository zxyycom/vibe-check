# Tasks

先分类和配置，再验证与交接；资源实测不是启动前置。

## Readiness

- [x] 0.1 核对 Product 与 Gate owner：仅消费已有资源能力，保留 root maxParallel=3、mutex 和唯一 root entry。
- [x] 0.2 核对证据边界：资源分类来自静态工作特征；调查只提供波动线索，不证明竞争或配置收益。
- [x] 0.3 审核分类、逻辑单位、配置与不声明规则，确认具体数值由实施任务形成。
- [x] 0.4 完成独立方案审查，确认测试、正式 Gate 与下游交接路径可直接执行。

## Implementation

- [ ] 1.1 阅读 manifest 与 Check owner，形成包含用途、单位、预算、claims 和不声明理由的映射。
- [ ] 1.2 在 Gate Definition 落地经静态评审的配置，保留 Product、root 和 mutex 边界。
- [ ] 1.3 同步 Gate 配置测试、Case 和维护说明；删除无独立用途的拟议声明。

## Verification

- [ ] 2.1 修改测试前后运行 bun run test-evidence -- check --root .，通过 bun test scripts/project/gate/definition.test.ts 及新增直接测试。
- [ ] 2.2 完成非实施代理文档影响审查和 bun run check -- --all；如实记录耗时观察，不将其解释为加速证明。
- [ ] 2.3 向平台和算法交接稳定配置提交、映射理由与验证边界。
