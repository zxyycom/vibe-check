# scan-scope

## Case FILE-REGION-RELATION-001: 值来源建立完整只读双向关系

Owner: `docs/guides/file-region-index.md#只读双向结果`
Entities:

- `bun|src/data-boundary/project-file-region-index.test.ts|project file-region index > retains one sorted bidirectional relation with overlaps, known empties and unknown keys`
- `bun|src/data-boundary/project-file-region-index.test.ts|project file-region index > isolates source values, frozen query arrays and view methods from runtime mutation`
  Proves:
- 多份文件与实际成员形成去重排序文件域，双向关系保留所有重叠、零命中文件和空区域，合法未知键为 undefined。
- 原输入后续修改不能改变结果，公开数组与视图字段不能运行时改写，解构方法仍能查询和追加。

## Case FILE-REGION-SOURCE-BOUNDARY-001: 闭合输入、路径与区域身份拒绝非法值

Owner: `docs/guides/file-region-index.md#追加与隔离`
Entities:

- `bun|src/data-boundary/project-file-region-index.boundary.test.ts|project file-region index > rejects malformed closed structures at every nesting level without evaluating getters`
- `bun|src/data-boundary/project-file-region-index.boundary.test.ts|project file-region index > rejects path aliases and invalid or colliding region identities`
- `bun|src/data-boundary/project-file-region-index.boundary.test.ts|project file-region index > preserves opaque nonempty region identities through queries and append`
  Proves:
- 记录/数组逐层拒绝多字段、accessor、symbol、非枚举、稀疏、其它原型、非法字段值与路径别名，不调用 getter；合法 null-prototype 来源可接受。
- 非法查询键抛 TypeError；region ID 保留任何非空字符串（包括 NUL），构造、查询、排序和追加不采用路径字符限制。路径 NUL 仍拒绝；同源、跨源和跨种类重复 ID 均拒绝，不静默覆盖。

## Case FILE-REGION-REBUILD-001: 追加值全量重建且保留来源和旧视图

Owner: `docs/guides/file-region-index.md#追加与隔离`
Entities:

- `bun|src/data-boundary/project-file-region-index.test.ts|project file-region index > rebuilds batch and appended sources equally without expanding actual members or old views`
  Proves:
- 批量与逐次追加得到同一双向关系，新文件参与已有规则、新规则参与已有文件，但实际成员不扩大，旧视图和追加前原数据不受后续修改影响。
- 空追加仍是独立等价视图，重复 ID 追加失败保留旧结果；原来源 Proxy 撤销后仍可追加，不重新反射旧来源。

## Case FILE-REGION-NO-ACQUISITION-001: 关系计算不取得或刷新文件来源

Owner: `docs/guides/file-region-index.md#计算成本与边界`
Entities:

- `bun|src/data-boundary/project-file-region-index.test.ts|project file-region index > constructs, queries and appends while filesystem and process acquisition are blocked`
  Proves:
- 独立宿主封锁 filesystem 与 process 获取能力后，构造、双向查询和追加仍成功；不存在/删除路径与显式 build 路径保持关系，实际成员不扩大。

## Case FILE-REGION-PACKAGE-001: 安装后消费者从公开根使用独立关系工具

Owner: `docs/guides/file-region-index.md#最小用法`
Entities:

- `bun|scripts/package/public-api-inventory.test.ts|public API inventory > exposes approved authoring values and adjacent source JSDoc`
- `bun|scripts/package/candidate/external-consumer/type-acceptance.test.ts|external consumer type acceptance`
- `bun|scripts/package/candidate/external-consumer/documentation.test.ts|external consumer docs acceptance`
  Proves:
- approved public root 提供 createProjectFileRegionIndex 与三个对应类型；安装后严格 TypeScript consumer 可声明两类区域、批量来源、未知键联合和追加，不能静态改写结果数组或混合区域字段。
- 安装后受管示例实际构造和查询重叠/零命中/未知关系，并追加新文件；规则重建、实际成员及旧视图保持原义，无需 Check 或 Run。

## Case AUX-QUALITY-FINGERPRINT-001: Quality input fingerprint 稳定

Owner: `docs/development/project-files.md#exact-input-fingerprint`
Entities:

