# Design

本设计将 `secretDetection` 收敛为只消费显式 exact files 的随包 Check，并以 private detector adapter 与项目通用 Finding waiver 机制同时控制敏感材料和误判。

## Context

[`keep-sensitive-quality-record-material-ephemeral.md`](../../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md) 要求 raw 敏感材料只存在于 invocation-owned bounded memory。当前 Core 接受 arbitrary canonical Record/final data 但不做业务级 secret redaction；因此 owning Check 必须在调用 reporter、生成 message 或返回 result 前完成全部安全投影。

[`select-check-files-from-explicit-sources.md`](../../docs/decisions/select-check-files-from-explicit-sources.md) 要求读取文件的 Check 自己拥有 `{ source, include, exclude }`，且 scanner 不得重新发现或扩大输入。用户进一步确认 `secretDetection` 是新增的随包 Check，只检测显式声明的文件范围，不做全仓库扫描。

[`provide-generic-finding-waiver-reconciliation.md`](../../docs/decisions/provide-generic-finding-waiver-reconciliation.md) 已提供项目通用 Finding waiver 对账；不同 Check 继续拥有自己的 identity、Record、status 与 presentation。用户确认 Secret Detection 采用这项通用机制处理可能误判，不新增按 warning 文本匹配的 Core suppression。

[`evaluate-secret-detection-library-candidates.md`](../../docs/investigations/evaluate-secret-detection-library-candidates.md) 在 2026-09-03 比较 Secretlint、Gitleaks、TruffleHog 与 detect-secrets。报告有条件推荐 `@secretlint/core@13.0.5` 作为 in-process 候选，但其 `lintSource` result 仍含完整 `sourceContent`；masking 不能替代 Check-local private adapter。

## Goals / Non-Goals

**Goals**

- 提供第八项随包 `secretDetection` ordinary Check，只处理必填 `files` policy 的 exact selection。
- 只发布不依赖 raw value、substring、message text 或 value-derived digest 的 safe evidence。
- 用项目通用 `reconcileFindingWaivers(...)` 对安全 Finding 做可审计误判豁免。
- 让 coverage gap、actionable/waived Finding 与 execution unavailable 各有明确语义。
- 在写生产 detector 前闭合具体 rules、license/provenance、representative corpus 与 Bun/package evidence。

**Non-Goals**

- 不建立 Product-wide/global scan scope，也不让 detector 自己遍历 project root。
- 不向 Project Definition 增加按 warning message、Check ID 或 Record ID 解释的全局 suppression registry。
- 不提供 arbitrary user regex、raw match output、detector-native baseline、raw-value suppression database 或 automatic remediation。
- 不扫描 history/environment/home/binary/remote secret systems，不验证 credential 有效性，也不自动加入项目 Gate。

## Decisions

### Intended Change

1. **新增随包 ordinary Check。** Public surface 使用 `secretDetection(...)` constructor、固定 Check ID、provider-owned parser、公开 authoring/resolved options、final data、Record data 与 unavailable reason types；Core 不识别该 Check ID 或给予特殊执行路径。
2. **显式文件范围是唯一输入授权。** `files` 必填且完整解析为 `{ source, include, exclude }`；缺失或非法值在 constructor/preflight 边界拒绝。Owning Check 收集 selected paths、完成 eligibility reconciliation 并只把 approved exact inputs 交给 detector。零 selected/eligible inputs 与 source/read failure 保持不同结果。
3. **固定最小 Secretlint rule set。** 精确锁定 MIT 许可、Secretlint monorepo `v13.0.5` 的 `@secretlint/core@13.0.5` 与 `@secretlint/secretlint-rule-privatekey@13.0.5`，静态构造只含 private-key creator 的单规则集合；不直接采用完整 recommend preset。后续新增规则或替换 detector 必须重新完成 corpus、Bun/package 与全 surface canary 证据，不能降低安全边界。
4. **Bounded classification。** 在 full read 前检查 file size；small candidates 用 fatal UTF-8 与 NUL/non-text classifier。Oversize/unknown text 不调用 detector，并按 closed coverage policy 形成 safe gap；known non-text 计入 final counts 但不产生 secret finding。
5. **Raw material 只留在 private stack/memory。** 第三方 library 可以在一次 detector 调用的私有内存结果中保留 source/raw material，但 adapter 只向上返回 allowlisted rule ID、markerized structural context、range 和 ordinal。禁止把整个 result/message/data/exception 交给 reporter、return value、console、writer、persistent cache 或 error cause；不允许先写入持久 surface 再依赖删除补救。
6. **Safe semantic identity 与通用 waiver。** Finding identity 由 rule ID、source path、markerized structural class 与 occurrence ordinal 组成；不消费 raw match、prefix/suffix、hash、message text 或 line。`findingWaivers` 在完整 safe Finding 集合形成后调用 `reconcileFindingWaivers(...)`，只豁免唯一匹配的 finding；unused/overmatched 配置发布安全 audit，coverage gap 和 execution unavailable 不可豁免。
7. **Status 分层。** 正常 scanned 且没有 actionable finding/gap 为 `passed`；存在 high-confidence actionable finding 为 `failed`；只有 waived findings 时保持正常完成并在 final data/Records 中保留完整证据。NUL、invalid UTF-8、per-file/total-byte/file-count limit 是 deterministic coverage gap，固定为 `failed`；read/collection、detector throw、unexpected protocol 与 cancellation 始终 `unavailable`，不能表示“未发现”。
8. **全 surface canary。** Tests 对 success/finding/waived/unused/overmatched/coverage/read/detector/protocol/output failure 后的所有可见和持久 surface 搜索 raw canary、定义明确的 meaningful substring 与已列举 digest encoding。

