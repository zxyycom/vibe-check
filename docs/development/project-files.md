# Project files and Check exact inputs

本文拥有 `src/package-checks/project-files/**` 的 project-root 文件收集、配置过滤、内容 fingerprint 与 exact-input
acceptance 机制，以及 package-provided Check 如何使用这些能力。它不建立 Product-wide scan scope，也不定义
Check final status、Record、aggregation、machine output 或 scanner protocol。

公开 selection、默认基线与独立收集工具由[选择与收集项目文件](../guides/collecting-project-files.md)定义；本页解释内部收集与 exact-input 机制如何兑现它们。

## Check-owned file selection

Check 自己拥有完整 `{ patterns, useDefaultExcludes? }` selection，area-based Check 为每个 area 分别物化、验证并冻结。精确公开语义由[收集指南](../guides/collecting-project-files.md#共享的-files-选择语义)拥有；Definition 和 callback context 不增加全局文件选择。

## File collection mechanism

### 候选与最终选择

private `collectProjectFileSets(root, selections)` 在一个 Check 本次操作内共享必要 filesystem entries，枚举普通文件、不跟随链接、零 Git/ignore 策略。fast-glob 3.3.3 只获得候选 superset，完整列表由共同 `data-boundary/config-glob` 的 micromatch 4.0.8 参数解释，每 selection 单独减去启用的固定默认数组；结果冻结、稳定排序去重。用户原生重包含不改变固定防呆层。

必要单路径 policy 判断在本次操作内准备谓词：只有全部用户 patterns 的每个 slash segment 都是
`[A-Za-z0-9_.-]+` 且不是 `.` / `..`、pattern 长度不超过当前原生 parser 可接受范围时使用字面 Set membership；
复杂语法、`./`、空 segment、超长 pattern 和其它字符仍交给完整原生列表 matcher，保留原有错误时点与上下文。
固定默认数组全为正 pattern，首次实际需要默认层判断时在本次操作内以同一参数编译，随后复用正列表 OR；
此层仍独立于用户重新包含。谓词不跨收集调用保留，不改变获取与 inspection 顺序。共同批次选择在同一狭义 literal
列表且 candidates 都是 normalized project-relative paths 时，以 candidate Set 按 pattern 首次出现顺序输出交集，
保持原生正列表的顺序与去重；其它输入仍使用完整 micromatch 列表。此分支不改固定默认层、获取失败或原生错误时点。

### 访问剪枝与失败

fs adapter 在 task base、静态路径及目录下沉前检查本次全部 selections：全部无需求才剪枝，空 selection 不制造需求，无法证明时继续访问。安全用户子树剪枝限末段负规则的整子树排除；不重建递归引擎，不把用户负规则永久下发为 fast-glob ignore。混合开关保持各自候选与输出。

祖先检查按 slash offset 构造前缀并供全部 policies 共用，不反复 split、slice、join 增长的 segment 数组。
每个 policy 可以由不同祖先证明排除，仍须全部 policy 无需求才能剪枝；prefix 字符总长度与 matcher 工作仍按实际输入承担。

root 即使空 patterns 也必须是真实可读目录。glob 起点在父目录枚举中不存在时是无匹配；已观察到的必要路径 inspection/read 失败（含消失的 ENOENT）翻译为带绝对目标与 cause 的普通 Error，防止库吞掉真实错误。policy 跳过才允许 synthetic ENOENT。task 起点与静态后代验证路径分量，不能绕过目录链接的 no-follow。共享状态 operation-local，不承诺文件内容/原子快照或恶意并发替换隔离。

### 路径身份与宿主适配

候选进入完整 matcher 前只移除后端 `./` 前缀，不改写文件名。选中路径必须满足 `isNormalizedProjectRelativePath` 的既有 stable slash-path 边界。目录单次获取保留 raw name bytes，以 UTF-8 decode→encode roundtrip 判断名称忠实性；只有最终入选的有损 UTF-8 普通文件在候选去重前失败，未入选的同类文件不失败。必要目录路径分量也检查 byte 身份，不能借真正 U+FFFD 的 spelling 读到另一目录。

Node byte Dirent 提供元数据；locked Bun 1.3.14 对 byte overload 实际返回 bare Uint8Array names，薄 Dirent bridge 按需要 lazy lstat 并在 entry 内缓存。两宿主仍每目录一次获取、no-follow、必要 I/O 错误透明，不建立第二个 walker。

本次操作按已保留的目录 entries 建立 `decoded name → entry 列表` 索引，供路径分量查询直接取得同名候选。
同 spelling 的 raw-byte 冲突保留全部 entry 与原顺序，继续执行 fidelity 检查。索引与目录观察一同结束，后续收集调用重新观察。

### Public single-selection collection

package root 的同步 `collectProjectFiles({ projectRoot, selection })` 先执行 closed、descriptor-safe detached snapshot，再 resolve root、进入同一 private 机制。非法输入 TypeError、必要 I/O Error、冻结成功空数组分别可识别。named batch、Map、候选与 fs adapter 都 private；façade 不物化 Check 后缀默认，不处理 eligibility、内容读取、结算或 scanner。

### Exact-input fingerprint

需要按输入内容隔离 cache 的 Check 调用 `fingerprintProjectFiles(root, paths)`。该机制先稳定排序 exact relative paths，
再以 LF-normalized 当前文件内容形成 SHA-256；文件顺序不改变 fingerprint，路径或内容变化会改变 fingerprint。不可读文件
使用明确 sentinel 参与 fingerprint，后续 scanner/read 边界仍负责把实际不可读输入结算为不可用，而不是把它解释为空文件。
fingerprint 属于内容缓存身份，不是文件收集或扫描合法性的预读证明；调用方只在实际需要该身份的缓存路径取得它。
Duplicate 的条件获取与 scan 前取样由 [scanner cache owner](scanner-dependencies.md#cache-and-failures) 承接。

Package-provided Checks 的 exact file selection 只由各自的顶层 `options.files` 或 `codeAreas[id].files` 决定。
项目自定义的 diff、baseline 或其它 comparison facts 是普通 Check data：producing Check 拥有来源、options 与 data shape；
下游需要成功 data 才能开始时通过 direct `dependsOn` 读取，需要在所有 observed upstream 各自结算后审计任意 terminal outcome 时通过 `observes` 读取。两者都不会改写 package-provided Check 的 file selection。

## Core file-region relation

`src/data-boundary/project-file-region-index.ts` 拥有无 I/O 的纯值双向关系；完整输入、查询、追加与只读边界由
[公开索引指南](../guides/file-region-index.md)定义。获取不进入 Core，默认排除不作用于其显式输入。
构造边界复用 closed-values 与 normalized project path 校验。普通 Maps 在闭包内维护同一关系，
外层对象和公开数组冻结；已校验的 detached 值保留供追加使用，只解析新增来源并全量重建。

file-metrics 将本次 batch collection 的每个 area 转为 members region；`filePaths` 作为 exact union，
records 从 `regionsForFile` 取得全部 area IDs，阈值、waiver、blocking 与结算仍由该 Check 解释。
duplicate 的 path policy Map 继续携带阈值，functionMetrics 继续拥有自己的关系与 eligibility。
Run 对 Git changed paths 的规则消费见[Project Run](project-run.md#change-preparation-and-flag-projection)。

## Package-provided Check exact inputs

每个 package-provided Check 独立调用 project-file mechanism，并从自己的 resolved candidates 形成 exact inputs；
不同 Check 可以有不同 file selection。scanner 不接收 project root 来重新发现或扩大输入。

`patterns` 与默认排除首先形成 selected paths。若 owning Check 随后还有受支持文件类型 predicate，它必须把 selected set
完整分为互不相交的 accepted 与 rejected paths，且两者并集等于 selected。每个 rejected path 发布一条 non-blocking
`input-rejected / unsupported-file-type` Record 和一条 Check-level 汇总 warning；显式宽泛 patterns 不因数量较多而省略
Record。真正 zero selected 才是 `not-applicable / no-eligible-input`；all-rejected 表示分类已完成，返回带拒绝 Finding 的
`passed`。这项规则只覆盖 Product-owned eligibility filter；backend 已收到 accepted exact path 后是否返回 measurement，
必须由对应 adapter 的协议判断，不能推断为 input rejection。

各 Check 的 input adapter 保持以下不同责任；完整状态、Finding 和安全规则见各自指南：

- [Duplicate detection](../checks/duplicate-detection.md) 与 [File metrics](../checks/file-metrics.md) 各自一次提交 area paths 的稳定去重并集。前者按 fragment locations 的共同 area 还原归属，后者按 path 的全部 matching areas 还原归属；共同 collection 不计算阈值或 Findings。
- [Function metrics](../checks/function-metrics.md) 的默认 patterns 与 eligibility 来自同一 Check-local reader registry。先分类再分析 accepted union；rejected path 保留全部排序 area IDs，不能落入通用 source fallback。
- [JSON validation](../checks/json-validation.md) 以 case-sensitive `.json` predicate 分类；[Markdown lint](../checks/markdown-lint.md) 与 [Markdown Link](../checks/markdown-link-validation.md) 对 `.md` / `.markdown` 使用大小写不敏感语义。Markdown lint 只处理 selected Markdown source；Markdown Link 的 direct target 不成为新的 source。
- [JSON Schema](../checks/json-schema-validation.md) 只读取显式 schemas/bindings 且在 selection 内的 path，不从 suffix、`$schema` 或目录发现 work。
- [Secret detection](../checks/secret-detection.md) 没有普通 suffix rejection；它在 detector 前对每个 selected path 完成
  path/descriptor identity-checked bounded-read/coverage settlement；受支持 POSIX runtime 还要求 no-follow open。Windows 分支
  只是不再因缺少 `O_NOFOLLOW` 预先拒绝普通文件的 portability optimization，不扩展受支持平台契约。adapter 只接收
  accepted text，不取得 root 或重新发现权限。

分类不会改变本次 invocation 使用的文件来源，也不会把 rejected path 交给 scanner、document reader 或 Markdown parser。

Markdown source parsing、direct-target work 与 parse-facts cache 不属于共同文件收集机制；实现不变量见[Markdown Link 解析与目标授权](markdown-link-resolution.md)。

## Exact-input acceptance

scanner-derived measurement 必须声明 slash-normalized `sourcePaths`，且每个 path 都精确属于 owning Check 本次 invocation
的 approved exact set；任何越界 path 拒绝整批 conversion，不能写 partial Records。payload-specific location
consistency 属于对应 Check-local adapter；`src/package-checks/project-files/**` 只验证共同的 exact membership invariant，不读取 private
payload 重建领域事实。

## 验证

`src/package-checks/project-files/**` tests 覆盖 root/空 patterns、closed snapshot、默认开关、原生完整列表、静态/task base 剪枝、范围内/范围外失败、目录消失、各类 symlink、Check-local 共享、Git/ignore 独立性、fingerprint 和 exact inputs；各 Check 相邻 tests 证明 eligibility、安全读取与四态结算。
`src/data-boundary/project-file-region-index*.test.ts` 直接证明双向/空/未知、闭合输入、隔离、重复 ID、规则与实际成员、追加等价；
独立进程封锁 fs/process 获取能力证明构造、查询与追加无 I/O。file-metrics 与 Run 原有消费者 tests 分别证明 policy/exact-scope 与 Git 语义不变。