- `bun|src/package-checks/project-files/file-fingerprint.test.ts|quality input fingerprints > uses stable SHA-256 fingerprints for sorted file content`
  Proves:
- quality input fingerprint 使用排序后的路径及 LF-normalized 当前文件内容生成稳定 SHA-256。
- 文件内容变化或在相同文件数和内容下更换所选路径会改变 fingerprint；文件顺序以及 LF、CRLF、CR 换行表示变化不改变 fingerprint。

## Case WB-SCOPE-FILE-COLLECTION-001: 纯磁盘候选与 Check-local 选择保持独立

Owner: `docs/development/project-files.md#file-collection-mechanism`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > enumerates the filesystem independently of Git ignore rules`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > shares necessary directory reads without conflating mixed selections`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > applies explicit default exclusions while retaining other dot files`
- `bun|src/package-checks/project-files/input-eligibility.test.ts|project file eligibility partition > assigns every selected path once while preserving accepted and rejected order`
  Proves:
- Git 可用、不可用与非仓库不改变相同磁盘结果；ignore 文件和子仓库普通文件不因策略身份漏选。
- 同次必要目录只读取一次；命名选择冻结、去重排序，混合默认开关独立输出且空 selection 不制造需求。
- 默认防呆 omitted/true 不可重包含绕过；false 仅移除固定层，用户负规则仍有效，默认数组被冻结隔离。
- selected 每个路径恰好保留在 owning Check 的 accepted/rejected 一侧，不扩大 approved exact set。

## Case COLLECTION-NATIVE-PATTERNS-001: 完整原生列表语义一致

Owner: `docs/guides/collecting-project-files.md#共享的-files-选择语义`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > matches native complete lists consistently for collection and explicit paths`
- `bun|src/data-boundary/config-glob.test.ts|config path selection > preserves native batch order and fallback while indexing safe literal lists`
- `bun|src/project-run/changes/git.test.ts|Project Run Git changes > uses native pattern lists for regions without collection default exclusions`
- `bun|src/data-boundary/project-file-region-index.test.ts|project file-region index > matches complete native lists including explicit default-excluded and nonexistent paths`
  Proves:
- collection 和共同显式 path matcher 对 dot、brace、extglob、换行路径、负-only、空列表、`./` 动态/静态 pattern 及用户重新包含使用同一结果；共享选择也不保留后端的 `./` 候选前缀。
- Run 的 changed-path projection 对已取得的路径采用同一完整列表语义，支持 dot/brace/extglob/负-only/重新包含/空列表；build changed path 不套扫描默认排除。
- 扫描前不存在的静态和动态 glob 起点是合法无匹配。
- Core 对值文件域使用同一原生参数与列表语义，支持 brace/extglob/negative-only/reinclude/dot/大小写/换行路径和动态 ./ pattern；显式 build 文件不被默认排除。
- 狭义字面路径列表与规范化候选的批次结果，保留固定版本原生 matcher 的 pattern 首现顺序及去重；复杂或未规范化输入、超长 pattern 保留原生结果或错误。操作量检查证明字面列表选择绕过逐 pattern×candidate 的原生正则比较。

## Case COLLECTION-PATH-IDENTITY-001: Selected pathname 保留真实身份