### Resulting Impacts

- Resume Readiness 必须同时闭合具体 Secretlint rules、classification、waiver identity、resource limits、third-party license/package materials、Cases 与 full candidate evidence。
- Project 可通过普通 TypeScript value 复用 waiver authoring，并显式传给 adopting Checks；generic reconciliation 保持唯一共享机制，各 Check 仍独立拥有领域 identity 和 settlement。
- 现行“七项随包 Check”长期描述需要在实施前形成后继 Decision，以第八项公共能力、显式 files 和安全 waiver 边界演进，而不是由 Change checkbox 暗中改变。
- 任何要求显示 raw match、可逆 fingerprint、value-derived digest、持久 raw output 或按 message 文本抑制的 consumer 都需要新的长期 Decision，不能局部放宽本 Plan。

## Risks / Trade-offs

- 高置信规则会漏掉未知 secret 格式；必须明确 scope，不把产品描述为全面 credential protection。
- Secretlint 当前 npm metadata 只声明 Node `>=22.0.0`，本轮 Bun spike 成功不构成上游 Bun 支持承诺；必须固化 Bun consumer evidence。
- Secretlint result 包含完整 sourceContent，adapter 的一次错误传播即可越过敏感边界；全 surface canary 和类型边界是实施门禁。
- Value-independent identity 可能牺牲某些去重便利，但避免生成新的敏感关联材料。
- Waiver 会降低 actionable finding 对 status 的影响；保留原 Finding、reason 与 stale/overbroad audit 比扫描前排除或 message suppression 更可审计。

## Open Questions

- 无。本 Change 的 rule set、provenance/license、corpus、maintenance owner、resource limits 与 coverage/unavailable status 已由当前实施和长期 Decision 固定；未来 detector 或 rule 变更须建立新的决策与验证证据。

### Resolved Implementation Choices

- **Rule/provenance/license：** 固定使用 Secretlint monorepo release `v13.0.5` 的 `@secretlint/core@13.0.5` 与 `@secretlint/secretlint-rule-privatekey@13.0.5`，二者均为 MIT；package artifact 收录并校验该 license receipt。
- **Representative corpus：** 非真实 private-key canary 是正例；短占位 PEM、plain text 是反例；精确范围外相同 canary 验证不会被选择。canary 同时检验 direct result、Records、Run snapshot、machine publication 与 diagnostic log，且自身及 digest 不进入产品结果。
- **Resource/status：** 单文件 1 MiB、invocation 总计 8 MiB、2048 selected files、一个顺序规则；每个 file 和 detector 边界检查 cancellation。以 POSIX `O_NOFOLLOW` descriptor 对 final leaf 进行 regular-file/size 检查和 bounded read；每次成功 read 均消耗总预算，即使随后是 non-text gap。NUL、invalid UTF-8 与三项资源限制形成 `failed` coverage gap；collection/read/no-follow unsupported/detector/protocol/cancellation 是 `unavailable`。
- **Maintenance owner：** `docs/checks/secret-detection.md` 所属的 package Check owner 维护固定 rule set、依赖升级和 corpus；任何 Secretlint release、engine 或依赖图变化都必须重跑 package candidate、installed consumer 与 canary evidence。

## Implementation Observations

2026-08-24：因 detector 质量、provenance 和 leak-canary 验收成本，本 Change 后置且不阻塞首版。

2026-09-03：用户恢复该方向，确认它是随包 ordinary Check、只检测显式声明的文件范围，并采用项目通用 Finding waiver 机制处理误判。Terra library 调查有条件推荐 Secretlint core；第三方 raw result 可以短暂存在于 private invocation memory，但不能先写入持久 surface 再删除。

## Resume Conditions

1. Public outcome 固定为随包、显式 `files`、不自动加入 Gate 的 `secretDetection` ordinary Check；已由用户确认。
2. 固定依赖/rule 的 license/provenance、representative corpus、Bun/package evidence 和 maintenance owner 可持续复核。
3. 任何后续 detector/rule 变化仍能运行全 surface synthetic leak-canary 和通用 waiver audit evidence，无需真实 credential 或 host secrets。
