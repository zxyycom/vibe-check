# Project files and Check exact inputs

本文拥有 `src/package-checks/project-files/**` 的 project-root 文件收集、配置过滤、内容 fingerprint 与 exact-input
acceptance 机制，以及 package-provided Check 如何使用这些能力。它不建立 Product-wide scan scope，也不定义
Check final status、Record、aggregation、machine output 或 scanner protocol。

## Check-owned file selection

需要读取项目文件的 Check 在自己的完整 `options` 中拥有以下 `files` shape；三个 metric constructor 接受每个
`codeAreas[id].files` 的可省略字段并物化成该完整 shape，其它 file-reading Checks 放在顶层 `options.files`：

```ts
{
  source: "filesystem" | "git-worktree";
  include: readonly string[];
  exclude: readonly string[];
}
```

`ProjectDefinition` 和 `CheckProjectContext` 都不保存全局文件选择。两个 Check 或两个 duplicate code areas 即使使用相同
结构，也分别验证、冻结和消费自己的 policy；项目若希望它们选择相同文件，应以普通 TypeScript value 和 object
composition 显式复用，而不是依赖 Product 的 hidden global configuration。同一个 area-based Check 会按 `source` 复用
候选枚举；这个复用不创建 provider Check、dependency fact 或跨 Check hidden cache。

