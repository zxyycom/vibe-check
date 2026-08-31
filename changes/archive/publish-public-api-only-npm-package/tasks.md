# Tasks

任务按“恢复当前事实与输入 → 建立 formal artifact → same-artifact full Gate → 单独授权 publish → registry consumer acceptance”执行；只有直接证据支持时才勾选。

## Readiness

### Current checkpoint

本节完整承接任务进度、下一 checkpoint 和授权边界；`.change-plan.json` 单独承接 lifecycle machine value。2026-08-31 从 rejected unscoped identity 转向个人 scope 后，当前状态如下：

| Field | Current fact | Evidence boundary |
| --- | --- | --- |
| Lifecycle / progress | `plan`，18/18 项完成；等待执行已获授权的 `archive` lifecycle。 | Checkbox 只表示对应任务已有直接证据；归档仍由当前用户授权和 `archive` 门禁承接。 |
| Public release | `@zxyycom/vibe-check@0.0.1` 已以 public access 发布，`latest` 指向 `0.0.1`；机制为 local direct publish with interactive 2FA，未生成 provenance。 | Registry metadata/integrity 与无凭据 exact-version npm install 由 [`release-evidence.md`](release-evidence.md#published-scoped-release) 承接。 |
| Formal artifact | Source commit `2a454f0a6162afebb6729a4cfef969594d045c10`、767-file receipt、SHA-256 `8ada3a1e…b4cf`、SHA-512 SRI 与 same-artifact full Gate 36/36 已闭合。 | build output 不进入 Git；portable identity、receipt digest、Gate invocation 和 registry equality 保存在 release evidence。 |
| Consumer acceptance | Repository ancestry 外的 `npm install @zxyycom/vibe-check@0.0.1` 已通过 types、documentation 与 Bun runtime 验收并清理。 | Validation 使用 exact version 和无 user npm config；README 的普通 consumer command 仍保持 unversioned conventional install。 |
| Git release identity | Annotated `v0.0.1` 已推送并指向 formal source commit `2a454f0`。 | Tag 不复制 npm 分发，不创建 GitHub Release。 |
| Current authorization | 用户已明确要求把本 Change 推进到归档；此前 publish、registry read/install 与 tag 授权均已消费。 | 当前只允许完成 repository 内证据/owner/Decision 同步、验证、Change 归档和既有 Git 流程；不授权新的 npm publish、dist-tag/access 或其它 registry 写入。 |
| Next checkpoint | 运行最终 Change Plan archive check，并执行 `archive changes/publish-public-api-only-npm-package`；随后从 active portfolio 移除该 Change 并复核 archived list。 | Archive 只移动已完成历史，不授权或触发 npm、tag、GitHub Release 或其它外部写入。 |

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
- [x] 1.5 已从 clean commit `2a454f0a6162afebb6729a4cfef969594d045c10` 仅构建一次 scoped `0.0.1` formal tarball，生成 767-file receipt 并复核 manifest、legal、dependency、public inventory、README/docs/declarations/runtime/source/machine materials 与 SHA-256/SHA-512；归档审阅再次确认现存 tarball SHA-256 未漂移。
- [x] 1.6 Same-artifact full Gate 36/36 后，用户按 exact registry/public/version/tag/tarball/digests/local-direct mechanism 执行一次 scoped publish；registry 明确记录 `0.0.1`，propagation 期间只重试 metadata read，没有盲目重试 publish 或修改 dist-tag/access。

## Verification

- [x] 2.1 Scoped name/path、release version/tag、receipt/digest、manifest/legal/host、artifact drift、local/formal 隔离、clean Git source、root command 与 Gate explicit-input 的最窄 tests 通过；Test Evidence 保持全部 current entities/Case 闭合。Formal success path 仍由 clean reviewed commit 后的 tasks 1.5、2.2、2.3 承接。
- [x] 2.2 Receipted formal tarball 已通过 staging/packed audits 与 ancestry-external local consumer types/documentation/runtime acceptance，证明 root-only export、首发 public inventory、exact dependencies、MIT/Bun contract 和无 workspace/ancestor fallback。
- [x] 2.3 `release-receipt` full Project Gate 36/36 passed；duplicate/function/Markdown findings 为零，唯一 historical v2 schema file finding 由 active Decision-backed immutable-bytes waiver 处置，且 publish 前没有后续 byte-affecting 变化。
- [x] 2.4 `bun run validate -- docs`、`bun run decisions -- check` 与 active Change check 通过；最终 `bun run verify:vibe-check-workspace:full` 36/36 passed，覆盖 typecheck、lint、dependency/package、entry、tests 与 docs。首次归档 Gate 暴露的 2 个 stale anchor 已修复并重跑为零 Markdown finding；diff/evidence 审阅未发现 credential 或临时 consumer identity。
- [x] 2.5 Publish 后及归档审阅已核验 exact `0.0.1`、`latest`、public availability 与 registry `dist.integrity` 等于 receipt SHA-512；本 release 未采用 provenance。全新 ancestry-external consumer 以无 user npm config 的 exact-version npm install 通过 types、documentation 与 Bun runtime acceptance，并已清理。
- [x] 2.6 Sanitized formal/publish/registry/install/tag evidence 已写入本 Change，package/Gate delivery navigation 与 active portfolio 已同步 exact `0.0.1` 完成事实；README consumer contract 未变化。npm unit、scoped identity、MIT、Bun host、`0.0.x` 与 release-quality Decisions 已在完整 evidence 后标记 aligned；Success Criteria 逐项复核通过，用户已明确授权推进归档。
