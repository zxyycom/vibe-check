# Release Evidence

本文保存 `publish-public-api-only-npm-package` 的脱敏、可交接 release evidence；它区分当前 scoped selection、已经失效的 unscoped artifact 与外部操作结果，不保存 credential，也不授权 registry 写入。Artifact identity 只以当前 formal receipt 为准，Gate 结论只以消费该 receipt 的 same-artifact invocation 为准，registry 结论只以对应时点的 authorized result 为准。

## Reading contract

本文只完整承接当次 selection、preflight、artifact、Gate、publish 与 post-install 事实，不承接流程规则或任务进度：

| Question | Authoritative owner |
| --- | --- |
| 当前完成到哪里、下一步是什么、现有授权覆盖什么 | [`tasks.md`](tasks.md#current-checkpoint) |
| release 状态链、证据条件、失败恢复和授权规则是什么 | [`design.md`](design.md#ai-consumption-contract) |
| Consumer 推荐如何安装、由哪个 runtime 执行 | [`README.md`](../../README.md#分发与兼容范围) |
| 当次 exact selection 和各阶段实际观察到了什么 | 本文；artifact 形成后还必须能追溯到 formal receipt 与 same-artifact Gate。 |

后续 agent 必须先读取“Current scoped selection”，再按时间线判断旧材料是否仍适用。下文标为 invalidated 的 unscoped artifact 只证明此前执行过什么，不能恢复为当前 publish input。

## Current scoped selection

| Field | Current selection | Evidence boundary |
| --- | --- | --- |
| Package | `@zxyycom/vibe-check` | 用户已确认的个人 scope public identity；尚未执行 scoped registry read。 |
| Version | `0.0.1` | 当前本地首发 candidate；只有 fresh scoped preflight 能证明查询时 absence。 |
| Registry | `https://registry.npmjs.org/` | 只允许后续授权列出的 canonical target。 |
| Access | `public` | Generated manifest 与首次 publish command 必须显式声明；尚未写入 scoped package 状态。 |
| Dist-tag | `latest` | Planned explicit publish input；尚未为 scoped package 创建或修改。 |
| Mechanism | Local direct publish with interactive 2FA | 不使用 staged publish 或 Trusted Publishing；新的 scoped publish 尚未授权。 |
| Provenance | Not planned for this direct first release | 尚未产生；local receipt digest 与 registry integrity 仍为必需证据。 |

当前 scoped identity 没有 formal tarball、release receipt、same-artifact Gate 或 registry acceptance。Package name、README/import examples 和 artifact path 都是 formal fingerprint inputs，因此旧 unscoped receipt 不能在改名后复用。

## Unscoped attempt and invalidation

### Registry and account observations

用户在完成本机 npm web login 后，授权并完成 2026-08-31 的 unscoped registry/account 只读 preflight 与最终 recheck。只保留以下脱敏结果：

- Local toolchain 是 Node `26.7.0`、npm `11.19.0`，显式 registry 为 `https://registry.npmjs.org/`。
- Registry ping 成功；`npm whoami` 与 profile name 均为 `zxyycom`。
- Account email 已验证，2FA mode 是 `auth-and-writes`；未读取或记录 email address、token、OTP、`.npmrc` 内容或其它 credential-derived value。
- 最终 recheck 时间为 `2026-08-31T03:40:31Z`；当时 `vibe-check` 与 `vibe-check@0.0.1` metadata read 都返回 not-found。该时效事实没有保留名称，也没有绕过 npm 的近似名称保护。

这些观察只属于被拒绝的 unscoped selection，不证明当前 `@zxyycom/vibe-check@0.0.1` 的 availability。

### Formal artifact and same-artifact Gate

第一次 formal preparation 从 clean commit `01a6ae5633167f21bab0e28e5cd19020ba18bc22` 构建 staging 和 tarball 后，在写 receipt 前发现 inventory sort contract 不一致并安全失败；release-owned partial output 随后清理。修复后的 commit `bbc1fc3aa48d99cde8e77f0abcc4cbf31f7a581f` 生成以下 unscoped receipt：

| Evidence | Invalidated unscoped result |
| --- | --- |
| Package | `vibe-check@0.0.1`, tag `latest` |
| Source commit | `bbc1fc3aa48d99cde8e77f0abcc4cbf31f7a581f` |
| Input fingerprint | `a7f3f0661822d9f67f1d93960f0c12eef05dba74459821726916abaecc2a40aa` |
| Artifact path | `build/artifacts/vibe-check-0.0.1.tgz` |
| Receipt path | `build/releases/vibe-check-0.0.1.release.json` |
| Tar inventory | 767 files |
| SHA-256 | `c38624c424f2215140261e1ef526768d6d42d7fe5cbfa5c0b249f0aa5140829a` |
| SHA-512 SRI | `sha512-67ogj0Aqj7hFElETQnE2oBLkXchmiu/PfFUwXyP6MFU4y55LYkzJjX42q3rR1spDoXhlZoFEIETk3R5L1QgqwA==` |
| Same-artifact full Gate | 36/36 passed |

Gate 重新验证了 receipt source、两种 digest、staging/packed bytes，以及 ancestry-external types/documentation/runtime acceptance。Repository-quality 结果包含零项 duplicate、function 和 Markdown finding；唯一的非阻断 file finding 是必须保持 bytes 不变的 `docs/schemas/historical/v2/vibe-check-run.schema.json`，已有 active Decision-backed waiver。

该 artifact 通过了自身 identity contract，但其 manifest、documentation、installed path 和 receipt 都指向 unscoped `vibe-check`，因此不再是当前 release 的有效输入。Scoped transition 已删除它独占的 staging、tarball、receipt 和 cache；上表 digest 只保留为失败尝试证据。

### Publish rejection

用户于 `2026-08-31T03:46:14Z` 对 unscoped tarball 发起一次 direct publish。npm CLI 返回 exit code `1`、HTTP `403` 和 pkgid `vibe-check@0.0.1`；明确原因是 package name `vibe-check` 与既有 `vibecheck` 过于相似，并建议改用 `@zxyycom/vibe-check`。

这是明确被拒绝的 PUT，不是网络结果不确定。npm 没有返回 publish success、dist-tag creation、access mutation 或 provenance；失败后也没有执行 registry read/install，且没有创建 Git tag。不得重试 unscoped command；修改 CLI flags 不能改变 tarball 内的 package name。

## Scoped transition and local validation

用户于 2026-08-31 授权把项目、tests、consumer documentation、Decision/Change evidence 和 release paths 调整到 `@zxyycom/vibe-check`，并补写此前为了保持 clean receipt 而暂缓的 formal-build/Gate evidence。该操作产生以下本地结果：

| Evidence | Scoped local result |
| --- | --- |
| Generated package identity | `@zxyycom/vibe-check`；public npm registry/access、MIT、Bun `>=1.3.14`、canonical repository 与唯一 root export 均由 packed manifest audit 覆盖。 |
| Local candidate | `0.0.0-local.315a2ef74ea8`；tarball 为 `build/artifacts/zxyycom-vibe-check-0.0.0-local.315a2ef74ea8.tgz`。 |
| Installed public entry | `scripts/project/node_modules/@zxyycom/vibe-check/index.mjs`。 |
| Full Project Gate | 36/36 passed；结构化 Markdown link finding count 为 0。唯一 file-metric finding 是 Decision-backed historical schema waiver。 |
| Invalidated output cleanup | 旧 unscoped staging、tarball、receipt 和 formal-release cache 均已删除；没有 scoped formal `0.0.1` artifact/receipt。 |
| External effects | 未执行 scoped registry/account read、configuration write、publish、dist-tag/access change、registry install 或 Git tag。 |

这些结果证明 scoped identity 的当前本地实现和 consumer contract，但不是 formal release evidence：local candidate 没有 explicit release version，也没有绑定 clean reviewed commit 的 formal receipt。当前进度、下一 checkpoint 与仍有效的授权边界只从 [`tasks.md`](tasks.md#current-checkpoint) 恢复。