Package root 的 `defaultProjectFileSelection` 是六项 file-selecting constructor 共用的深冻结、可组合基线。它明确排除常见
VCS/Product state、dependencies、build/generated、cache、coverage、log、temporary 与 virtual-environment paths；它不读取
`.gitignore`，也不是 global setting。`duplicateDetection`、`fileMetrics` 与 `jsonSchemaValidation` 原样采用该基线；
`functionMetrics`、`jsonValidation` 与 `markdownLinkValidation` 保留同一 source/exclude，并按各自支持的文件类型派生精准
默认 include。显式数组完整替换 owning Check 的对应默认值。项目需要追加排除时，通过
`{ ...defaultProjectFileSelection, exclude: [...defaultProjectFileSelection.exclude, projectGlob] }` 建立自己的 selection。
本节拥有完整公共 file-selection 基线；Check-specific defaults 由对应[随包 Check 指南](../navigation.md#随包-check-指南)拥有。

三个 metric constructor 都让每个 area 直接拥有 files 和自己的阈值，独立选择的 paths 可以重叠；duplicate area 使用
line/token policy，并且只有一个 area 同时选中全部 fragment locations 时才拥有该比较；file area 使用 file code-line
policy，function area 使用 function limits 与 effective finding policy。
这些 code-area 模型都只服务 owning Check，不是 arbitrary Check 必须采用的公共领域模型，也不会由 Definition 按
package-provided Check ID 解释。

## File collection mechanism

`src/package-checks/project-files/collection.ts` 的内部 `collectProjectFileSets(root, selections)` 先按 `source` 分组，每种不同来源只建立一次稳定候选快照，再为每个命名选择应用
自己的 `include` 与 `exclude`。`collectProjectFiles(root, files)` 是同一模块供 Check 使用的 trusted 单份入口，不是 package root API。公开调用必须使用[下节](#public-single-selection-collection)的 `collectProjectFiles({ projectRoot, selection })`，由公共边界先校验输入。最终路径相对项目根目录并使用 `/`，
经过稳定去重排序；路径必须命中至少一个 `include` 且不能命中任一 `exclude`，因此 `exclude` 优先。两组数组使用同一个
minimatch glob grammar；点号开头的路径也参与显式 glob 匹配，不存在额外的隐藏 dotfile 规则。

- `filesystem`（默认）递归枚举 project root 下的普通文件，不跟随 symlink，也不解释 `.gitignore`。实现可以从全部命名
  选择共同拥有的完整目录排除规则安全派生遍历剪枝，但最终选择仍只由完整 glob 判断。
- `git-worktree` 执行 `git ls-files -z --cached --others --exclude-standard --`，因此候选包含已跟踪文件和未被 Git 标准
  忽略规则排除的未跟踪文件；它还加入可安全下沉的已初始化 submodule worktree 当前文件，但 gitlink 目录本身不作为
  文件候选。Git 成功空输出是合法空候选。

两种来源都会在失败时停止并报告错误。filesystem 无法读取 root 或遍历目录时报告包含该目录的读取错误；Git command、
repository 或 gitlink inspection 失败时报告 Git 来源不可用。文件收集不会自动切换到另一来源，也不会把来源失败伪装成
空集合。

### Public single-selection collection

package root 的 `collectProjectFiles({ projectRoot, selection })` 让普通脚本与 custom Check 同步收集**一份**完整 `ProjectFileSelection`。调用方必须显式给出非空、无 U+0000 的 root string；relative text 从调用时 current working directory 解析、absolute text 直接使用，boundary 再将其 resolve 为实际 collection root。它不在 root 缺失时替调用方猜测 current working directory，也不承诺 containment、sandbox、文件存在性、可读性、content snapshot 或跨次原子性。

public boundary 对 unknown options 与 full selection 做 closed、descriptor-safe snapshot：options 恰有 `projectRoot` / `selection`，selection 恰有 `source` / `include` / `exclude`，source 只能是 `filesystem` 或 `git-worktree`；`include` / `exclude` 必须是无空洞的字符串数组，拒绝 accessor、额外属性和非法值。它不接受 `ProjectFileSelectionOptions` 的省略字段，因为 default 仍是 owning Check 的 policy；ordinary consumer 需要基线时可显式组合 `defaultProjectFileSelection`。invalid input 同步抛出 action-bearing `TypeError`；filesystem/Git selected source 失败继续同步抛出 collection `Error`，没有 fallback。成功返回 detached、冻结的 relative slash paths，维持本节的 stable sort/dedup；空冻结数组是合法成功结果。

该 façade 只验证/快照 public input 并复用同一个 internal collection mechanism；`collectProjectFileSets` 的 named batch、`Map`、source candidates 与 traversal optimization 仍为 private。它不读取内容，不拥有 Check `codeAreas`、eligibility、exact-input handoff、threshold、Record或 settlement；不接受 `AbortSignal`、不支持中途取消、watcher、cache、scanner或 Product-wide file scope。

### Exact-input fingerprint

需要按输入内容隔离 cache 的 Check 调用 `fingerprintProjectFiles(root, paths)`。该机制先稳定排序 exact relative paths，
再以 LF-normalized 当前文件内容形成 SHA-256；文件顺序不改变 fingerprint，路径或内容变化会改变 fingerprint。不可读文件
使用明确 sentinel 参与 fingerprint，后续 scanner/read 边界仍负责把实际不可读输入结算为不可用，而不是把它解释为空文件。

Git tree 中的 `160000` gitlink 只有在 child path 是独立初始化的 Git worktree 时才会下沉。child 的 canonical
Git top-level 必须等于 child 自身 canonical path；普通目录即使替换了 HEAD gitlink，也不属于 child worktree，
遍历不得回到 parent repository。该规则只描述 current worktree collection。

Package-provided Checks 的 exact file selection 只由各自的顶层 `options.files` 或 `codeAreas[id].files` 决定。
项目自定义的 diff、baseline 或其它 comparison facts 是普通 Check data：producing Check 拥有来源、options 与 data shape；
下游需要成功 data 才能开始时通过 direct `dependsOn` 读取，需要在所有 observed upstream 各自结算后审计任意 terminal outcome 时通过 `observes` 读取。两者都不会改写 package-provided Check 的 file selection。

## Package-provided Check exact inputs

每个 package-provided Check 独立调用 project-file mechanism，并从自己的 resolved candidates 形成 exact inputs；
不同 Check 可以有不同 file selection。scanner 不接收 project root 来重新发现或扩大输入。

`source/include/exclude` 首先形成 selected paths。若 owning Check 随后还有受支持文件类型 predicate，它必须把 selected set
完整分为互不相交的 accepted 与 rejected paths，且两者并集等于 selected。每个 rejected path 发布一条 non-blocking
`input-rejected / unsupported-file-type` Record 和一条 Check-level 汇总 warning；显式宽泛 include 不因数量较多而省略
Record。真正 zero selected 才是 `not-applicable / no-eligible-input`；all-rejected 表示分类已完成，返回带拒绝 Finding 的
`passed`。这项规则只覆盖 Product-owned eligibility filter；backend 已收到 accepted exact path 后是否返回 measurement，
必须由对应 adapter 的协议判断，不能推断为 input rejection。

- `duplicate-detection` 按来源枚举一次并从每个 `codeAreas[id].files` 形成路径，再把去重并集一次性交给 Check-local
  jscpd adapter。raw fragment 只有在全部 locations 的 area 集合存在非空交集时才形成 Finding；Record 只保留这些共同
  area IDs，并按其最严格 line/token policy 过滤。互斥 area 不互相比较；需要跨目录比较时，项目声明一个同时选择这些
  路径的 area。未被任何 area 选择的 path 不属于 exact scope。
- `file-metrics` 按来源枚举一次并筛出每个 area 的路径，把稳定去重并集一次性交给 Check-local SCC adapter；每个结果按
  其全部实际 input areas 中最严格的有效 code-line maximum 结算，同一路径最多产生一条 finding。
- `function-metrics` 的默认 include 与内置 TypeScript analyzer 的 reader registry 来自同一 Check-local registry。它注册
  55 个大小写不敏感 suffix；execution 对每个 area 的 selected paths 分类，accepted 稳定去重并集一次交给内置 analyzer，
  rejected path 只发布一条 Record，并保留其全部稳定排序 area IDs。未被 registry 识别的文件不进入分析，避免 fallback 将
  非代码文本当作 source。每个 measurement 恢复全部 matching areas，各 metric 使用适用 maximum 的最小值；任一 matching area
  blocking 时 metric finding blocking，同一 metric 最多产生一条 finding；input rejection 始终 non-blocking。
- `json-validation` 的默认 include 是 `**/*.json`。execution 对 selected candidates 使用 case-sensitive
  `path.endsWith(".json")`；`.JSON` 与其它类型成为 rejected input，不进入 document read。
- `json-schema-validation` 不从 suffix、`$schema`、filename 或 directory discovery 推断 work。只有
  `schemas[].path` 与 `bindings[].instancePath` 明确声明且同时属于该 Check `files` selection 的 path 才可读取；
  out-of-selection declaration 形成安全的 `out-of-scope` domain issue，zero bindings 是 `not-applicable`。
- `markdown-link-validation` 的默认 include 用大小写不敏感 glob 精准选择 `.md` 与 `.markdown`。execution 以相同 suffix
  语义分类 selected candidates；rejected input 不成为 source，direct target 也不成为新的 source input 或递归发现 links。
- `secret-detection` 不派生 supported extension 或普通 input rejection。它只消费自己的必填完整 `files` selection；在受支持 POSIX runtime 以 final-leaf `O_NOFOLLOW` descriptor 打开、regular-file/size 检查和 bounded read 拒绝 symlink/non-regular input，且在 detector 前将每个 selected path 结算为 bounded text input、deterministic `coverage-gap` 或 whole-Check unavailable。所有成功 read 的 raw bytes 都消耗 total-byte budget；NUL、invalid UTF-8、文件/总 byte 和文件数上限都不是 clean 或可豁免 input。adapter 只接收 accepted exact project-relative text path，不能收到 root 或重新发现输入。

分类不会改变本次 invocation 使用的文件来源，也不会把 rejected path 交给 scanner、document reader 或 Markdown parser。

### Markdown Link source occurrences

Link Check 先将 project root canonicalize 一次。失败即为 `unavailable`；只有 root 已 canonicalize 且没有 eligible
Markdown source 时才是 `not-applicable`。每个 eligible source 只 decode 和 parse 一次，得到 Link-private facts。
受支持的 occurrence 是 inline link/image、在 use site 已定义的 full/collapsed/shortcut reference、explicit autolink
和选定的 GFM autolink literal。YAML front matter、code/fenced code、HTML attribute、prose URL 和 undefined reference
不创建 occurrence。

这些 facts 是 immutable 的 Link-private adapter output。decode 或 parser 失败使 Check 结算为 `unavailable`，而不是发布
partial occurrence set。anchor lookup 时，每份文档以 ATX 和 Setext heading 创建新的 GitHub-priority slugger。source
navigation range 使用 decode 后 JavaScript UTF-16 position，line/column 为 one-based、end-exclusive；parser offset 和
dependency AST 保持 private。

这些 immutable facts 可由本 Check 的[parse-facts cache](#markdown-link-parse-facts-cache)复用；
cache 的恢复、当前 bytes 校验与 terminal publication 仍由同一 Link-private owner 承接。

## Markdown Link direct targets

Markdown Link Check 只能对 source occurrence 的 direct local target 做 bounded work。lexically 位于 project root 内的
target 即使不属于该 Check 的 source selection 也可被检查，但绝不成为 source input。启用 cross-document fragment 后，
只有可读取的 regular Markdown target 才提供 heading facts；directory 永不接受 anchor lookup。配置 directory
non-empty checking 后，最多读取一个 entry，绝不递归枚举。

relative lexical escape、host-native absolute path 和接受的 raw host-native empty-authority `file:///` local URI，在
target I/O 前进入 Check 的 `rootExternalTargetMode`。`ignore` 不产生 finding，也不做 root 外 work；`report` 产生安全的
`target-outside-project-root` finding，也不做 root 外 work；只有 `validate` 可对该 target 做 bounded direct work。
lexically root-in candidate 只能使用 component containment probe。若某个 symlink hop 越出 root，除 `validate` mode 外，
该 probe 不授权触碰 root 外 referent。

containment guarantee 依据操作期间观察到的 host filesystem state 判断。Node path/filesystem API 不提供 portable dirfd/openat
traversal，因此 component probe 成功后的 hostile concurrent replacement 不在本 Check 的 authorization proof 范围内。
regular-file read 仍使用 no-follow final-leaf opening 和 byte bound；需要 hostile-filesystem isolation 的调用方应使用
OS-level sandbox。

HTTP(S)、`mailto:`、protocol-relative URL、UNC path、带 authority 或不受支持的 `file:` form 以及其它不受支持的 target
form 只分类后停止。它们不产生 Product-owned DNS、HTTP、TLS、redirect、subprocess 或 filesystem I/O，也不产生
external reachability verdict。本 Check 没有 target discovery、crawler、shared resolver 或 general file-policy surface。

## Markdown Link parse-facts cache

`src/package-checks/markdown-link-validation/parse-facts-cache.ts` 拥有每次 resolver invocation 的恢复、命中与
publication；payload grammar 由相邻 `parse-facts-cache-payload.ts` 拥有。调用方配置、收益和存储安全边界见
[Markdown Link Check 指南](../checks/markdown-link-validation.md#parse-facts-cache)。

启用后，session 首次需要 facts 时只读取一次 `<directory>/markdown-link-parse-facts-v1.jsonl`，以同一个 Promise
串行化恢复。完整、有效的 JSONL lines 恢复成 invocation-local Map；malformed、unknown-version 和未以 newline
结束的尾行不进入 Map，同 identity 以最后一条有效 line 为准。missing file 等同空 cache；其它整文件读取或 UTF-8
解码失败同时关闭本次 publication，防止在未知材料后继续追加。

每次 lookup 前仍按当前授权读取 source/target exact bytes 并验证 UTF-8。identity 绑定 source bytes 的 SHA-256，
payload 验证绑定 parser contract 与版本；命中只复用 Link-private occurrences、headings 和 decoded ranges。
input discovery、target authorization/probe、Finding/Record 与 settlement 每次重新执行。

fresh parse 成功后将 facts 放入 dirty Map；terminal boundary 调用幂等 `finalize`，至多一次 awaited append 发布
完整 dirty block。开始 publication 前和 mkdir 后都检查 cancellation；append 一旦开始就等待完成，不启动后台写入。
观察到旧 partial tail 时先追加 newline 隔离它。publication failure 被包含，只影响未来复用，不改变 Check facts。

此 session 是 best-effort 单次调用状态，不建立跨进程锁、原子事务或持久性保证。并发 append 的损坏或重复 lines
依照相同恢复规则退化为 miss；目录容量与清理由调用方管理。修改 storage 时同步核查相邻 lifecycle 与 payload tests。

## Exact-input acceptance

scanner-derived measurement 必须声明 slash-normalized `sourcePaths`，且每个 path 都精确属于 owning Check 本次 invocation
的 approved exact set；任何越界 path 拒绝整批 conversion，不能写 partial Records。payload-specific location
consistency 属于对应 Check-local adapter；`src/package-checks/project-files/**` 只验证共同的 exact membership invariant，不读取 private
payload 重建领域事实。

## 验证

`src/package-checks/project-files/**` tests 覆盖显式来源、include/exclude、Git 成功空集合、filesystem 与 ignore 规则独立、
来源失败、命名集合、点号路径、NUL 路径、fingerprint、已初始化 submodule worktree 收集和 exact-input acceptance；各
Check 相邻 tests 证明 supported extensions、own options、scanner no-expansion 与 four-state settlement。
