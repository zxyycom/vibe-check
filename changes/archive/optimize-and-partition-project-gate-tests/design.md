# Design

本设计把 entity identity、behavior execution 与高成本 package acceptance 分成可独立选择和失败的 Gate facts，并只复用经过审计的 package artifact 与 invocation-owned candidate data。

## Context

- `scripts/test-evidence/supported-runner-profile.json` 是完整 Bun test surface 的唯一文件集合事实源。
- Change 开始时，Test Evidence 对同一文件集合依次执行四个 ast-grep scans 与完整 Bun JUnit execution；后者是 Gate 关键路径。
- Change 基线实验中，Bun 1.3.14 registration-only JUnit 用不匹配 name pattern 在 0.737 秒内报告全部 216 个当时的 entity，且 file/line/suite/name 与完整 execution report 完全相等。
- Project Gate entries 已拥有 profile/tag metadata、opaque Run flags、not-applicable projection、显式 aggregate 和 per-process transcript。
- `preparePackageCandidate` 在 Gate Check admission 前已经准备 exact candidate；package tests 可以复用其 immutable tarball，但仍需对私有或外部 consumer 执行目标边界要求的真实安装。

## Goals / Non-Goals

- Goals: 缩短默认 required Gate；保持完整 entity/Case closure；让稳定 owner 与三个 package acceptance 责任有独立 process failure；让 package lane 显式 opt-in/full；让大型 acceptance fixture 内的行为拥有独立测试实体；把 invocation-owned prepared candidate 表达为 typed provider data；让 artifact 与 external consumer 都消费同一 output；继续按行为 owner 拆分 Product package execution；删除重复 build/install/audit 而不删除行为证据；用重复 A/B 而非单次直觉选择 root parallelism。
- Non-Goals: 不启用 Bun `--parallel`；不缓存测试成功；不按 Git diff 缩小 entity surface；不改变 Product scheduler/API；不删除 package acceptance；不把 timing 写成跨主机硬预算。

## Decisions

### Intended Change

1. Test Evidence 的 Bun adapter 以专用不匹配 pattern 生成 registration JUnit。它只在报告通过验证后接受 runner 的 no-tests-selected exit，并要求 root tests、failures、skipped 和 testcase identity 完整一致。
2. Gate test execution catalog 从同一 supported profile 解析文件，并按稳定 owner 形成 Product package behavior、Product runtime、package supporting、Project tooling、Test Evidence tooling、validation、ordinary scripts tooling，以及 package artifact/candidate/external-consumer 互斥子 Checks。高成本 package Checks 明确列出各自的物理 acceptance 文件。
3. 每个分区是普通 process Check，直接运行显式文件列表，不使用 Bun file parallel。Partition 在构造 entries 前证明 union 等于完整 surface 且 intersection 为空。仍执行 build/install 的 candidate 与 external consumer Checks 共享 named mutex；只读 provider material 的 artifact Check 保持独立调度，三者各自拥有 transcript 与 terminal fact。
4. `package-tests` 是唯一 opt-in Gate tag。required 缺少 enable 时将对应 Check 投影为 `tag-not-enabled`；full 自动视为 enabled；显式 disable 仍优先排除，enable/disable 冲突在 argument parse 或 flag reconstruction 时失败。
5. Artifact、candidate lifecycle 与 isolated consumer 文件把原有单一巨型测试拆成共享一次昂贵 setup 的语义实体。Candidate lifecycle 直接证明 stale/malformed receipt 的 rebuild classification，cold lifecycle 物理证明同一个 rebuild executor，不再为 routing 重复第二次 build。Isolated consumer 复用 Gate/checkout 已准备的 exact artifact，不再建立第二套 preparation state，但仍在 ancestry-external consumer 真实安装、typecheck 和运行。
6. Gate adapter 把加载 bound Run 前已经准备并核对 exact entry 的 candidate 传入 project-private runtime。一个 required typed provider Check 重新验证 artifact digest、绝对路径、installed entry containment 与 closed schema，并以 versioned final data 保留结果。External consumer Check 声明 direct dependency、要求 upstream passed、调用 provider parser，再把 artifact path/digest 作为受控 process environment；直接目标测试在没有 Gate input 时才回退到本地 preparation。
7. Artifact acceptance Check 也声明 prepared-candidate provider 为 direct dependency，消费 staging/artifact identity 执行自己的 material assertions；直接目标测试仍可 fresh build。Candidate lifecycle 内已保留真实 cold build/install/rebuild，因此 Gate 路径不为 artifact assertions 再建立第二套 build state。
8. Product package execution 不继续保留一个覆盖全部 package-provided Checks 的粗 lane，而按 duplicate detection、file metrics、function metrics、JSON、Markdown link 与 supporting/project behaviors 的稳定 owner 划分互斥子 Checks；拆分首先提供失败事实，不预设一定缩短 wall。
9. Candidate lifecycle 将 reusable-state assessment 的纯运算结论与实际 build/install action 分开，使 malformed/stale receipt、installation drift 和 artifact corruption 的原因可直接验证；至少一个 cold build/install/reuse 与必要 recovery 继续使用物理 acceptance。
10. Reused candidate 只重复验证实际会被下游消费的 artifact/installation facts；build-only staging evidence 若要退出 reuse path，必须由 tar audit 覆盖对应 runtime/source-map/material 义务。Root scheduler 只在 3/4 路各 5 个交错样本证明收益和稳定性后修改。
11. `scripts/package/**` 中除 artifact/candidate/external-consumer 三项物理 acceptance 外的 receipt、input parser、module specifier、source-map 与 public inventory tests 独立形成 required package-supporting Check；它们证明快速运算与 material contract，不因目录相同而继承物理 lifecycle opt-in。

