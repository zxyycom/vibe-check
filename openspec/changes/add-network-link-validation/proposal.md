本临时且未审计的 change proposal 目标是仅在调用者显式启用联网时安全验证 HTTP(S) 外链可达性，并与确定性链接分类严格分层。

## Why

确定性 Markdown 解析可以发现 malformed、unsupported 或缺失本地目标，却不能证明外部 HTTP(S) 目标当前可达；无边界地加入联网请求则会引入 SSRF、隐式网络访问、临时故障误报和不可复现门禁。

## What Changes

- 新增 tool-neutral 的 `network-link-validation` capability，只消费 `add-markdown-link-validation` 已分类且不含query value/userinfo/fragment/line的sanitized URL shape与line-independent semantic occurrence identity；保留query的complete request URL只在bounded invocation memory用于validation/request，不重新解析Markdown或改写确定性finding。
- public config v2 通过 closed `disabled | online` 语义显式 opt in；neutral/default 必须为 `disabled`，offline scan、`init`、help 与未启用的 gate 都不得解析 DNS、建立 socket 或读取 ambient network credentials/proxy。
- 只允许 HTTP(S)，拒绝 userinfo，并对初始 URL、每次 redirect 与每次 retry 分别执行 canonical host、DNS 和全部解析地址检查；阻断 loopback、private、link-local、unspecified、multicast、保留地址与 cloud metadata target，并使用可避免 DNS rebinding TOCTOU 的连接策略。
- 固定 bounded timeout、total budget、concurrency、redirect、retry、cache 与 HEAD-to-bounded-GET 策略；invocation dedup以exact request URL + complete effective timeout/redirect/retry/TTL/Product-policy projection为unit，不同per-file policy不共享outcome，scheduler仍取active policies最小concurrency。任一hop含query时zero persistent cache，只有全链路queryless work才可保存脱敏稳定结论。
- Stable network fingerprint只使用exact finding semantic code、line-independent source semantic occurrence与sanitized scheme/host/path/query-key shape，绝不读取raw URL或其digest，也不依赖line/start/query value；同一occurrence的query-value rotation不制造regression，请求本身仍保留query。
- 三个network checks各自注册exact content findingCode/security rule与closed typed evidence catalog，使safe URL shape、404/410 status、redirect reason/count或safety reason/stage可机器读取；catalog固定kind/required/order/identity/redaction且禁止raw query、userinfo、body、DNS/private response，message不作必需机器语义源。
- 将经 GET 确认的稳定 404/410、redirect loop/limit 与安全策略阻断建模为各自稳定 finding；DNS/transport/TLS timeout、429、5xx 和其它临时结果保持 operational indeterminate，不伪装为 broken link。
- 明确 401/403 protected endpoint、429 rate limit、Retry-After、temporary failure、HEAD 不支持/不可信与 bounded GET fallback 的结果语义，以及 current、显式-baseline-only、changed、regressions、gate 与 completeness 的归约方式；省略baseline不得推断network regression。
- **BREAKING**：依赖 `add-file-policy-overrides` 的 single-active public config v2 hard cut 增加 closed、tool-neutral 的联网 policy 字段；v1 file-backed input 在 scan work 前拒绝，不提供 dual reader，也不通过 implicit environment 或 gate 自动启用网络。
- 本 change 依赖 `standardize-quality-capability-contract` 的通用 finding/completeness/gate/output contract、`add-markdown-link-validation` 的sanitized line-independent semantic occurrence/request-material handoff，以及 `add-file-policy-overrides` 的 config v2 per-file patch；feature 只注册capability/check/evidence catalogs，使expected `semanticRegistryFingerprint`与examples/validator fixtures更新，但不修改immutable machine v2 schema bytes。

## Capabilities

### New Capabilities

- `network-link-validation`：定义显式联网、HTTP(S) external-link handoff、SSRF 防护、请求预算、缓存、稳定 finding、indeterminate outcome、comparison、gate 与 completeness。

### Modified Capabilities

- `scan-configuration`：在 config v2 中加入 closed、tool-neutral 的 network-link mode 与 request-policy fields，并固定 neutral/default offline 语义。
- `test-fixtures`：增加本地受控 transport/DNS doubles 驱动的 offline、redirect、SSRF、timeout、retry、cache、auth/rate-limit、stable finding 与 incomplete-gate 证明；required tests 不访问公共互联网。

## Impact

- Product Config/runtime schema/editor projection/canonical example 需要在依赖 change 建立的 v2 contract 上增加 network-specific fields。
- Markdown link handoff、Product Core、network transport boundary、DNS/redirect validation、finding comparison、completeness/gate 与 human/machine output 需要接入 foundation contract。
- 网络测试必须使用 injectable deterministic transport/resolver 与 fake clock，覆盖sanitized handoff、policy-specific dedup、typed evidence、IPv4、IPv6、IPv4-mapped IPv6、redirect、DNS rebinding 和 sanitized diagnostic，不依赖真实公共站点。
- 不新增 implicit CLI/network mode，不把 HTTP client、DNS library 或扫描工具名称写入 public config，也不授权本 proposal 阶段修改源码、主 specs 或长期文档。
