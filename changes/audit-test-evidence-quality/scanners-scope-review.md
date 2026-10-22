# Scanners / scope 全量测试审查

## 结论与范围

- 已逐一审读本分区 **26 个文件、77 个当前实体**的全部正文、全部参数行、实际委托 helper / fixture，以及必要实现；不是按名称或同质场景抽样。
- 发现 **1 处可删的局部无增量断言、3 个须保留独立义务后补强的实体**。没有证据支持直接删除整个实体；不按耗时、同 Case、相似 fixture 或 thin wrapper 判定重复。
- 精确 keys 来自主线程提供的本轮 `scanners_scope-scope.json`；审读结束重新核对 26 个源码 SHA-256，**不匹配为 0**。本地 `scanners_scope/coverage.json` 保存全部实际已读 keys，未读为 0；它只是本轮临时覆盖证据，不是新 Case 账本。
- 本轮仅静态审查，未执行测试正文、Gate、build、install、网络、Git stage / commit，也未修改源码、测试、Case 或旧 Gate。全树 766 实体 / 190 Case 的起点闭合复用主线程结果，不重复运行。

## 当前 owner 与判断依据

先读 `AGENTS.md`、文档导航、测试策略、Case 维护、`test-evidence-review` skill 与编码规范；再读四篇公开 Check 指南（duplicate / file metrics / maintenance / secret）、scanner dependencies、Project files、collecting-project-files、finding-waivers 与 Check results 的相应 owner。逐 key 对照主线程的 `cases-by-entity.json` 中 Owner / Proves。

CodeGraph 已检查索引状态，并查询 `collectProjectFileSets` 的定义与引用；最初一次文件树查询未按目录收窄，故不把它当作调用闭合。后续使用限定路径的文件读取恢复 actual imports / helper / implementation。评价链为：**当前 owner 承诺 → 可观察故障 → fixture 是否进入分支 → 断言独立性、可靠性及维护增量**。下列“反事实仍可通过”均为源码推理，未运行 mutation proof，不表示当前产品有同样 bug。

## 可执行候选

### SS-01：删除同实参的 SUT 自比较，仅限一个断言

- 文件 / 行：`src/package-checks/duplicate-detection/cache/store.test.ts:132-135`，委托函数 `assertDefaultJscpdIdentity`。
- 完整实体：`quality measurement cache > keys duplicate-code cache by scanner and exact input identity`（注册于同文件第 18 行）。
- Case / owner：`AUX-QUALITY-CACHE-001`；`docs/development/scanner-dependencies.md#cache-and-failures`。
- 缺陷：`jscpdCacheConfiguration` 以完全相同的 `defaultScanner / minimumLines / minimumTokens` 调两次再 `deepEqual`；第二次没有不同安装根、不同输入或独立预期。它不能证伪“consumer 安装位置进入 package cache identity”，也没有超出前面精确 shape 断言的增量。
- 当前承接：同 helper 第 118–125 行已独立写出 `{ backend: { kind: "package" }, ... }` 的精确期望；随后 package / custom 分离与 explicit executable 保留仍有独立断言。主实体另有 commit、version、configuration、exact-input identity 变体及读写路径证据。
- 动作：**仅删除第 132–135 行的重复自比较**，不删除实体、不删其余 key / roundtrip / backend 边界。若确需新增“两处安装根”的行为证明，必须让不同安装事实实际进入被测解析路径，不能只再制造两个未传入 SUT 的路径。

### SS-02：SCC 累计预算实体没有证明标题与 Case 的 adapter 边界

- 文件 / 行：`src/package-checks/file-metrics/scc/scanner.test.ts:245-254`。
- 完整实体：`quality scc exact input projection > accounts stdout and stderr cumulatively before a later batch can start`。
- Case / owner：`AUX-SCC-ADAPTER-OUTCOMES-001`；`docs/development/scanner-dependencies.md#owner-local-adapters`，资源承诺另见同页 `#check-owned-command-options`。
- 已有价值：直接断言 UTF-8 stdout byte 计量、余量归零和 deadline；应保留。
- 缺陷一：正文只调用 `beginSccLogicalScanResources`、`consumeSccProcessOutput`、`remaining*`，没有调用 `scanWithScc` 或观察 batch 启动。把 `scc/scanner.ts` 中累计 output 的消费 / 下一批余量接线移除，仍不影响此实体。因而未承接 Case 的“耗尽累计 output budget 拒绝完整 logical scan”，不能由 helper 成功外推“下一 batch 不启动”。相邻 deadline 实体确实调用真实 adapter 并检查调用日志，但只证明 deadline 接线，不承接 output budget。
- 缺陷二（局部矩阵）：stderr 只输入 `"x"`（1 byte），stdout 则先 4 bytes 再 4 bytes；所有余量都由 stdout 主导。遗漏 stderr 扣减也仍满足这些断言；标题的双流累计连 helper 层都未独立证明。
- 动作：**保留实体 / 预算义务并重写或扩充**。局部加入 stderr 主导、独立超限 / 累计耗尽矩阵；另用隔离、可控的 private transport / runner 证明至少一个成功 batch 后预算耗尽，后续 batch 未启动、整 scan 返回失败且无 partial measurement。不要为测试增加 public budget knob，也不必真实输出 64 MiB；具体 private seam 由实施时 owner 选择。本轮未授权动态验证或实现。

