# Proposal

本 proposal 是实现不扩散原始秘密材料的 Product-owned Secret Detection Check 的可改写实施计划。

**恢复门禁：** 本 Plan 的实现路径与 Git 基线早于当前 `src/{definition,checks,core,run,output,foundation}/**` module owners；不得按旧 `src/product/**` 细节直接实施。恢复时先对照当前 owner、代码和测试重新完成语义审阅，更新本 Change 的 proposal/design/tasks，并运行 `bun run change-plan -- plan changes/add-secret-detection` 刷新基线。

## Why

访问令牌、私钥和其它凭据容易被误写进源码、文档或配置。检查必须短暂读取候选值才能发现问题，但 raw match、value-derived digest、source excerpt、native error 或测试失败若进入 `QualityRecord`、diagnostic、cache、artifact、log 或 output，就会让质量工具成为新的泄露渠道。

## Outcome

Secret Detection Check 在 Project Definition 与 file policy 批准的普通文件中执行有界、高置信度检测；原始 bytes 只存在于 invocation-owned detector memory。Producing Check 只向 CheckManager/RecordManager 提交安全 rule identity、project-relative source、current location、line-independent occurrence identity 和 coverage records；DecisionPolicy、output、cache 与测试都不依赖 secret value、substring、regex、message 或可反推 digest。正常完成时只返回 closed `passed | failed` verdict：`clean` 映射为 `passed`，任一 finding 或 coverage gap 映射为 `failed`。

## Scope

### Intended Change

- Product neutral definition 启用本 built-in Check，默认 `maximumFileBytes` 为 1 MiB；closed Check policy 允许在 `1..67108864` bytes 内调整 limit，Project Definition 可以选择/省略 Check，file policy 只能缩小 inputs 或调整 owner 声明为可覆盖的 leaves。
- Candidate 来自 global normalized inventory 中 resolved policy enabled 的 ordinary files，不按少量源码 extension allowlist；global excluded/generated/vendor path 不能由 Check 或 override 恢复。
- 不超过 limit 的 candidate 执行 bounded full read，只把 valid UTF-8/no-NUL text 交给 detector。超过 limit 的 candidate 最多读取 8192-byte classification prefix：能证明 non-text 则排除，否则产生 `secret-scan-coverage-gap` record，绝不读取 suffix 或交给 detector。
- 使用 Product-owned、closed、high-confidence rule catalog，首版覆盖明确私钥 material、已知 token format 与强 credential-assignment context；不启用独立 generic entropy-only rule，不开放 project regex、custom command、backend/tool selector 或 native output。
- `likely-secret` record 不含 raw match、长度、excerpt 或 value-derived fingerprint；identity 只使用 stable Product rule、normalized source path、把同一 context 中全部 detected spans 替换为固定 marker 后的 structural context，以及 deterministic occurrence ordinal。Line 与 current range 只用于导航。
- `secret-scan-coverage-gap` 只发布 safe file size、effective limit 与 project-relative path；normal non-text exclusion进入 CheckResult coverage summary，不产生 secret record。
- 每个 candidate 通过 shared static TaskPlan 执行，不建立 feature-local pool。Normal completion 的 private disposition/safe summary 可保留 `clean | findings | coverage-gaps` 与 counts，但 CheckResult verdict 只能是 `passed | failed`：没有 `likely-secret` finding 且没有 `secret-scan-coverage-gap` 时 `passed`，否则 `failed`。Read/detector/task/protocol failure 使所属 CheckRun failed 且 `result = null`，此前已验证提交的 records 继续保留。
- 首版不扫描 Git history、home、environment、remote secret manager或 binary content，不验证credential有效性，不自动吊销/修改源文件，不持久缓存 secret detector results，也不建立 secret-specific suppression engine或输出格式。

### Resulting Impacts

上述检测方案要求 raw material 始终止于 invocation-owned detector memory，并将 coverage、safe records、结果语义与全链路 leak-canary 验证作为同一交付边界。

## Success Criteria

- Synthetic likely-secret fixtures产生可定位 records，但 stdout、stderr、console、report、machine artifacts、cache、temp、logs、diagnostics和失败路径均找不到 raw canary、其 prefix/suffix 或 value-derived digest。
- Same structural occurrence 仅更换 secret value 或移动 line 时 record identity稳定；新增 occurrence得到不同identity，identity generation没有读取raw value作为hash/input。
- Candidate size、UTF-8/NUL、8192-byte oversized prefix、limit endpoints与read failure都有边界证据；oversized unknown text得到coverage-gap record且detector zero reads，non-text exclusion可在CheckResult中观察。
- Project neutral、Project Definition选择、file policy缩小、global scope与static TaskPlan共同形成唯一 exact inputs；Check不能恢复excluded/generated/vendor path或建立私有并发池。
- `QualityRecord`、CheckResult、CheckRun diagnostic、DecisionPolicy evidence 与 public output 只接收 safe semantics；normal clean/findings/coverage-gaps 分别稳定映射为 `passed/failed/failed`，执行或协议失败则是 failed CheckRun + `result = null`，不撤销此前合法 records，也不伪装为“未发现秘密”。
- Architecture、Configuration、Scan Scope、Quality/Output、安全说明与测试证据 owner 已同步，目标产品检查、leak canary 和 required workspace verification 通过。

## Affected Owners

- `docs/architecture.md`：Secret Detection Check、private detector boundary、TaskPlan、CheckManager/RecordManager 与 Core 的职责。
- `docs/configuration.md`：Product neutral definition、Project Definition 中 closed secret policy 与 file-policy leaves。
- `docs/scan-scope.md`：ordinary-file candidates、global exclusion、bounded text classification 与 exact-input handoff。
- `docs/quality-metrics.md`：由 CheckResult、QualityRecord、DecisionPolicy 和执行完整性取代旧 warning 推断后的质量语义。
- `docs/output.md`：安全 record、coverage、diagnostic、current location 与 machine/human projection。
- `src/product/**`：Check/policy catalog、classifier、detector、TaskPlan binding、安全 normalization、result/output 与测试。
- `docs/testing/cases/**`：detector、coverage、identity、failure、policy、scope、output 与全 surface leak-canary 证据。
