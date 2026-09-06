# Tasks

按公共契约、共享图与 Core、产品投影、证据材料和完整验证的顺序交付 named resource capacity。

## Readiness

- [x] 0.1 恢复 Project Definition、AdmissionGraph、Scheduler、measurement、文档和测试证据 owner，并核对相关 active decisions。
- [x] 0.2 用 root 3/browser 2 的 consumer-shaped scenario 证明 mutex 与总并行上限不能表达目标结果，确定 static integer capacity/claim 最小公分母。
- [x] 0.3 确定 public mapping、exact replacement inheritance、canonical snapshot、atomic multi-resource transition 和拒绝优先级，关闭设计问题。

## Implementation

- [x] 1.1 实现 Definition scheduler capacities 与 Check claims 的 public type、closed validation、递归 resolution、normalization 和 fingerprint。
- [x] 1.2 扩展 generic Task graph、public Scheduler snapshot 与 standalone input，使 capacity/claim 静态闭包在 work 前验证。
- [x] 1.3 在 shared immutable admission core 实现 resource slots、occupancy、atomic admission/release、inspection 和 closed rejection。
- [x] 1.4 将 named resource facts 接入 real Scheduler hard guard、custom context、blocker diagnostics 和 existing capacity measurement classification。
- [x] 1.5 同步 package 用户说明、内部 architecture/API owner 和受影响的 JSDoc/API projection。
- [x] 1.6 新增或修订 Definition、AdmissionState、real Scheduler、diagnostic/measurement 测试，并维护 Case 账本。
- [x] 1.7 建立并对齐 named resource capacity 长期 Decision，记录 owner、原子生命周期和不扩张边界。

## Verification

- [x] 2.1 运行受影响 Definition、admission-core、task-engine 与 diagnostic/measurement 最窄测试。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`、`bun run decisions -- check` 与 `bun run change-plan -- check changes/add-named-resource-capacity`。
- [x] 2.3 运行 typecheck、lint、documentation/API validation 与 `bun run check`，审阅最终 diff 和文档影响。
