# Proposal

本 Plan 在已经完成 repository cutover 和 package API documentation 的基础上，把正式 Project Gate 从迁移期 command catalog 收敛为 project-owned ordinary `Check` values。每个 value 遵循 public `Check` contract，但 catalog、profile 和 process helper 仍是项目私有实现。本 Change 同时为下游公开发布 Change 生成 Gate optimization evidence，不执行发布。

## Why

当前正式 Gate 已经消费 package-owned aggregation，但 authoring 仍保留首轮迁移结构：

- [`scripts/project-gate/catalog.ts`](../../scripts/project-gate/catalog.ts) 用 `command`、`args`、profile 和 tag 描述 20 个 process Checks，并以 `20 / 14 / 19` 固定数量阻止 catalog 自然演进。
- [`scripts/quality/project-gate/project-definition.ts`](../../scripts/quality/project-gate/project-definition.ts) 把每个 descriptor 无差别地转换为 process Check。已有 import-safe TypeScript operation 的 docs、Decision Records 和 Test Evidence 因而仍经过 argv、console 与 exit code 回环。
- `quality-quick-check` 与 `quality-full-check` 执行同一个 command；`product-tests` 已被 Test Evidence 的完整 Bun test surface 覆盖；scripts typecheck 在 Gate adapter 已准备 candidate 后还会再次进入 candidate preparation。
- Foundation 的四项 full-only gates 是从历史子仓库/package 边界迁入的 wrapper acceptance；它们分别重复 workspace scripts typecheck/lint/format 与 Test Evidence，package command 可运行本身不再构成独立质量事实。
- 当前无参 adapter 与 `verify:vibe-check-workspace` 默认选择 full；目标调用契约是缺省选择 required，`:full` 或显式 `--profile full` 选择当前全部 Checks。没有真实 full-only assurance 时，required/full 可以同集，不能为制造差异保留重复 Check。

上述结构证明首轮 cutover 可以安全运行，不是长期 Check authoring contract。继续保留它会让新的 typed capabilities 仍以 CLI 作为内部 API，并让历史数量、wrapper chain 和 profile-derived identity 代替质量事实。

上游输入现已齐备：repository cutover、minimal Check/Record、terminal messages/visibility、typed dependency output 和 [package API documentation handoff](../archive/ship-public-package-api-documentation/package-api-documentation-handoff.md) 均已交付。本 Change 不再等待其它 active Change。

## Outcome

正式 Project Gate 由 project-owned ordinary `Check` values 组成：一个独立质量事实对应一个稳定 Check identity；Gate entry 只附加 project-local profile/tag selection metadata，不复制 Check 的 identity、options、dependency 或 execution。

Import-safe TypeScript capabilities 由 Check execution 直接调用。只有 external executable、锁定 toolchain、exact installed-candidate consumer、process isolation，或确有独立消费者的 package boundary 本身属于 assurance 时，Check 才建立 process boundary 并保存 transcript。Focused CLI 继续作为同一 capability 的独立 adapter，但 Gate 不把 CLI adapter 当作领域 API。

目标 catalog 有 14 个稳定 identities，required/full 当前都选择这 14 个 Checks。无参 adapter、`verify:vibe-check-workspace` 和 `:required` 选择 required；`:full` 或显式 `--profile full` 显式选择 full。`quality-quick-check` 与 `quality-full-check` 合并为同时属于 required/full 的 `repository-quality`；`product-tests` 删除，因为 Test Evidence 已执行完整 Product test surface；四个 Foundation package gates 也删除，其源码类型、lint、format 和 tests 分别由 workspace owners 与 Test Evidence 接管。`14 / 14` 只是该 assurance mapping 的派生结果，代码和测试不得恢复固定数量锁或人为创建 full-only identity。

完成后，正式 required/full roots、local partial eligibility、package aggregate、candidate identity、progress、取消、process transcript 和 `0/1/2` adapter closure 继续成立；`gate-optimization-handoff.md` 将这些结果绑定到 documentation-complete 的 current exact candidate，供独立 publish Change 使用。

## Scope

### Intended Change

- 以 current assurance mapping 替换 command-only catalog：保留 13 个 required/full checks，合并一个 `repository-quality`，删除独立 `product-tests` 与 4 个历史 Foundation package gates。
- 让 Project Gate composition 直接产生遵循 public contract 的 project-owned ordinary `Check` values；profile/tag eligibility 从同一 entry collection 投影 raw N/A facts 与 aggregate eligible IDs。
- 将无参 adapter 与默认 root 从当前 full 改为 required，保留显式 required/full roots 和 `--profile` override，并保持 full 是 required assurance 的超集。
- 为 typecheck、lint、format、docs validation、Decision Records、Test Evidence 和 rule validation 使用 import-safe typed operations；CLI 仅负责 argv、console 与 exit mapping。
- 让 Gate adapter 成为 candidate preparation 的唯一 owner；repository quality 消费已经安装并验证的 candidate，不再通过 quality CLI 再次 prepare。
- 只为真实 process assurance 写 transcript，并保持取消、failure Record、terminal message 和 unavailable reason 的现有安全边界。
- 落实 Readiness caller 审计的 retained/deleted adapter 结论，并在 cleanup 后重新搜索 callers；同步 Script Tooling、测试、Case evidence、candidate evidence 和 Gate optimization handoff。