### SS-03：完整 Run 泄漏 canary 缺少检测成功的正对照

- 文件 / 行：`src/package-checks/secret-detection/secret-detection.test.ts:124-151`。
- 完整实体：`secretDetection > keeps synthetic canary material out of completed Run facts and published outputs`。
- Case / owner：`ADD-SECRET-DETECTION-SCOPE-001`；`docs/development/project-files.md#package-provided-check-exact-inputs`，安全规则由 `docs/checks/secret-detection.md#io-与安全边界` 拥有。
- 已有价值：这是本分区真正经 public Run 并读取 machine files / diagnostic output 的泄漏证据，不能用相邻直接 callback 测试替代。
- 缺陷：只确认 Run `completed`、两类 output `succeeded` 及字符串不含 canary；没有确认 secret Check 已扫描并形成至少一条 finding。若本次 Check 意外走 no-input、unavailable 或零 finding，负泄漏断言仍可通过。`diagnosticFile === null ? "" : ...` 也允许核心 diagnostic 文件缺失时静默跳过该项。
- 当前承接：相邻 `uses only exact approved files and projects findings without canary material` 会精确断言 callback finding / safe Record，却不证明此完整 Run 自身进入相同分支，不能作为本实体的隐式前置条件。
- 动作：**保留并补正对照**：读取本次 snapshot 的 secret Check，断言 failed、selected / scanned / finding counts 与 safe finding Record；确认声明要验证的 diagnostic 文件实际存在且读取成功，然后对 Run / machine / records / diagnostic surfaces 做 canary 负断言。无须复制 detector oracle 或扩大 secret 样本范围。

### SS-04：protocol-failed 只测 private adapter，没有测 whole-Check 映射

- 文件 / 行：`src/package-checks/secret-detection/secret-detection.test.ts:430-465`；protocol 段为第 451–465 行。
- 完整实体：`secretDetection > returns unavailable rather than a partial result after cancellation or detector protocol failure`。
- Case / owner：`ADD-SECRET-DETECTION-FINDING-SETTLEMENT-001`；`docs/checks/secret-detection.md#效果与结果`，whole-Check 失败契约见同页 `#not-applicable-与-unavailable`。
- 已有价值：预取消半段确实通过 `executeSecretDetection` 断言 `unavailable / execution-cancelled` 且无 Records；负 protocol 输入也确实是有效 location + 未批准 rule，能独立观察 adapter fail-closed。
- 缺陷：protocol 半段直接调用 `adaptSecretlintMessages`，只观察 `{ kind: "protocol-failed" }`；未走 execution 对该结果的解释。若 `detectApprovedInputs` 吞掉 protocol failure 或提交此前文件的 partial findings，此实体仍可通过。现有正文也没有“先成功 finding，再失败”的提交前缀可观察。
- 当前承接：本文件其它实体证明成功 detector settlement、coverage、waiver 及漏出检查；没有其它实体触发 detector protocol failure 后的 whole-Check 结算。
- 动作：**保留取消与 adapter 负例，补强此实体的独占义务**。在隔离环境控制 detector raw-result boundary，先形成一个有效 finding 再返回 protocol-failed，断言 `unavailable / detector-protocol-failed`、无 final data、无 partial Records / waiver audit、无 raw material。不是删除实体或删除错误映射义务的理由。

## 逐文件审查处置（26 / 77）

所有行均读完全部实体及矩阵，不表示每个实体均无可增强之处；“保留”表示未找到足以删除 / 合并其独立证据的缺陷。

