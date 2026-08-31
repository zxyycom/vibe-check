# Tasks

任务按“恢复当前事实与输入 → 建立 formal artifact → same-artifact full Gate → 单独授权 publish → registry consumer acceptance”执行；只有直接证据支持时才勾选。

## Readiness

### Current checkpoint

本节完整承接任务进度、下一 checkpoint 和授权边界；`.change-plan.json` 单独承接 lifecycle machine value。2026-08-31 从 rejected unscoped identity 转向个人 scope 后，当前状态如下：

| Field | Current fact | Evidence boundary |
| --- | --- | --- |
| Lifecycle / progress | `plan`，11/18 项完成。 | Checkbox 只表示对应本地任务已有直接证据，不授予外部操作权限。 |
| Public selection | `@zxyycom/vibe-check@0.0.1`、tag `latest`、public access、local direct publish with interactive 2FA。 | 这是拟议 selection；尚未执行 scoped registry preflight，不证明 name/version availability 或 publish authority。 |
| Local implementation | Scoped generated manifest、artifact/receipt path、consumer import/install path、README/docs、Decision 与 tests 已同步。 | 本地 candidate `0.0.0-local.315a2ef74ea8` current；full Gate 36/36，Markdown finding count 为 0，仅保留历史 schema 的既有 file-metric waiver。 |
| Formal release | 当前没有 scoped formal tarball、receipt 或 same-artifact release Gate。 | 旧 `vibe-check@0.0.1` artifact/receipt 已失效并删除；其 E403 与 Gate 只作为历史 evidence。 |
| Current authorization | 允许提交本轮 scoped 本地实现、文档与证据；不允许 scoped registry/account read、配置写入、publish、dist-tag/access change 或 registry install。 | 工具可访问性、Plan stage、Decision status 或本地 Gate 不能扩大该范围。 |
| Next checkpoint | 从 clean reviewed HEAD 恢复后，请求 fresh scoped registry-read authorization 并执行 preflight。 | Preflight 通过后才能冻结 version/tag/mechanism 并从该 HEAD 新建 formal receipt；publish 仍需 same-artifact full Gate 后的另一次明确授权。 |

