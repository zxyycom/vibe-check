# Tasks

先把已确认的 public scope、Secretlint 规则候选、通用 waiver 与安全证据闭合，再进入 production implementation。

## Readiness

- [x] 0.1 已按当前 ordinary Check/options/minimal Record/output contract 重置旧 Plan，移除 shared policy、Manager/TaskPlan 与 catalog 假设。
- [x] 0.2 已确认本 Change 因泄露、漏报、provenance 与长期规则维护成本后置，不阻塞首次公开发布。
- [x] 0.3 已确认新增随包 `secretDetection`、必填显式 `files` exact scope、不自动加入 Gate，并采用项目通用 Finding waiver 对账而非 message suppression。
- [x] 0.4 以 `@secretlint/core@13.0.5` 为优先候选，完成精确 rules、license/provenance、representative corpus、Bun/package、resource limits、maintenance owner 与 coverage-status 判断。
- [x] 0.5 为第八项随包 Check、显式 files、private raw boundary 与 safe waiver 形成并确认长期 Decision 后继。

## Implementation

- [x] 1.1 先建立 exact-scope、bounded classifier、detector corpus 与全 surface synthetic leak-canary fixtures。
- [x] 1.2 实现 Secretlint private adapter、safe markerized issues、value-independent IDs、coverage/failure 和 resource limits；第三方 raw result 不得越过 adapter。
- [x] 1.3 为 safe secret Findings 接入 `findingWaivers` 与通用 reconciliation，发布 applied reason、unused/overmatched audit，并保证 waiver 不掩盖 coverage 或 execution failure。
- [x] 1.4 新增 ordinary constructor/options/runtime validation、provider-owned parser、Records/final counts/security docs、package materials 与 semantic Cases。

## Verification

- [x] 2.1 运行 exact scope、classifier/detector/identity/coverage/failure/waiver/leak-canary 最窄 tests 与 Test Evidence closure。
- [x] 2.2 运行 product typecheck/lint/tests、docs/package candidate 和 installed consumer，并搜索所有可见/持久 surfaces。
- [x] 2.3 运行 required/full Gate，复核没有真实 credentials、raw/digest material、scope expansion、silent waiver 或 unsupported protection claims。