| 文件（均相对仓库根） | 实体数 | 处置与可观察证明 |
| --- | ---: | --- |
| `src/package-checks/duplicate-detection/cache/store.test.ts` | 2 | 保留 key 变体、cache hit/miss 与 I/O miss；只处理 SS-01 局部断言。 |
| `src/package-checks/duplicate-detection/constructor.test.ts` | 3 | 保留 options / parser / invalid prepare、完整 public Run 真 scanner、一次 exact union 与共同 area / cached policy 复评；helper 不按实体外观忽略。 |
| `src/package-checks/duplicate-detection/finding-waivers.test.ts` | 4 | 保留 hostile / 排序 authoring、完整空集 audit、扫描失败不 audit、applied / stale / overmatch 的可见 Records 与 settlement。 |
| `src/package-checks/duplicate-detection/jscpd/parser.test.ts` | 2 | 保留 Windows / format suffix / sourcePaths 与整数负例；fractional tokens 在 location 解析前被明确错误断言定位。 |
| `src/package-checks/duplicate-detection/jscpd/scanner.measurement.test.ts` | 1 | 两行 Markdown / Vue 真 scanner 矩阵均读；固定 token / inclusive ranges 与第三个未授权同内容文件有独立含义。 |
| `src/package-checks/duplicate-detection/jscpd/scanner.test.ts` | 7 | 保留 command missing、availability、辨识版本、nonzero、missing / empty report 各独立分支及真实包解析 / 测量；不与 Check 层错误翻译合并。 |
| `src/package-checks/file-metrics/constructor.region-identity.test.ts` | 1 | 保留 NUL area ID 的空选择不调用 scanner与匹配 finding 的原值 / blocking 投影。 |
| `src/package-checks/file-metrics/constructor.test.ts` | 2 | 全部 invalid authored / resolved 行与 Run 组合均读；保留声明投影、flags、关系 / resource metadata、exact union 和 overlap strictest policy。Run 成功不是 resource schedule 时序的独立证明。 |
| `src/package-checks/file-metrics/finding-waivers.test.ts` | 4 | 保留 path grammar、applied / stale、空集 audit 与 audit-ID 不碰撞；最后实体虽然断言较薄，仍观察了独立 reserved-ID 义务。 |
| `src/package-checks/file-metrics/scc/availability.test.ts` | 1 | 保留固定 executable 的 3.7 / 4.0 双分支，拒绝不兼容而非 fallback。 |
| `src/package-checks/file-metrics/scc/parser.test.ts` | 3 | 全部 malformed 行已读；保留 header、provider path、quoted CSV / BOM / CRLF / newline、null complexity 与拒绝 partial parse。 |
| `src/package-checks/file-metrics/scc/scanner.test.ts` | 11 | 全部 batch / argv / outcome 矩阵已读；保留空输入、fixed protocol、ceilings、顺序 / 小输入 / merge、scope、duplicate、later failure 与 scripted deadline；SS-02 补强 output-budget entity。 |
| `src/package-checks/maintenance-reminders/first-parent-activity.test.ts` | 1 | 保留真实 Git、base 排除、strict threshold、未提交 worktree 忽略与 advisory / enforcing；正文没有单独制造 staged delta，不能外推已直接证明 index 扰动。 |
| `src/package-checks/maintenance-reminders/first-parent-special-history.test.ts` | 1 | 保留真实 merge / revert / binary / rename 与不在 first-parent 的 baseline；固定 11 行 / 5 commit oracle 独立于 SUT，不能用普通线性 history 替代。 |
| `src/package-checks/maintenance-reminders/history-failure-assessments.test.ts` | 1 | 保留真实 transport 的缺 Git / history command / malformed history，以及 advisory vs enforcing；不与注入 session 的 retry 行重复。 |
| `src/package-checks/maintenance-reminders/machine-publication.test.ts` | 1 | 保留 final-data Check 单行、无 Records / message / quiet字段的实际文件投影；明确 outcome 先有独立固定期望。 |
| `src/package-checks/maintenance-reminders/maintenance-reminders.test.ts` | 2 | 全部 composed-options invalid 行、parser、fingerprint、SHA-256 base 与 object / array overload 均读；保留 constructor 与 preparation 两层义务。 |
| `src/package-checks/maintenance-reminders/measurement-reuse.test.ts` | 2 | 7 行 failure / recovery 矩阵全部读；保留 prefix 重用、retry 精确次数、安全整数、两个完整 Run 不跨次复用，以及 reused session 的取消。 |
| `src/package-checks/maintenance-reminders/progress-and-cancellation.test.ts` | 2 | 保留实际 progress writer / readback、invalid execution options 与已取消 whole-Check。无 fixed sleep 伪造时序。 |
| `src/package-checks/project-files/collection-path-identity.test.ts` | 1 | 全部 raw byte / genuine U+FFFD collision、动态 / 静态 path、必要目录与窄选择矩阵均读；保留 POSIX 身份边界。 |
| `src/package-checks/project-files/collection.test.ts` | 8 | 全部 native pattern 行、mixed selection、read count、prefix operation count、排除剪枝、EACCES / disappearance、symlink / Git independent 均读；共同 matcher作 expected 仅证明 collector一致，不冒充 matcher 本身独立语法 oracle。 |
| `src/package-checks/project-files/exact-input-measurement.test.ts` | 1 | 保留 approved / out-of-scope / pathless 和 opaque payload 不重建语义；小 helper 仍有单独 exact membership 责任。 |
| `src/package-checks/project-files/file-fingerprint.test.ts` | 1 | 保留顺序不变与内容变更改变 identity、SHA-256 shape；不将其外推为已单独证明 LF/path/sentinel 的每项边界。 |
| `src/package-checks/project-files/input-eligibility.test.ts` | 1 | 保留 visited exact paths、accepted / rejected有序 partition及冻结，无 scanner / eligibility 领域的混入。 |
| `src/package-checks/project-files/public-collection.test.ts` | 4 | 全部 accessor / sparse / extra / retired字段 / switch 矩阵均读；保留 public detached frozen result、空结果与 invalid / I/O错误区分。 |
| `src/package-checks/secret-detection/secret-detection.test.ts` | 10 | 全部实体、resource行、forced-win child、symlink与waiver helper均读；保留安全 projection / counts / bounded gaps / identity / overmatch；SS-03 / SS-04 补强独立 public-Run与protocol结算。 |
| **合计** | **77** | **无未读实体；没有整实体直接删除建议。** |

