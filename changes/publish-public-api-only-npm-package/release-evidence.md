# Release Evidence

本文保存 `publish-public-api-only-npm-package` 的脱敏、可交接 release evidence；它记录当次事实和未完成边界，不保存 credential，也不授权 registry 写入。Artifact identity 以 formal receipt 为准，Gate 结论以 same-artifact invocation 为准，registry 结论只以对应时点的 authorized read 为准。

## Reading contract

本文只完整承接当次 selection、preflight、artifact、Gate、publish 与 post-install 事实，不承接流程规则或任务进度：

| Question | Authoritative owner |
| --- | --- |
| 当前完成到哪里、下一步是什么、现有授权覆盖什么 | [`tasks.md`](tasks.md#current-checkpoint) |
| release 状态链、证据条件、失败恢复和授权规则是什么 | [`design.md`](design.md#ai-consumption-contract) |
| Consumer 推荐如何安装、由哪个 runtime 执行 | [`README.md`](../../README.md#分发与兼容范围) |
| 当次 exact selection 和各阶段实际观察到了什么 | 本文；artifact 形成后还必须能追溯到 formal receipt 与 same-artifact Gate。 |

## Release selection

| Field | Current selection | Evidence boundary |
| --- | --- | --- |
| Package | `vibe-check` | Unscoped public identity；查询时未找到不等于名称已保留。 |
| Version | `0.0.1` | 当前选定的首个 positive `0.0.x` candidate；publish 前仍须重新核验 absence。 |
| Registry | `https://registry.npmjs.org/` | 只允许最终授权列出的 canonical target。 |
| Access | `public` | Generated manifest 的 closed `publishConfig` 已声明；尚未写入 registry。 |
| Dist-tag | `latest` | Explicit publish input；尚未创建或修改 registry tag。 |
| Mechanism | Local direct publish with interactive 2FA | 不使用 staged publish 或 Trusted Publishing；publish 尚未授权。 |
| Provenance | Not planned for this direct first release | 未产生；local receipt digest 与 registry integrity 仍为必需证据。 |

## Registry preflight

用户在完成本机 npm web login 后，授权 2026-08-31 的 registry/account 只读 preflight。该授权已消费，仅产生以下脱敏结果：

- Local toolchain 是 Node `26.7.0`、npm `11.19.0`；npm registry 配置与显式查询目标均为 `https://registry.npmjs.org/`。
- Registry ping 成功；`npm whoami` 与 profile name 均为 `zxyycom`。
- Account email 已验证，2FA mode 是 `auth-and-writes`；未读取或记录 email address、token、OTP、`.npmrc` 内容或其它 credential-derived value。
- 对 `vibe-check` 的 metadata read 返回 not-found，因此本次选择首个 positive patch `0.0.1`。该结果是时效事实，不证明私有占用状态、名称保留或未来 publish authority。
- Preflight 未执行 install、configuration write、access/dist-tag change、stage 或 publish。任何后续 registry/account read 也需要新的当次授权。

## Formal artifact and Gate

| Evidence | Current status |
| --- | --- |
| Clean source revision | Pending consumer-facing release docs review and commit. |
| `vibe-check@0.0.1` formal staging | Not built. |
| Receipted tarball and SHA-256/SHA-512 | Not built. |
| Staging/packed audits | Not run against a formal artifact. |
| Ancestry-external consumer acceptance | Not run against a formal artifact. |
| Same-artifact full Project Gate | Not run. |
| Repository-quality finding disposition | Pending the formal full Gate invocation. |

Earlier full Gate results consumed a fingerprint local candidate and are not formal release evidence. Formal preparation must start from the next clean reviewed commit and may build the `0.0.1` tarball only once; any package-byte change restarts preparation and verification.

## Publication and registry acceptance

`npm publish` is not authorized and has not run. No package version, dist-tag, access state or provenance has been written to npm. After same-artifact full Gate passes, publish requires a fresh authorization naming registry, access, version, tag, absolute receipted tarball, both digests and the local direct+2FA mechanism. Post-publication metadata reads and ancestry-external registry installation require another authorization after the publish result is known; that acceptance explicitly runs `npm install vibe-check@<exact-version>` and executes the product checks on Bun.