### Resulting Impacts

- `test-evidence` Check 不再声称 behavior tests 全部通过；多个 owner execution Checks 分别承担该事实。
- Required aggregate 会排除三个可见的 package raw facts，reason 为 `tag-not-enabled`；full aggregate 包含它们。正式 root script names 不变。
- 新测试实体需要加入现有 package candidate semantic Case；Gate control/definition test proof 更新为 opt-in/full membership。
- Process transcript 数量增加，但每个文件只在一个分区执行，不产生重复 behavior execution；candidate 与 external consumer 的 package mutex 保留细粒度事实而不让 build/install 互相争用。
- Required snapshot 新增 prepared candidate typed final data 与 preparation action/reason；artifact 和 external consumer 分别按需消费 staging/tar 或 artifact path/digest，process transcript 不复制该 data。
- Direct `bun run test-evidence -- check --root .` 变为结构闭合命令；完整行为 assurance 由 Project Gate 或显式目标 `bun test` 承担，文档必须准确区分。

## Risks / Trade-offs

- Registration-only relies on Bun continuing to report skipped testcase locations. Parser validation and adapter tests fail closed if this changes.
- Reusing the checkout candidate in isolated-consumer test couples that test to candidate preparation; direct execution retains fallback preparation, while Gate guarantees preparation before Check work.
- Prepared candidate final data 包含本机绝对路径，只属于当前 invocation 的 Check facts；正式 Gate 关闭 machine publication。Provider 必须在输出前验证 digest/containment，consumer 不能把 environment 当作未验证的 ambient override。
- Artifact acceptance 消费 provider output 后不再证明该 test process 自己调用 builder；cold builder execution 由 candidate lifecycle acceptance 继续证明，artifact process 只证明同一次 exact output 的 package material contract。
- 多个 default test 子进程会在四核 host 竞争资源。固定三路 root scheduler cap 与不使用文件级 parallel 限制风险；candidate 与 external consumer 的 build/install 额外共享 named mutex，artifact 只在变为 provider material 的只读验收后解除该 mutex。
- Required no longer proves physical package acceptance. Full and explicit tag paths must remain documented and verified for release/package work.
- Mutable receipt/reinstall fixtures 不能只因为也叫 fixture 就提升为 provider data；它们的破坏顺序与清理生命周期保持 test-local。

## Open Questions

无。用户已确认继续尝试 artifact output 消费、Product owner lane 拆分、3/4 路五组 A/B、candidate 运算/物理拆分与 staging reuse audit；未通过语义或性能验证的候选不会仅为完成清单而保留。

## Implementation Observations

所有样本均来自同一 WSL2、Bun 1.3.14、4 CPU 环境；计时只作为本次变更的对比证据，不构成跨主机硬门禁。

