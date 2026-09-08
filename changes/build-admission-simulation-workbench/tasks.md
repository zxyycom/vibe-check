# Tasks

按已冻结的最小模型推进：先完成方案完备与独立审查，再实施 private workbench。

## Readiness

- [x] 0.1 核对职责：公开 `AdmissionGraph` 是唯一准入 legality authority；平台拥有虚拟时间/证据，不新增 Product API、第二 Scheduler 或 Gate 入口。
- [x] 0.2 核对固定 profile、四类调查经验倍率、计时口径与策略信息边界；资源竞争和长尾参数保持合成假设，不称为真实竞争模型。
- [x] 0.3 确认本 proposal/design/tasks 已完整表达可实施的 owner、拟新增的 `bun run admission:simulate`、exact-candidate consumer boundary、输入/输出/error/trace contract、事件模型、seed 和手算 oracle；完成后仅表示方案完备。
- [x] 0.4 由非实施代理基于这三份实际文档独立审查范围、公共/私有边界、模型假设、任务覆盖与非保证。

## Implementation

- [ ] 1.1 新建 `scripts/project/admission-workbench/**` 的版本化 scenario/profile validator、稳定 PRNG/seed 派生、public-candidate `AdmissionGraph` adapter 及正式 `AdmissionPolicyContext` builder；支持 simple/prepared lifecycle、只向 policy 提供公开 action-observation prefix；拒绝不一致 graph/claims、未知 ID 与非有限数值。
- [ ] 1.2 实现有界虚拟事件循环：policy proposal、public `select/settle`、running-set rate recomputation、canonical simultaneous settlement、二元 outcome 和结构化无进展/速率/事件错误 trace；不启动真实 Check。
- [ ] 1.3 实现 zero/weak/strong 合成竞争、四类固定调查 profile、长尾压力及冻结最小场景/手算 oracle；在根 `package.json` 新增 `admission:simulate` 接线和 private JSON evidence writer。
- [ ] 1.4 提供能接入现有 learned helper 的 `AdmissionPolicy` adapter（prepared `prepare/decide`，不调用 `complete`）与 static baseline；固定 identityForTask、只读 history snapshot 及每次独占绝对 stateDirectory，记录模型身份并拒绝非预期 fallback；策略不能读取抽样 work/未来事件或完整 trace，输出指标、assumption identity 和可复放 trace。
- [ ] 1.5 实现少量 parameterized shared-closure Check adapter/真实集成测试，单独证明 cancel/drain 与虚拟 `unsatisfied` 的边界；不向 public AdmissionState 添加取消动作。
- [ ] 1.6 在资源配置 Change 提供静态 mapping identity 后，追加一个最终 Gate-shape scenario；记录 mapping identity，以静态分析为准，不要求实测竞争证明，且保持其与合成基础场景相互独立；算法正式比较等待平台和稳定 mapping。
- [ ] 1.7 编写内部维护说明：开发命令、输入/输出、默认 stdout、只独占新建的显式 `--out`、复现、假设、证据类别和“不保证真实 Gate 加速”边界；不新增用户 CLI 文档。

## Verification

- [ ] 2.1 在任何 native test/Case 改动前后运行 `bun run test-evidence -- check --root .`，并运行新增 workbench owner 的最窄测试；证明 seed/跨策略外生输入一致、输入拒绝、public legality、信息隐藏和错误 trace。
- [ ] 2.2 运行事件/指标测试，覆盖 rate 重算、同刻 canonical settlement、wait/no-progress、`unsatisfied`/observes、root/scoped capacity、weighted/mutex、多资源，以及两个手算 oracle 的 makespan、slot·time 和逐 resource unit·time。
- [ ] 2.3 运行 shared-closure 真实集成测试，分别记录真实 lifecycle/command 结果与虚拟结果；证明没有真实 Check 被虚拟主循环执行，且没有 source/private Product import。
- [ ] 2.4 资源 mapping 可用后，运行最终 Gate-shape scenario，复核 mapping identity 与静态分析输入；以少量 `bun run check -- --all` 观察模型偏差并记录正式时间口径/candidate identity，不新增 selector、不作真实竞争证明，也不把任何模拟观测称为已证实竞争系数或真实加速保证。
- [ ] 2.5 由非实施代理基于实际 diff 审查用户文档与内部维护材料影响；运行适用 owner 测试、typecheck、lint、`bun run check -- --all`，并向算法 Change 交接冻结 fixture、adapter/evidence version、baseline 与已知边界。
