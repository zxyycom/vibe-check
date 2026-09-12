# Project files and Check exact inputs

本文拥有 `src/package-checks/project-files/**` 的 project-root 文件收集、配置过滤、内容 fingerprint 与 exact-input
acceptance 机制，以及 package-provided Check 如何使用这些能力。它不建立 Product-wide scan scope，也不定义
Check final status、Record、aggregation、machine output 或 scanner protocol。

公开 selection、默认基线与独立收集工具由[选择与收集项目文件](../guides/collecting-project-files.md)定义；本页解释内部收集与 exact-input 机制如何兑现它们。

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

默认基线与原生组合由[文件选择指南](../guides/collecting-project-files.md#共享的-files-选择语义)定义，各 Check 的精准 include 和 area policy 由对应[Check 指南](../navigation.md#随包-check-指南)定义。实现只共享 collection/exact-membership，不让 Definition 按 Check ID 解释领域 policy。

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

公开 `collectProjectFiles({ projectRoot, selection })` 是同步 façade；[收集指南](../guides/collecting-project-files.md)完整定义输入、路径、异常和结果。它先对 closed options/full selection 做 descriptor-safe snapshot，再将显式 root resolve 后交给同一 internal collection mechanism，返回 detached、冻结且排序去重的 relative slash paths。它不调用 Check constructor 补 defaults，也不把 source failure 转为空集合。

named batch、`Map`、候选快照和遍历优化继续 private。façade 只验证/快照输入，不承接 eligibility、content read、Check settlement 或 scanner work；扩展共同机制时同时验证公开与 Check-private 两个入口。

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

各 Check 的 input adapter 保持以下不同责任；完整状态、Finding 和安全规则见各自指南：

- [Duplicate detection](../checks/duplicate-detection.md) 与 [File metrics](../checks/file-metrics.md) 各自一次提交 area paths 的稳定去重并集。前者按 fragment locations 的共同 area 还原归属，后者按 path 的全部 matching areas 还原归属；共同 collection 不计算阈值或 Findings。
- [Function metrics](../checks/function-metrics.md) 的默认 include 与 eligibility 来自同一 Check-local reader registry。先分类再分析 accepted union；rejected path 保留全部排序 area IDs，不能落入通用 source fallback。
- [JSON validation](../checks/json-validation.md) 以 case-sensitive `.json` predicate 分类；[Markdown Link](../checks/markdown-link-validation.md) 对 `.md` / `.markdown` 使用大小写不敏感语义，direct target 不成为新的 source。
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

`src/package-checks/project-files/**` tests 覆盖显式来源、include/exclude、Git 成功空集合、filesystem 与 ignore 规则独立、
来源失败、命名集合、点号路径、NUL 路径、fingerprint、已初始化 submodule worktree 收集和 exact-input acceptance；各
Check 相邻 tests 证明 supported extensions、own options、scanner no-expansion 与 four-state settlement。
