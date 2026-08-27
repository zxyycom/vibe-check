# Proposal

本计划通过拆分 Project Gate 测试 assurance 与消除 package lifecycle 重复工作，降低默认 Gate latency，并保留完整、显式可选择的测试证据。

## Why

Change 开始时，required Gate 五次样本中位数为 28.43 秒，`Semantic Case ledger` 占 25.7 秒。进一步测量证明静态 discovery 与 Case 读取约 0.19 秒，主要成本来自 Test Evidence 为取得 JUnit identity 而串行执行完整 69 文件测试面；其中三个物理 package lifecycle tests 占测试时间约 79% 至 81%，并重复执行五次 artifact build 和多次安装。

直接提高 Bun 文件并发会造成 package tests timeout、JUnit identity 缺少 line，以及 worker 挂起。真实结果需要在保持 fail-closed entity closure 的同时，把测试执行按稳定责任拆开，并让高成本 package acceptance 成为显式 assurance。

## Outcome

默认 required Gate 独立执行 Test Evidence entity closure 与按稳定 owner 分区的 Product、Project tooling、Test Evidence tooling、validation 和 ordinary scripts 子 Checks，并把 adapter 已准备的 exact candidate 及 preparation action/reason 保留为 typed provider fact；在不运行 package lifecycle Checks 时仍形成明确 aggregate。full 或显式 `package-tests` opt-in 执行 artifact、candidate lifecycle 与 external consumer 三个独立物理 package Checks，其中 artifact 与 external consumer 都通过 direct dependency 按需消费同一 candidate material。Package tests 保留真实 build/audit、fallback、reinstall 和 external consumer 证据，但不再重复无独立证明价值的 build/install 或 staging reuse audit。

## Scope

### Intended Change

- 将 Test Evidence runtime discovery 改为完整文件面的 registration-only JUnit closure，并独立验证全部 skipped identity。
- 建立覆盖完整测试文件面的稳定 owner 子 Checks；package artifact、candidate lifecycle 与 external consumer 分别结算，并校验 partition 无遗漏或重复。
- 增加 `--enable-tag package-tests` 与 `tag-not-enabled` eligibility；required 默认排除 package lane，full 自动包含。
- 将三个单实体 package acceptance 文件拆成共享 fixture 的语义测试实体，并收敛 candidate receipt 与 isolated consumer tests 中的重复 artifact build/install，同时保持 owner 承诺的真实边界。
- 将 Gate adapter 已准备的 invocation-owned candidate 提升为带 parser 的 typed provider Check，并让 artifact 与 external consumer Checks 显式依赖、按需消费 staging/tar 或 artifact identity；mutable test-local fixture 不提升。
- 将 Product package test lane 按六个行为 owner 继续拆分，非物理 `scripts/package/**` tests 另成 required supporting Check，并用三路/四路各五次交错 A/B 选择 root scheduler；mutex 只覆盖继续执行 build/install 的 package Checks。
- 将 candidate reuse assessment 与 mutation executor 分开；复用时审计 packed artifact 与 installed consumer，staging 内容由 artifact acceptance owner 验收。

### Resulting Impacts

- 修订 Test Evidence 与 default/full Gate 的长期决策和当前 owner 文档。
- 更新 Gate catalog、controls、eligibility、entry validation、definition、aggregation、transcript 和相关 tests/Case proofs。
- 修改测试正文并新增 receipt 边界实体，要求完整 Case 账本迁移、目标测试和前后闭合。
- 需要分别测量 required、required+package tag 与 full，证明 membership 和性能结果；Bun parallel 保持禁用。

## Success Criteria

- Test Evidence registration closure 对完整当前测试面恢复与完整执行 JUnit 相同的 entity set，并拒绝 malformed、failed、非全 skipped 或 identity 缺失报告。
- execution 子 Checks 对当前 test profile 精确 partition，正式 required/full 和显式 package tag membership 符合决策；三个 package acceptance 责任分别拥有失败 transcript，继续执行 build/install 的 candidate 与 external consumer 通过 named mutex 避免资源竞争。
- Artifact、candidate lifecycle 与 external consumer 的独立行为拥有单独测试实体和 Case mapping，同时各文件只建立一次昂贵 fixture。
- Prepared candidate provider 输出通过 closed parser、artifact digest 与路径边界验证；artifact 和 external consumer 的 direct dependency 分别证明它们按需消费同一次 Gate candidate。
- Package lifecycle tests 保留真实 artifact、candidate fallback/reinstall 和 ancestry-external consumer 信号，完整 Case closure 通过。
- 同环境五次 warm required Gate 中位数显著低于 28.43 秒基线；full 与显式 package lane 均通过，且报告实际样本而非把 timing 变成不稳定硬门禁。
- scripts typecheck/lint/format、docs、Decision Records、Test Evidence 及 required/full workspace verification 全部通过。

## Affected Owners

- `docs/testing.md` 与 `docs/testing/case-maintenance.md`
- `docs/script-tooling.md`
- `docs/decisions/`
- `scripts/test-evidence/**`
- `scripts/project/gate/**`
- `scripts/package/**` tests 与 `docs/testing/cases/**`
