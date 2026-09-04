# Tasks

任务保持暂停；只有 Resume Conditions成立并完成安全设计复核后才进入 implementation。

## Readiness

- [x] 0.1 已按当前 ordinary Check/options/dependency/Core contract重置旧 Plan，确认旧 external snapshot/handoff不存在。
- [x] 0.2 已确认 Network Check因 SSRF、credential与 nondeterminism风险后置，不阻塞首次公开发布。
- [ ] 0.3 取得真实 consumer，选择安全输入 acquisition并固定授权、target、redirect、resource与 four-state policy。

## Implementation

- [ ] 1.1 建立 hermetic DNS/HTTP/redirect/rebinding/credential-canary fixtures与 transport adapter tests。
- [ ] 1.2 实现 explicit opt-in options、per-hop SSRF validation、bounded transport、redaction和 safe issues。
- [ ] 1.3 新增 ordinary value/runtime validation、Records/final counts/public docs与 semantic Cases，不修改离线 Link verdict。

## Verification

- [ ] 2.1 运行 authorization/SSRF/redirect/credentials/resources/status/failure最窄 tests与 Test Evidence closure。
- [ ] 2.2 运行 product typecheck/lint/tests、docs/package candidate和 installed consumer；不访问真实公网。
- [ ] 2.3 运行默认 `bun run check` 与 complete `bun run check -- --all`，并复核 zero ambient credentials、raw-material absence与 nondeterministic failure分层。