Owner: `docs/guides/collecting-project-files.md#结果与路径身份`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > matches native complete lists consistently for collection and explicit paths`
- `bun|src/package-checks/project-files/collection-path-identity.test.ts|quality input file collection > preserves pathname identity without admitting lossy UTF-8 aliases`
  Proves:
- selected POSIX 反斜杠文件名不能被改写为虚假目录路径；不可表示时普通 Error，未入选时仍正常。
- POSIX byte name 无法忠实转换为 UTF-8 时，仅入选普通文件或必要目录访问失败，Error 保留真实 name bytes；窄选择、用户排除及空 patterns 不误报。
- 真正含 U+FFFD 的合法文件正常返回；有损字节名不能借同名合法 spelling 绕过检查或被去重隐藏，必要同名目录也不能被读成另一目录。

## Case COLLECTION-ACCESS-FAILURES-001: 访问前剪枝与必要失败可区分

Owner: `docs/development/project-files.md#file-collection-mechanism`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > prunes excluded task bases and static paths before inspection`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > shares deep ancestor pruning without copying segment prefixes`
- `bun|src/package-checks/project-files/subtree-pruning.test.ts|quality input file collection > reuses pure subtree decisions only within one collection operation`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > distinguishes necessary access failures and disappearing directories from no-match`
  Proves:
- 已证明无需求的 task base、静态路径和默认排除子树在 inspection/read 之前跳过，空 selection 不阻挡剪枝。
- 范围外真实不可读目录不导致失败；范围内 EACCES 和已观察目录消失的 ENOENT 抛带路径 Error，不返回 partial 或成功空集合。
- 多份 policy 可分别由不同祖先的排除规则证明无需求，只有全部 policy 均无需求才剪枝；深路径操作量检查证明前缀构造不再 slice/join 增长的 segment 数组。
- 同一 collection 内每个 policy/prefix 的纯判断只计算一次；下一操作重新计算并可观察新目录项，不将纯 memo 扩展为跨调用 filesystem 缓存。

## Case COLLECTION-NO-FOLLOW-001: 链接不成为普通候选

Owner: `docs/guides/collecting-project-files.md#磁盘来源与访问范围`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > does not follow root base file directory or broken symbolic links`
  Proves:
- 文件、断链、目录链接起点与静态后代都不入选；显式 root 链接在空 patterns 下仍失败。

## Case PUBLIC-PROJECT-FILE-COLLECTION-001: Public single selection collection retains validated immutable path snapshots

Owner: `docs/development/project-files.md#public-single-selection-collection`
Entities:

- `bun|src/package-checks/project-files/public-collection.test.ts|public project file collection > collects a frozen detached selection snapshot from an explicit root`
- `bun|src/package-checks/project-files/public-collection.test.ts|public project file collection > retains a successful empty selection as a frozen result`
- `bun|src/package-checks/project-files/public-collection.test.ts|public project file collection > rejects malformed input without invoking accessor hooks`
- `bun|src/package-checks/project-files/public-collection.test.ts|public project file collection > keeps required filesystem failures distinct from invalid invocation`
  Proves:
- closed、descriptor-safe 输入拒绝 accessor、空洞、额外/旧字段与非法默认开关，不执行 getter；root 与 patterns 显式必填。
- 公共结果 detached、冻结、排序去重，合法空结果与必要 filesystem 普通 Error、非法输入 TypeError 可区分；空 patterns 仍验证 root。

## Case ADD-FUNCTION-METRICS-LIZARD-SCOPE-001: Function metrics selects exactly translated analyzer inputs

Owner: `docs/development/project-files.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/function-metrics/target-files.test.ts|functionMetrics analyzer target files > selects every adapter-provided extension case-insensitively and excludes unsupported paths`
- `bun|src/package-checks/function-metrics/constructor.input-rejection.test.ts|functionMetrics area findings > reports every rejected selected path once and sends only accepted paths to the analyzer`
- `bun|src/package-checks/function-metrics/constructor.input-rejection.test.ts|functionMetrics area findings > does not create analyzer metric records when every selected path is rejected`

Proves:

- function-metrics derives precise default globs and runtime acceptance from the Product adapter's fixed translated-port capability: 27 readers and 55 canonical extension spellings, using case-insensitive semantics without a fallback reader. This Product capability is independent of the root provenance inventory and of Gate quality exceptions.
- Explicitly selected unsupported Markdown, JSON, YAML or extensionless inputs each produce one area-aware rejection Record instead of reaching the analyzer; all-rejected input completes without analyzer metric Records.

## Case ADD-JSON-VALIDATION-SCOPE-001: JSON eligibility is an exact subset of its Check-owned file selection