| Gate 路径 | 样本数 | wall 结果 | package Checks | 结果 |
| --- | ---: | ---: | --- | --- |
| 修改前 required | 5 | 28.432s | 随完整 Bun test surface 隐式执行 | 5 次通过 |
| 前一阶段 typed-provider required | 5 | 8.309s | 三项均 `tag-not-enabled`；provider 执行 | 5 次通过 |
| 前一阶段 typed-provider required + `--enable-tag package-tests` | 1 | 19.082s | provider 与三项 package Checks 均执行 | 通过 |
| 前一阶段 typed-provider full | 3 | 19.993s | candidate 12.5s、artifact 2.7s、consumer 2.8s 中位数 | 3 次通过 |
| owner/output refinement required，root=3 | 5 | 中位数 6.196s | package Checks 均 `tag-not-enabled` | 5 次通过 |
| owner/output refinement required，root=4 | 5 | 中位数 6.448s | 与三路相同 membership 的 A/B | 5 次通过 |
| 最终正式 required root | 1 | engine 6.2s；wall 6.779s | 30 Checks；27 passed、3 not-applicable | 通过 |
| 最终 required + `package-tests` | 1 | engine 11.2s；wall 11.901s | provider 与三项 package acceptance 执行 | 30/30 通过 |
| 最终正式 full root | 1 | engine 11.2s；wall 11.890s | candidate 6.5s、artifact 2.3s、consumer 3.6s | 30/30 通过 |
| 规范审查后 required 复验 | 1 | engine 6.7s；wall 10.804s | 27 passed、3 not-applicable | 通过 |
| 规范审查后 full 复验 | 1 | engine 19.3s；wall 19.952s | candidate 13.9s、artifact 2.3s、consumer 3.6s | 30/30 通过 |

前一阶段 required 的 wall 中位数已经降低 20.123s，即 70.8%。本轮 3/4 路各五个交错样本进一步证明三路中位数快 252ms（3.9%）、均值快约 192ms（3.0%），因此正式 root 从四路收敛为三路。完整物理 package coverage 没有被删除：显式 tag 与 full 仍分别执行三个 acceptance Checks。当前 Gate 有 30 个独立 Checks；Product package lane 已拆为六个行为 owner Checks，六个非物理 package supporting test files 形成独立 required Check，236 个测试实体由 62 个语义 Case 全部闭合。

规范审查后的两次复验用于证明代码整理后的 membership 与行为，不重新建立性能基线。Required 的 engine 时间仍为 6.7 秒，但 wall 还包含 Gate engine 外的 candidate preparation；full 的单次 candidate acceptance 波动到 13.9 秒。单个复验样本不足以推翻或替代 3/4 路各五次交错 A/B，因此 scheduler 判断仍只采用重复样本。

Warm candidate preparation 移除 staging 内容重扫前的五个样本中位数约 358ms，收窄后五次为 74.3–90.2ms、中位数 79.1ms；packed artifact 与 installed consumer audit 仍在 reuse path，staging 内容由 artifact acceptance 重新验收。Artifact 改为只读 provider material 后，full Gate 的 package mutex 3×3 探针中，保留三项串行的两个 warm 样本为 11.60/11.71s（另有一个 22.98s 环境离群），仅解除 artifact mutex 的三个样本为 10.72/10.99/11.23s；因此只保留 candidate 与 external consumer 的 build/install mutex。

直接启用 Bun 文件级并发的探针曾产生 package test timeout、JUnit identity 缺失和 worker 挂起，因此实现没有把 `--parallel` 作为优化手段。后续细分使用 Project Check 级调度；candidate 与 external consumer 共享 build/install mutex，只读 provider material 的 artifact acceptance 独立调度。三个原本各只有一个巨型实体的 acceptance 文件现有 15 个语义实体，但各文件的昂贵 fixture 仍只创建一次。只有 Gate adapter 已经产生、在本次 invocation 内有效且有真实 downstream consumer 的 prepared candidate 被提升为 typed output；会破坏 receipt/install 的 mutable fixture 继续由测试本地拥有。最终收益来自 entity closure 与 behavior execution 解耦、稳定 owner partition、昂贵 assurance 显式化，以及删除 package test 内部的重复 build/install。
