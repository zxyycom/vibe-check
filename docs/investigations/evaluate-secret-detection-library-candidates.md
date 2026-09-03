---
title: "显式文件范围 Secret Detection 库候选评估"
formedAt: "2026-09-03T11:10:08+00:00"
question: "哪个现成 detector 能在 Bun-hosted 随包 Check 中只处理显式声明文件，并在不传播 raw secret 或其派生值的前提下支持可审计的高置信检测？"
tags:
  - "bun"
  - "implementation-libraries"
  - "secret-detection"
  - "security"
relations: []
---

## 形成时背景

`changes/add-secret-detection` 准备增加第八项随包 ordinary Check。用户已确认该能力只扫描 Check 自己显式声明的文件范围，不执行全仓库、Git history、environment、home、remote secret manager 或 binary 扫描；同时需要处理 detector 误判。

当前稳定边界要求文件来源由 owning Check 的 `{ source, include, exclude }` 选择形成 exact inputs，detector 不得重新枚举或扩大输入。活动决策 `keep-sensitive-quality-record-material-ephemeral.md` 又要求 raw secret、substring、完整 credential material 和可关联的 value-derived digest 只存在于 invocation-owned bounded memory，不得进入 Record、final data、terminal message、console、machine artifact、cache、log、错误或其它持久边界。

仓库已有通用 `reconcileFindingWaivers(...)`。它在完整 Finding 集合形成后按调用方定义的结构化 identity 对账 `unused`、`applied` 和 `overmatched` waiver，但不按 message 文本过滤、不在扫描前排除 Finding，也不替 producing Check 决定 Record、status 或 presentation。因此 detector 自带的忽略、baseline 或 suppression 不是项目 waiver 契约的替代品。

## 调查目的

本轮调查比较可用于该 Check 的现成 library 或 engine，回答：

1. 候选能否只处理调用方传入的显式文本或 exact files，而不自行扫描 repository、history、environment 或其它来源。
2. 候选的正常结果、异常、CLI 输出、baseline 或 fingerprint 是否携带 raw secret、substring 或 value-derived digest。
3. 许可证、维护状态、规则 provenance、Bun/ESM 集成、资源上限与取消能力是否适合随包能力。
4. 哪个候选值得进入下一轮 corpus、leak-canary 和 package candidate spike，哪些候选在当前约束下应排除。

本报告保存候选调查形成时认识，不建立依赖采用 Decision，不证明具体规则集的 precision/recall，也不授权修改产品、依赖或 package artifact。

## 调查范围与依据

调查时间为 2026-09-03。Terra 子代理先按只读权限审阅当前 Change、文件选择、scanner dependency 和敏感材料决策，并只使用项目官方 repository、release、source、license 与 npm metadata。主代理随后复核关键源代码、release 和 registry metadata。没有扫描本仓库、Git history、environment、home 或真实 credential。

比较范围：

- Secretlint `@secretlint/core` 13.0.5 及同版本 recommend preset/独立规则包。
- Gitleaks 8.30.1 CLI。
- TruffleHog 3.97.2 CLI。
- Yelp detect-secrets 1.5.0 Python library/CLI。

实际证据包括：