- [x] 0.1 已在 2026-08-31 按 current docs/source/tests、active Decisions 和 `package:status` 恢复 Plan baseline，确认 root workspace 与 `0.0.0-local.*` candidate 均不是正式 publish input，并排除四项 post-release active Changes。
- [x] 0.2 已用 AI-ready consumer contract 重写 proposal/design，明确 owner、单向状态链、authorization checkpoints、same-artifact 证据、失败恢复和可检查 Success Criteria；Plan formation 未授予任何外部操作，后续新增的 local implementation/validation 授权已单独记录且仍不包含 registry 或 credential access。
- [x] 0.3 用户已确认 GitHub username 作为个人项目权利人，own MIT notice 固定为 `Copyright (c) 2026 zxyycom`；current Git remote 确认 canonical repository 为 `zxyycom/vibe-check`，本地 full consumer matrix 在 pinned Bun `1.3.14` 通过，因此 manifest lower bound 取 `>=1.3.14`。Formal tarball 与 registry consumer 仍须在同一版本复验该 lower bound。
- [x] 0.4 用户在本机 web login 后授权并完成 unscoped registry/account 只读 preflight；脱敏观察值、未执行事项和时效 caveat 只由 [`release-evidence.md`](release-evidence.md#registry-and-account-observations) 完整记录。该 read scope 已消费，不能证明当前 scoped selection 的 availability，也未产生 credential 或 configuration write 授权。
- [x] 0.5 已在 release-doc commit 后复核 Plan distance 只来自本 Change 的 implementation/checkpoint commits，确认相关 active Decisions、public inventory、production dependency/legal inputs、README/docs projection、Gate owner 与四项 post-release Changes 均未改变 Plan；clean HEAD 的 `package:status` 报告 current local candidate `0.0.0-local.663307f7539d`，`package:verify` full Gate 36/36 通过。
- [x] 0.6 已保存 unscoped formal receipt、same-artifact Gate 36/36 与 npm `E403` 的脱敏证据；用户确认改用个人 scope，`publish-user-scoped-vibe-check-publicly` 已替代 unscoped identity，且没有创建 Git tag、dist-tag 或成功的 registry version。

## Implementation

- [x] 1.1 让 formal/local artifact path 使用 Bun 对 scoped name 生成的 filesystem-safe stem，同时保留无网络 prepare/verify、closed version/tag、clean-source、portable receipt、两种 digest 与 local/formal state 隔离。
- [x] 1.2 让 closed generated manifest、staging/tar/install audits 与 tests 使用 `@zxyycom/vibe-check`，并继续机械验证 own MIT、Bun `>=1.3.14`、canonical repository、public target、唯一 root export 与禁止项。
- [x] 1.3 让 private Project Gate 与 ancestry-external consumer 从 exact installed scoped entry 消费 receipt 指向的 tarball，保持 full-only release input、digest/path/fingerprint 重验和无 local fallback。
- [x] 1.4 将 README、全部 package import examples、JSDoc projection、`docs/script-tooling.md`、active portfolio、Change artifacts 和 Test Evidence 同步到 scoped identity；README 使用常规 scoped npm 安装命令，时效状态只由 release evidence 承接。
- [ ] 1.5 从 clean reviewed commit 仅构建一次 formal tarball，生成 receipt 并复核 manifest、own/third-party legal texts、production dependency closure、public inventory、README/docs/declarations/runtime/source/machine materials 与全部 digests；任何 byte 变化都重建并重新开始验证。
- [ ] 1.6 Same-artifact full Gate 通过且最终 preflight 仍匹配后，取得逐项列明 registry/access/version/tag/absolute tarball/digests/mechanism 的 publish 授权，只执行该授权的 tarball publish；保存脱敏结果，网络/CLI 结果不明确时停止并先请求 exact-version read 授权，绝不盲目重试。

## Verification

- [x] 2.1 Scoped name/path、release version/tag、receipt/digest、manifest/legal/host、artifact drift、local/formal 隔离、clean Git source、root command 与 Gate explicit-input 的最窄 tests 通过；Test Evidence 保持全部 current entities/Case 闭合。Formal success path 仍由 clean reviewed commit 后的 tasks 1.5、2.2、2.3 承接。
- [ ] 2.2 对 receipted formal tarball 运行 package staging/packed audits 与 ancestry-external local consumer types/documentation/runtime acceptance，证明 only-root export、四项首发 Checks、exact dependencies、license/Bun contract 和无 workspace/ancestor fallback。
- [ ] 2.3 运行 `bun run verify:vibe-check-workspace:full`，确认同一 formal tarball 覆盖完整 package/Gate assurance，并逐项处置当次 file/function/Markdown link repository-quality findings；最后一个 byte-affecting 变化后必须重跑。
- [ ] 2.4 运行 `bun run validate -- docs`、`bun run decisions -- check`、`bun run change-plan -- check changes/publish-public-api-only-npm-package` 及受影响的 typecheck/lint/dependency/entry checks，检查局部 diff 与 release receipt/evidence 均无 credential 或临时 consumer identity 泄露。
- [ ] 2.5 Publish 成功后取得新的 registry read/install 授权，核验 exact version/tag/public access、`dist.integrity` 与 receipt SHA-512；若采用 provenance 则验证 source commit/repository。随后在全新 ancestry-external 目录显式运行 `npm install @zxyycom/vibe-check@<exact-version>`，并通过 types、documentation 与 Bun runtime acceptance，清理临时目录。
- [ ] 2.6 将 sanitized publish/post-install evidence 写入本 Change，并更新交付导航和 release notes 的 exact public-version 事实；README 只有 consumer contract 实际变化时才同步。仅在 current owners 与验证完整时审阅相关 Decision alignment；逐项复核 Success Criteria，归档仍需单独明确授权。