### Resulting Impacts

- Catalog、eligibility、aggregation 和 tests 必须以 Check identity set 与 assurance obligation 为依据，不再以 descriptor count 或 command mapping 为依据。
- Development、docs、governance 与 quality scripts 需要分离 import-safe operation 和 retained CLI adapter；Gate 不得 import 会在 module evaluation 读取 argv、写 console、设置 exit code 或启动 work 的模块。
- Foundation source/type/lint/format/test 由普通 workspace assurance 接管。Readiness caller/config 审计已确认 private package envelope 没有独立消费者或独有配置约束；实施删除 Foundation manifest、专用 tsconfig、workspace importer 和 scoped CLI branches，并把 README 改成普通 scripts source 说明。
- Gate implementation 变化会触发 current candidate、installed entry、documentation projection 与 handoff evidence 的重新验证；已归档 handoff 只提供输入和失效条件，不自动证明新 artifact。
- Public package API、Product Check contract、Run aggregation grammar、registry state 和 publish authorization 均不由本 Change 改变。

## Success Criteria

- Project Definition 由 ordinary `Check` values 组成；Gate-specific entry 只拥有 profile/tag metadata，且没有通用 command descriptor catalog、固定 `20 / 14 / 19` 或替代数量锁。
- Required/full 当前共同的 14 个 identity 由明确 set/membership 测试证明；显式 full 仍选择 catalog 中全部 Checks，但不要求它必须比 required 多。Excluded Checks 仍产生稳定 `profile-excluded` / `tag-disabled` raw facts，aggregate 只消费同次 selection 的 eligible IDs。
- 无参 adapter、`verify:vibe-check-workspace` 和 `:required` 均选择 required；`:full` 和显式 `--profile full` 选择 full，不从 ambient CI 推断 profile。
- `repository-quality` 是 required/full 共用的唯一 identity，Gate invocation 只准备一次 candidate；quality root CLI 仍可独立完成自己的 prepare-and-run workflow。
- Product 与 Foundation test suites 在 Gate 中只由 Test Evidence 的完整 supported Bun surface 执行；Foundation type/lint/format 只由对应 workspace checks 证明，不再重复执行 package wrappers。
- Native operation、external process、package boundary 和 retained CLI 的 caller/owner 均可追溯；零独立 caller 的 wrapper 已删除，其余 CLI 继续通过 focused tests 证明 argv/output/exit mapping。
- Native Checks 不写空 process transcript；process-backed Checks 保持 signal-aware cancellation、safe transcript、failure Record、terminal message 和 unavailable mapping。
- Targeted tests、Case closure、docs validation、typecheck/lint/format、partial eligibility、required/full Gate 和 current exact candidate acceptance 全部通过。
- `gate-optimization-handoff.md` 绑定 current assurance inventory、identity membership、caller audit、正式 roots、matching candidate artifact 与验证结果，且不声称 registry publish 已发生或已获授权。

## Affected Owners

- Project Gate stable behavior：[`docs/script-tooling.md`](../../docs/script-tooling.md#project-gate)。
- Project Gate adapter、selection 与 catalog：`scripts/project-gate/**`。
- Bound Definition、ordinary/native/process Checks 与 tests：`scripts/quality/project-gate/**`。
- Import-safe development、docs、Decision Records、Test Evidence 与 quality operations：对应 `scripts/development/**`、`scripts/docs/**`、`scripts/decision-records.ts`、`scripts/test-evidence/**`、`scripts/quality/**`。
- CLI/root workflow consumers：root `package.json`、待删除的 Foundation package envelope 与相邻 CLI tests。
- Test evidence：[`docs/testing/cases/`](../../docs/testing/cases/) 与 Test Evidence checker。
- Downstream delivery：[`changes/vibe-check-package-and-gate-delivery.md`](../vibe-check-package-and-gate-delivery.md)、[`changes/active-change-portfolio.md`](../active-change-portfolio.md) 和 [`publish-public-api-only-npm-package`](../publish-public-api-only-npm-package/)。
- Default profile direction：[`default-project-gate-to-required-profile`](../../docs/decisions/default-project-gate-to-required-profile.md)。
- Foundation assurance direction：[`integrate-foundation-into-workspace-assurance`](../../docs/decisions/integrate-foundation-into-workspace-assurance.md)。