- Terra 在临时目录用 Bun 1.3.14 执行 `@secretlint/core@13.0.5` 与 recommend preset 的 synthetic-canary spike；`lintSource` 能完成检测，`maskSecrets: true` 会遮蔽 message。临时目录随后删除，仓库未写入依赖或 lockfile。
- npm registry metadata 显示 `@secretlint/core@13.0.5` 与 `@secretlint/secretlint-rule-preset-recommend@13.0.5` 均为 MIT、声明 Node `>=22.0.0`；core unpacked size 为 116,002 bytes，preset 为 632,642 bytes。Bun spike 成功只证明本轮样本可运行，不是上游 Bun 支持承诺。
- [Secretlint 13.0.5 release](https://github.com/secretlint/secretlint/releases/tag/v13.0.5)、[core `lintSource` 实现](https://github.com/secretlint/secretlint/blob/v13.0.5/packages/%40secretlint/core/src/index.ts)、[core result type](https://github.com/secretlint/secretlint/blob/v13.0.5/packages/%40secretlint/types/src/SecretLintCore.ts)、[recommend preset 规则组成](https://github.com/secretlint/secretlint/blob/v13.0.5/packages/%40secretlint/secretlint-rule-preset-recommend/src/index.ts)及[许可证](https://github.com/secretlint/secretlint/blob/v13.0.5/LICENSE)。
- [Gitleaks 8.30.1 release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1)、[官方 README 的 modes/config/redaction/resource flags](https://github.com/gitleaks/gitleaks/blob/v8.30.1/README.md)及[许可证](https://github.com/gitleaks/gitleaks/blob/v8.30.1/LICENSE)。
- [TruffleHog 3.97.2 release](https://github.com/trufflesecurity/trufflehog/releases/tag/v3.97.2)、[官方 README 的 filesystem/verification/JSON 输出](https://github.com/trufflesecurity/trufflehog/blob/v3.97.2/README.md)及[许可证](https://github.com/trufflesecurity/trufflehog/blob/v3.97.2/LICENSE)。
- [detect-secrets 1.5.0 release](https://github.com/Yelp/detect-secrets/releases/tag/v1.5.0)、[`PotentialSecret` 源码](https://github.com/Yelp/detect-secrets/blob/v1.5.0/detect_secrets/core/potential_secret.py)及[许可证](https://github.com/Yelp/detect-secrets/blob/v1.5.0/LICENSE)。

没有发现任何候选提供可直接转用为 Vibe Check v1 规则集验收的公开 aggregate precision/recall 数据；本轮没有把 GitHub stars、下载量或营销描述作为检测质量证据。

## 调查结果与边界

### 候选比较

| 候选 | 显式输入与运行边界 | 敏感材料风险 | 维护、许可证与运行约束 | 本轮结论 |
| --- | --- | --- | --- | --- |
| `@secretlint/core` 13.0.5 | `lintSource(...)` 直接处理调用方传入的内存文本；`noPhysicFilePath: true` 可避免规则读取 physical path。core 本身不要求枚举 repository 或 history。 | `maskSecrets: true` 只清理 message；返回的 `SecretLintCoreResult.sourceContent` 仍逐字保留完整输入。整个第三方 result、message、data、exception 或 debug object 都不能越过 private adapter。 | MIT，2026-08-27 发布；npm 声明 Node `>=22.0.0`。没有公开 `AbortSignal` 契约，需要 Vibe Check 自己限制每文件 bytes、总量、规则数和执行顺序。 | **有条件推荐进入 v1 spike。** |
| Gitleaks 8.30.1 | `stdin` 能避免目录扫描，`dir` 可接收文件；`git` mode 不适用。CLI 还会读取 config/environment/target `.gitleaks.toml` 和 ignore policy，必须额外封闭。 | `--redact=100` 声称对 logs/stdout 脱敏，但官方展示和 report 模型原本包含 Secret、Match、Entropy 与 Fingerprint；外部进程 stdout/stderr/report/config discovery 增加泄露面。 | MIT，2026-03-21 发布；官方声明 feature complete，后续只做安全修复。提供 timeout、target size 与 host process termination。 | **仅作条件性 fallback，不作为首选。** |
| TruffleHog 3.97.2 | `filesystem` 可接收路径，但同时包含大量其它 source、decoder、archive 和验证能力，需要显著封闭。 | 官方 JSON 示例直接包含 `Raw`、`Redacted` 与 `ExtraData`；默认结果还涉及 credential verification，必须显式关闭网络验证，仍没有适合本项目的安全输出契约。 | AGPL-3.0，2026-09-02 发布；外部进程和分发义务明显扩大当前 package 边界。 | **排除。** |
| detect-secrets 1.5.0 | Python API 可扫描 exact filename，但引入 Python runtime/process；CLI 也支持 repository workflow。 | `PotentialSecret` 明确保留 plaintext `secret_value`，生成 SHA-1 `secret_hash`，JSON baseline 输出该派生 hash；与禁止 value-derived digest 的边界直接冲突。 | Apache-2.0，正式 release 为 2024-05-06；没有面向 Bun 的取消契约，批量路径默认使用 Python multiprocessing。 | **排除。** |

### 推荐方向

本轮建议以 **精确锁定的 `@secretlint/core@13.0.5` 加静态导入的闭合规则 creators** 进入下一轮 Readiness spike，而不是直接采用 Secretlint CLI 或完整 recommend preset：

1. `secretDetection` 自己先按必填 `files` policy 收集 exact paths，执行 byte limit、fatal UTF-8 与 NUL/non-text classification，再逐文件把批准文本交给 `lintSource`。Secretlint 不拥有文件选择、project traversal、cache 或 public command option。
2. 固定 `contentType: "text"`、`noPhysicFilePath: true`、`maskSecrets: true` 和静态 `config.rules`；但不得把 masking 当成安全边界，因为 result 仍含 `sourceContent`。
3. private adapter 在同一调用栈内只提取 allowlisted rule ID、project-relative path、安全 range/line-column 与 occurrence ordinal；禁止返回、log、serialize、cache、interpolate 或作为 error cause 保存整个第三方 result、message、data、sourceContent 或异常。
4. 不直接采用完整 recommend preset。下一轮只选择少量有明确来源和规则 ID 的高置信规则，例如 private key 与经 corpus 证明的 provider token rules；每项记录 package version、source revision、license、规则 ID 与 corpus 结果。
5. 不采用 Secretlint `allowMessageIds`、rule `allows`、comment filter、baseline 或任何 raw value/regex suppression。误报处理发生在完整安全 Finding 形成之后：Secret Check 公开 Check-owned `findingWaivers`，复用通用 `reconcileFindingWaivers(...)`，用不含 secret/hash 的结构化 identity 和非空 reason 对账，同时保留原 Finding 与 unused/overmatched audit。
6. 这项 `findingWaivers` 是各 adopting Check 对通用 reconciliation 的领域接入，不应成为 Project Definition 按 warning message、Check ID 或 Record ID 解释的全局 suppression registry。项目需要复用配置时，用普通 TypeScript value 显式传给相应 Check；不同 Check 继续拥有各自 identity、Record、status 与 presentation。

### 进入实施前仍须闭合

- **规则质量：** 建立只含 synthetic、非真实 credential 的代表性 corpus，逐条证明 true-positive、placeholder、文档示例、注释、generated/lock files 和近似字符串的期望；在此之前不能宣称完整 preset 或候选 rules 具有足够 precision/recall。
- **全 surface 泄露：** 覆盖正常 finding、无 finding、rule throw、message 无 data、重复 finding、output failure、console capture、diagnostic logging、machine publication、cache/temp 和 error/stack；搜索完整 canary、定义明确的 meaningful substrings 与已列举 digest encodings。
- **资源与取消：** 决定每文件、总 bytes、规则数、并发和 cancellation checkpoint。Secretlint 没有公开 AbortSignal，不能把 `signal.aborted` 检查等同于中断正在运行的同步规则。
- **Bun 与 package：** 固化 Bun integration、ESM build、source map、third-party license、candidate 和 installed consumer tests。上游只声明 Node engine；新 Secretlint release、Node engine 或 dependency graph 变化都要求重新验证。
- **身份与 waiver：** 证明 rule/path/structure/ordinal identity 不含 raw value或 digest，value 轮换不改变 identity，移动位置只更新导航数据；unused/overmatched waiver 不能静默降低 Check status。

因此，`@secretlint/core@13.0.5` 是当前最值得继续验证的候选，而不是已经可以直接写入生产依赖的完成结论。若它无法通过全 surface canary、规则 corpus 或 Bun/package evidence，应先回到 Gitleaks `stdin + fixed config + sanitized environment + --redact=100` 的独立 spike，而不是降低敏感材料边界。新的 detector major、规则集大改、上游维护停止、公开 Bun 支持出现或目标 package host 改变时应重新调查。