Owner: `docs/development/project-files.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > reports selected non-JSON paths and returns exact mixed final counts`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > uses only its included JSON paths without re-adding excluded paths`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > settles all rejected selected inputs as non-blocking findings`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > is not applicable only when its file selection is empty`

Proves:

- JSON validation defaults to a precise lower-case `.json` include and classifies only its own selected candidates with the same case-sensitive suffix rule; excluded or out-of-selection paths are never rediscovered.
- Every selected `.JSON` or other unsupported path becomes a non-blocking rejection fact, including all-rejected input; only a genuinely empty selected set is not applicable.

## Case ADD-JSON-SCHEMA-VALIDATION-SCOPE-001: Registered Schema inputs remain an exact declared subset

Owner: `docs/development/project-files.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.identity-and-scope.test.ts|JSON Schema validation default Check > reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable`

Proves:

- JSON Schema validation reads only declared schema/instance paths that belong to the current Check-owned file selection; an absent or excluded declaration becomes a safe `out-of-scope` issue without a discovery/read escape, while no bindings creates no document work.

## Case AUX-MARKDOWN-LINK-PARSER-001: Markdown Link parser produces closed source facts

Owner: `docs/development/markdown-link-resolution.md#markdown-link-source-occurrences`
Entities:

- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > collects GFM inline, image, reference, and autolink occurrences`
- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > generates fresh GitHub-compatible slugs for ATX and Setext headings`
- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > reports decoded UTF-16 source ranges with 1-based, end-exclusive positions`
- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > returns immutable facts and a controlled failure for malformed decoded text`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts|Markdown Link parse-facts cache > restores only closed immutable parser facts`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts|Markdown Link parse-facts cache > invalidates entries written for a different parser-contract version`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts|Markdown Link parse-facts cache > awaits the append once publication has started despite later cancellation`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts|Markdown Link parse-facts cache > ignores malformed, unknown, and unterminated lines while last valid identity wins`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache/cache.test.ts|Markdown Link parse-facts cache > rejects cached facts when the exact source bytes are not valid UTF-8`
  Proves:
- Each eligible Markdown source yields only the documented Link occurrence grammar and heading facts; excluded Markdown forms and undefined references do not become target work.
- A fresh GitHub-priority heading slugger and decoded UTF-16 navigation range make anchor facts source-local and reproducible.
- Parser facts are immutable and malformed decoded input becomes a controlled failure rather than a partial source fact set. Link-private JSONL state accepts only bounded, closed immutable current-version envelopes; malformed, unknown, and unterminated lines are ignored, duplicate valid identities use the final valid facts, repeated fresh identities reuse the invocation-local dirty facts before one publication, publication already committed to append completes despite later cancellation, and a forged exact-byte cache hit cannot bypass the fatal UTF-8 boundary.

## Case AUX-MARKDOWN-LINK-TARGET-001: Markdown Link resolves only bounded direct local targets

Owner: `docs/development/markdown-link-resolution.md#markdown-link-direct-targets`
Entities:

- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > reads only root-contained sources and returns their Link parser facts`
- `bun|src/package-checks/markdown-link-validation/local-resolver.endpoints.test.ts|Markdown local resolver > resolves direct local files, directories, and same or cross-document anchors`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > gates lexical and symlink escapes before external work and accepts only strict file URIs`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > allows explicit validate mode and enforces the per-invocation direct target limit`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > fixes successful logical-node observations without changing target limits`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > stops target observation at the first unavailable node`
- `bun|src/package-checks/markdown-link-validation/filesystem-probes.test.ts|Markdown bounded filesystem drivers > uses adaptive bounded capacity through real EOF and closes after failures or cancellation`
- `bun|src/package-checks/markdown-link-validation/filesystem-probes.test.ts|Markdown bounded filesystem drivers > shares containment hop limits and stops at the first external symlink destination`
  Proves:
- Link reads only a contained source and then evaluates its direct file, directory, and anchor endpoint without recursively discovering target links.
- Root-external lexical paths, escaping symlinks, and accepted host-native `file:///` targets honor `ignore`, `report`, and explicit bounded `validate`; unsupported remote/path forms and malformed local components do not become external work.
- Same-document anchor facts do not consume target work. A per-invocation logical-node observation retains the first successful cross-document snapshot even after replacement, while every occurrence still independently consumes target work and limit exhaustion remains a controlled failure; an unavailable node stops later target observation.
- 共用 async 与 Worker 同步读链都按 fstat 提示分配、有界增长并读到真实 EOF，覆盖空/短读、增长/缩小、max/max+1、1 MiB 与公开 16 MiB 上限；非 regular 或 fstat 已超限不分配正文、不 read，打开后的可捕获失败尝试 close，原子取消阻止后续 native work。
- 两种 containment 驱动均接受 40 hops、拒绝 41 hops，并在首个 root-external symlink 目的地停止；最终叶子 symlink 不可直接读取，probe 后普通文件替换仍读取当前 bytes。