## 委托材料与重要保留判断

- Duplicate：完整读取 `constructor.execution.test-support.ts`、`constructor.overlap.test-support.ts`、`constructor.cache.test-support.ts`、`constructor.cache-acquisition.test-support.ts`、`finding-messages.test-support.ts` 及其 `finding-detail.test-support.ts`、共同 `check-execution.test-support.ts`、overmatched evidence helper。cache child 的十次新 Check / Run、计数重置、父端 exit / JSON completion 均有实际观察；source mutation 后 cache 身份保持 scan 前值的比较用于证明取样时点，不误认作 hash 算法的独立 oracle。
- File metrics：完整读取 `file-metrics.test-support.ts`、SCC fake executable 生成、calls parser、batch planner / logical resources / scanner / parser / availability、Check measurement / execution / Record policy。大量长 path 在这里是 argv transport fixture，不要求真实磁盘文件；不会因“文件不存在”误报 fixture 没到 branch。
- Maintenance：完整读取两个 test-support、真实 Git setup / commit、scripted Git executable及 injected transport、measurement session / support / assessment / final-data / validation；真实 Git 历史负责工具语义，scripted transport负责精确失败 / retry，session单元负责重用，machine与progress负责各自消费者边界，不因同 Case、类似 repository setup 或已慢而删。
- Project files：完整读取 collection support 的全部 native pattern lists、access / prefix instrumentation，collection / filesystem bridge / public façade / fingerprint / exact acceptance / eligibility 与共同 config matcher 的实现。instrumentation 均有 finally 恢复；EACCES依赖非特权 POSIX权限模型，raw-byte / symlink行依赖POSIX能力，不视作所有平台证明。源实现保留 necessary-I/O透明与 no-follow，并未用“无匹配”等同失败。
- Secret：完整读取 synthetic key / placeholder / canary digest helper、直接 callback与duplicate-safe-finding settlement helper、adapter、safe bounded read、execution / Record / count parser / options实现。forced `win32` child有明确成功状态而非吞 child error，只证明当前宿主强制分支，不证明 native Windows安全契约。预取消用例只证明预取消，不冒充 detector in-flight 取消；相同 path / ordinal 的 synthetic overmatch仅证明防御性 settlement，不是实际 detector可产生相同identity的承诺。
- 未发现本分区 fixed sleep 驱动错误时序，未发现 catch-and-ignore 吞掉测试失败；`assert.equal` 后的 guard return/continue 不会掩盖 preceding assertion。公开 scanner输入、cache、waiver、真实子进程与单元边界各自可以保留，不以名称相似推断重复。

## 验证与尚未证明

本轮执行的是只读文件 / Case读取、CodeGraph查询、26 文件 hash复核及报告 / 临时覆盖JSON的结构检查；没有动态证明上述反事实，也没有验证当前正文是否通过。最终哈希与分区集合相符不等于实现正确或测试有效。后续实施 SS-02 / SS-04 时须先确定 owner-private隔离方案，再跑最窄目标测试和全树 `test-evidence check`；审计文档、Case与Change校验交由主线程按本轮允许入口统一执行。