## Case ADD-SECRET-DETECTION-SCOPE-001: Secret detection retains only exact bounded text coverage

Owner: `docs/development/project-files.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > uses only exact approved files and projects findings without canary material`
- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > keeps synthetic canary material out of completed Run facts and published outputs`
- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > fails closed for deterministic coverage gaps without treating them as waived findings`
- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > accounts for non-text reads in the total budget and applies the selected-file limit`
- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > does not select an exact root-escaping final-leaf symlink`

Proves:

- Secret detection reads and detects only its explicit selected paths; excluded paths are never rediscovered or reported.
- NUL, invalid UTF-8, and bounded resource gaps remain explicit failed coverage facts rather than clean or waived inputs.
- Every successfully read raw byte, including a later non-text gap, consumes the total byte budget; file-count and remaining-total exhaustion stop detector work with explicit coverage facts.
- Final-leaf symlinks are not collected, so a symlink-only selection settles as no-eligible-input without reading its target or emitting Records. This does not prove malicious concurrent replacement isolation. Synthetic canary material is absent from Run facts, machine publication, Records stream, and diagnostic output.

## Case FIX-SECRET-DETECTION-WINDOWS-001: Windows branch does not pre-reject regular inputs

Owner: `docs/checks/secret-detection.md#工作原理`
Entities:

- `bun|src/package-checks/secret-detection/secret-detection.test.ts|secretDetection > does not reject a stable regular file solely because the Windows branch is selected`

Proves:

- Selecting the `win32` branch no longer rejects a stable regular file solely because the platform lacks `O_NOFOLLOW`: with compatible host `node:fs` identity facts, the probe completes detector settlement instead of returning `source-unavailable`.
- This forced-branch probe runs on the current host filesystem. It does not prove native Windows device/inode or reparse behavior and therefore does not establish a Windows support contract.

## Case SCAN-SCOPE-MARKDOWN-LINT-RULES: Markdown lint rule mapping

Owner: `docs/checks/markdown-lint.md#工作原理`
Entities:

- `bun|src/package-checks/markdown-lint/adapter.test.ts|Markdown lint adapter > maps each Product rule through its fixed backend configuration`

Proves:

- Each closed public Markdown lint rule produces Product-owned mapped evidence through its fixed backend configuration.

## Case SCAN-SCOPE-MARKDOWN-LINT-DIALECT: Fixed Markdown lint dialect

Owner: `docs/checks/markdown-lint.md#工作原理`
Entities:

- `bun|src/package-checks/markdown-lint/adapter.test.ts|Markdown lint adapter > uses fixed front matter and ignores inline configuration`
- `bun|src/package-checks/markdown-lint/adapter.test.ts|Markdown lint adapter > warms MD052 parsing without leaking its helper rule`

Proves:

- Fixed front matter recognition and disabled inline backend configuration preserve the Product-selected rule behavior.
- With only `reference-links-images` selected, the adapter returns the exact line/range/rule list for unresolved full, collapsed and image references. Task-like labels, shortcut syntax and the parser-only helper add no findings.

## Case CHANGE-FLAG-DEBUG-RELATION-001: 当前所选全集保持零命中与双向 token 关系

Owner: `docs/guides/debugging-change-flags.md#报告与双向查询`
Entities:

- `bun|src/package-tools/change-flag-debugging/change-flag-debugging.test.ts|change flag debugging > retains the full selected universe with zero, single and overlapping bidirectional hits`
- `bun|src/package-tools/change-flag-debugging/change-flag-debugging.test.ts|change flag debugging > uses complete native lists and matches public Run for the same current paths`
  Proves:
- 全集不被 regions 并集缩减，逐文件保留零/单/重叠 tokens 和准确数量，两向查询一致，空区域与未知键可区分。
- 同路径完整原生列表（brace、extglob、dot、纯负、重新包含、大小写和非 basename）与公共 Run 实际 evidence 一致；调试仍保留 Run 不发布的零命中当前文件。

## Case CHANGE-FLAG-DEBUG-ACQUISITION-001: 显式获取范围可恢复且空与失败分离

Owner: `docs/guides/debugging-change-flags.md#输入与失败`
Entities:

- `bun|src/package-tools/change-flag-debugging/change-flag-debugging.boundary.test.ts|change flag debugging > reports effective root and defaults while collecting only ordinary no-follow files`
- `bun|src/package-tools/change-flag-debugging/change-flag-debugging.boundary.test.ts|change flag debugging > distinguishes valid empty snapshots from closed-input and necessary filesystem failures`
  Proves:
- root、原生 patterns、有效默认开关/实际数组和 ordinary/no-follow/快照边界可恢复，省略与 true 相同、false 可显式收集默认目录但链接不入选。
- closed 输入和非法查询明确 TypeError、不运行 getter；空 patterns/无匹配为合法空，missing/file/symlink root 的必要获取失败是普通 Error，不伪装为空。

## Case CHANGE-FLAG-DEBUG-LIFECYCLE-001: 冻结映射隔离并按需无 I/O 呈现

Owner: `docs/guides/debugging-change-flags.md#生命周期与呈现`
Entities:

- `bun|src/package-tools/change-flag-debugging/change-flag-debugging.test.ts|change flag debugging > isolates inputs and frozen results and refreshes files and rules on each invocation`
- `bun|src/package-tools/change-flag-debugging/change-flag-debugging.test.ts|change flag debugging > queries and formats the same snapshot with acquisition and output facilities blocked`
  Proves:
- 修改原 patterns/regions 和新增文件不影响旧报告，下次调用采用新全集/规则；任意非空 ID 包括 NUL 和 `__proto__` 保留，公开嵌套字段冻结且方法可解构。
- filesystem/process acquisition 与输出设施被封锁后仍可双向查询和反复格式化，同次快照不重新获取或自动输出，文本保留零命中、范围与边界并转义控制字符。

## Case CHANGE-FLAG-DEBUG-PACKAGE-001: 安装后公开消费完整映射和按需文本

Owner: `docs/guides/debugging-change-flags.md#最小用法`
Entities:

- `bun|scripts/package/public-api-inventory.test.ts|public API inventory > exposes approved authoring values and adjacent source JSDoc`
- `bun|scripts/package/candidate/external-consumer/type-acceptance.test.ts|external consumer type acceptance`
- `bun|scripts/package/candidate/external-consumer/documentation.test.ts|external consumer docs acceptance`
  Proves:
- 两个操作与 options/report 类型从 approved public root 发布，安装后严格类型验收验证必填 root、readonly 结果/元数据/区域和 closed region authoring。
- 同一安装包的受管示例实际收集全域零/单/重叠、token 双向查询和 unknown path，按需返回文本，不要求 Check 或 Run；指南和 JSDoc 投影一致。

## Case AUX-MARKDOWN-GRAPH-OBSERVATION-001: 引用图固定独立路径与授权域的节点观察

Owner: `docs/development/markdown-link-resolution.md#单次引用图与观察`
Entities:

- `bun|src/package-checks/markdown-link-validation/graph-behavior.test.ts|Markdown reference graph > reuses selected source facts through cycles and keeps every duplicate finding in source order`
- `bun|src/package-checks/markdown-link-validation/graph-behavior.test.ts|Markdown reference graph > fixes missing and directory observations while observing logical aliases independently`
- `bun|src/package-checks/markdown-link-validation/graph-behavior.test.ts|Markdown reference graph > keeps authorization domains distinct and projects mixed symlink policies independently`
  Proves:
- 源互引与循环复用已加载源事实，删除源文件后不重读其目标角色；重复无效引用仍保留各自稳定 ID、范围和源顺序。
- 本轮缺失、成功标题与目录 entry 观察固定，后续创建/替换只在新 invocation 可见；别名不按 realpath 合并。
- root-contained 与显式 absolute validate 分域；同一 escaping symlink 的 report/ignore 不计费也不泄露目标，只有 validate 引用消费授权后的观察。
