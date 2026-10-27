# `markdownLinkValidation`

## 用途

`markdownLinkValidation(options?)` 构造普通 Check，离线验证所选 Markdown 中的本机链接、图片目标与标题锚点。

运行宿主须允许创建 `node:worker_threads` Worker。Check 在首次需要本地路径或正文 I/O 时惰性启动一个私有 Worker，
并在本次调用结束前关闭它；禁止 Worker 的宿主不受支持，创建失败不会回退到主线程 I/O。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, markdownLinkValidation, run } from "@zxyycom/vibe-check";

const check = markdownLinkValidation({ findingPolicy: "blocking" });
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`Markdown link validation did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

示例显式使用 `findingPolicy: "blocking"`，让普通链接 Finding 导致失败；默认 `non-blocking` 只警告，不因 Finding 退出非零。

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。多个有效 Check 的调用级结论可读取默认严格 `aggregate`；需要不同领域解释时，提供同步 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation) 函数。`run(...)` 返回本身不表示通过。

## 构造器项目声明

默认 `checkId` 是 `markdown-link-validation`，默认 `displayName` 是 `Markdown link validation`；`files`、
`findingPolicy`、target policy、`cache` 与 `limits` 仍是本 Check 的领域 options。

例如，让文档链接检查观察生成文档并使用独立 identity：

```ts
const docsLinks = markdownLinkValidation({
  checkId: "documentation-links",
  observes: ["generate-docs"],
  files: { patterns: ["docs/**/*.md"] }
});
```

返回值仍是原生 typed Check。项目声明字段不会进入 `.options` 或执行时的业务 options 参数；
完整字段集合、投影和校验边界见[API 机制](../api-mechanics.md#随包-check-的构造器项目声明)。

## 参数与默认配置

```ts
{
  files: {
    useDefaultExcludes: true,
    patterns: ["**/*.[mM][dD]", "**/*.[mM][aA][rR][kK][dD][oO][wW][nN]"]
  },
  findingPolicy: "non-blocking",
  requireExistingTargets: true,
  validateSameDocumentAnchors: true,
  validateCrossDocumentAnchors: true,
  rootExternalTargetMode: "report",
  requireNonEmptyDirectories: false,
  cache: {
    enabled: false
  },
  limits: {
    maxMarkdownBytes: 1_048_576,
    maxOccurrences: 10_000,
    maxTargetReads: 1_000
  }
}
```

无参调用物化上述完整 options，默认启用固定排除。
所有顶层字段及 `files`、`limits` 子字段都可省略。

- `files` 遵循[共享 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)。只有大小写不敏感的
  `.md` / `.markdown` 成为 sources；其它 selected paths 发布拒绝 Finding。direct targets 仅供 resolution，不扩大 source selection。
- `findingPolicy` 为 `blocking | non-blocking`，默认 `non-blocking`，只决定本 Check 的普通链接 Finding 是否导致失败，不改写 Run、aggregation 或 Gate outcome；Records 与计数不随 policy 改变。
- `requireExistingTargets` 控制缺失 direct local target 是否是 finding。
- `validateSameDocumentAnchors` / `validateCrossDocumentAnchors` 分别控制当前文档与直接 Markdown target 的 heading
  lookup。
- `rootExternalTargetMode` 为 `ignore | report | validate`；只有显式 `validate` 才授权 bounded root-external target I/O。
- `requireNonEmptyDirectories` 启用时最多读取 direct directory 的一个 entry，不递归遍历。
- `cache` 默认 `{ enabled: false }`，不访问 cache filesystem，且不能带 `directory` 或 `warnAboveBytes`。启用 branch 为
  `{ enabled: true, directory, warnAboveBytes? }`；配置、容量提醒与安全边界见 [Parse-facts cache](#parse-facts-cache)。
- `limits` 限制单文档 bytes、全部 semantic occurrences 与 direct target reads；constructor 会补齐该 branch 中省略的
  fields。`maxMarkdownBytes` 保持正整数且不得超过 `16_777_216`。`maxOccurrences`、`maxTargetReads` 接受正安全整数或
  `false`，没有固定配置最大值；`false` 关闭对应总量预算，省略仍使用上述默认值。`true`、`null`、零、负数、
  非整数、非有限数和不安全整数均非法。关闭总量预算意味着调用方承担更大的总体资源消耗，不是进程资源隔离。

### 定制 authoring options

下面只扫描 `docs/**`、排除 `docs/fixtures/**`、忽略 project root 外目标，并保留其它 defaults：

```ts
import { defaultProjectFileSelection, markdownLinkValidation } from "@zxyycom/vibe-check";

const documentationLinks = markdownLinkValidation({
  files: {
    ...defaultProjectFileSelection,
    patterns: ["docs/**/*.md", "docs/**/*.markdown", "!docs/fixtures/**"]
  },
  rootExternalTargetMode: "ignore"
});
```

若要完整检查持续增长的文档，可显式关闭两项总量预算，保留默认单文件字节边界与其它配置：

```ts
const completeDocumentationLinks = markdownLinkValidation({
  findingPolicy: "blocking",
  limits: { maxOccurrences: false, maxTargetReads: false }
});
```

只关闭其中一项时，另一项仍使用其默认预算；`false` 与省略字段的含义不同。

### Parse-facts cache

#### 启用与复用

启用后，cache 在调用方指定的 absolute directory 保存可删除的 Markdown parse facts；调用方负责目录容量与删除。
它不是输出目录，也不提供机密性或防篡改保护；不愿复制到本地状态的 Markdown 不应启用 cache。

`directory` 必须是非空、无 U+0000 的 host-absolute path。`warnAboveBytes` 可省略，默认
`16_777_216` bytes（16 MiB）；显式值必须是正安全整数。下面以调用方已选定的绝对路径启用 cache，
并把提醒阈值设为 32 MiB：

```ts
const cachedLinks = markdownLinkValidation({
  cache: { enabled: true, directory: cacheDirectory, warnAboveBytes: 33_554_432 }
});
```

命中只避免重复计算 parse facts；每次仍用当前 selection、Markdown bytes 与 target policy 形成 Finding、Record 和 outcome，
不改变 Check ID 或 finding policy。无法恢复 facts 时 fresh-parse；写入失败只影响后续复用，不改变本次结果或任何发布字段。

#### 容量提醒

首次实际需要 parse facts 并成功读取
`<directory>/markdown-link-parse-facts-v1.jsonl` 后，已读文件 bytes 严格超过 `warnAboveBytes` 才追加一条
`parse-facts-cache-capacity` warning。默认 16 MiB 只是维护提醒，不是性能安全线或容量限制。message 给出
大小、阈值及可删除的准确文件路径；删除后下次重新解析，不会自动清理、停用缓存或中止检查。
本次 append 跨阈值不二次读取；下一次 invocation 实际读取到超阈值文件才提醒。

每次 invocation 至多提醒一次，沿普通 Check messages 输出，不加入 Findings、Records、final data 或计数，也不改变
terminal status 或 finding policy。missing/read-failed cache 不提醒；已成功读到的超阈值无效内容仍可提醒并按原规则 fresh-parse。
容量判断只使用该次已读 bytes。未用到 cache（关闭、无输入、首个 parse 前错误/取消或源 bytes
非 UTF-8）不访问 cache 文件，也不提醒。read 返回时已经取消不提醒；已产生的提醒随后续正常返回的
`unavailable` result 保留，原错误优先级不变。

#### 取消与发布

publication 开始前取消不会启动写入；append 开始后会等待完成。cache 不缓存 settlement，也不保证跨进程协调、持久性或自动清理。

## 工作原理

Check 先验证 options，按本页 suffix 规则完整分类 selected paths，为 rejected paths 发布 Records，再解析 accepted sources。
对 file、directory 与 GitHub-priority heading anchor 按 policy 做 bounded validation；每个普通链接 Finding 另发 Record。

### 执行阶段、计费与首错

Check 先读取全部选中的 Markdown 并登记 occurrences，再分类目的地、按首次引用顺序观察目标，最后按 source / occurrence 顺序判断每条引用。一次 invocation 内相同授权域的目标首次观察固定，包括缺失和目录结果；后续替换或创建留到下次观察，不构成全文件系统原子快照。纯目标的链接不扩展 source selection；不同逻辑别名与授权域独立观察。每条引用仍有独立位置、Finding 和计数。

`targetReadCount` 与 `maxTargetReads` 按进入 direct endpoint validation 的 logical occurrence 计费，即使复用目标事实也计费，不等于 physical read 或 syscall 数量；同文档、远程、外部 ignore/report 不计 target work。节点的计费引用整批预检，超限时不读取该节点额外内容，也不继续后续节点。occurrence 预算在源阶段登记时检查。

多故障首错顺序为 options / root / 输入分类 → 全部源读取及 occurrence 预算 → 目的地分类 → 按首次引用顺序的目标观察及节点批次预算 → 逐引用结算。取消在检查点优先；较晚源错误可能先于较早引用的目标错误，节点批次预算也可能先于该节点内容错误。授权、读取、解码或解析失败立即 unavailable，不形成部分正常结果。

### 协作取消与完整发布

执行过程中协作检查取消，不提供抢占式实时取消或固定延迟保证；已进入的系统调用须等待返回。取消时等待在途工作尝试关闭文件并退出，不强杀在途读取。收束与最后取消检查完成前，不发布普通链接 Records 或 final data；普通链接 Records 完整发布。已有 traversal unavailable 保留首错；只有收束失败时返回 `target-unavailable`，不发布原本的普通成功或 Finding 结果。

### 识别的引用

受支持 occurrence 包含 inline link/image、已定义的 full/collapsed/shortcut reference、explicit autolink 和选定的 GFM
autolink literal。YAML front matter、code/fenced code、HTML attribute、普通 prose URL 与 undefined reference 不进入本
Check 的 occurrence 集合。HTTP(S)、`mailto:` 与其它非本地 target 只分类后停止，不产生 remote reachability 结论。

## 效果与结果

没有 normal link finding 时 outcome 为 `passed`；有 normal link finding 时，`findingPolicy: "blocking"` 为 `failed`，
`findingPolicy: "non-blocking"` 为 `passed`。input rejection 固定 non-blocking，不受该 policy 影响。
两种 policy 保留相同 final data 与每 Finding 一条 Record。正常 final data 恰为：

```ts
{
  sourceFileCount: number,
  occurrenceCount: number,
  targetReadCount: number,
  findingCount: number,
  rejectedInputCount: number
}
```

`occurrenceCount` 包含所有 parser-semantic occurrences，包括没有进入 local target validation 的项；
`targetReadCount` 统计进入 direct endpoint validation 的 logical occurrence（包括节点事实复用）；`findingCount -
rejectedInputCount` 是 normal link finding 数量并且不超过 `occurrenceCount`。每个 normal link finding 恰好形成一条 Record，data
恰为：

```ts
{
  occurrenceKind: "link" | "image",
  range: {
    start: { line: number, column: number },
    end: { line: number, column: number }
  },
  reason:
    | "missing-target"
    | "target-outside-project-root"
    | "empty-directory"
    | "anchor-on-directory"
    | "anchor-target-not-markdown"
    | "missing-anchor"
    | "unsupported-target-type",
  sourcePath: string,
  target:
    | { kind: "same-document" | "project-file" | "project-directory" | "project-path", path: string, fragment: string | null }
    | { kind: "outside-project-root" }
}
```

`range` 使用 one-based、end-exclusive 的 decoded UTF-16 line/column。`outside-project-root` descriptor 不携带 target
path 或 fragment。

每个 rejected selected path 产生一条 ID 为 `/input-rejected/<path>` 的 Record：

```ts
{
  blocking: false,
  kind: "input-rejected",
  path: string,
  reason: "unsupported-file-type"
}
```

blocking finding 的 `failed` outcome 携带 `invalid-local-links` error message；non-blocking finding 的 `passed` outcome
携带同 code 的 warning message。`markdownLinkValidation` 的 detail messages 先按 normal link、再按 input rejection 的稳定
顺序：normal 摘要只含 source project-relative path、start line/column、occurrence kind 与封闭 reason，不复制 target；rejection
摘要只含项目相对 path。存在 rejected input 时仍先附 `input-rejected` 数量 warning；完整 source range、safe target 与 reason
仍从 Records 读取。通用的 terminal Finding 呈现与 Run progress 预览边界见
[呈现 Check Finding](../guides/presenting-findings.md)。由本 Check 结算的 `unavailable` 使用对应 `reason.code` 提供可操作
error message；无 Finding 的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseMarkdownLinkValidationData(value)` 验证 final data。两者返回
`MarkdownLinkValidationFinalData`；Records 与原因可用 `MarkdownLinkValidationRecordData`、
`MarkdownLinkFindingReason` 和 `MarkdownLinkValidationUnavailableReason` 标注，authoring / resolved options types 是
`MarkdownLinkValidationOptions` 与 `ResolvedMarkdownLinkValidationOptions`。parser 验证字段与计数上界，不匹配时抛出
`TypeError`。

## `not-applicable` 与 `unavailable`

selected path 数量为零时结算为 `not-applicable / no-eligible-input`。selected 非空但全部 rejected 时，不解析 source，直接以
带 final data、Records 与 warning 的 `passed` 结算。`unavailable.reason.code` 使用以下受控值：

| `reason.code`                | 触发边界与调用方检查项                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `invalid-options`            | constructor 返回后形成的 replacement options 不是完整 closed resolved shape；重新调用 `markdownLinkValidation(options)` 或恢复完整字段。 |
| `project-root-unavailable`   | project root 无法 canonicalize；检查路径存在性与访问权限。                                                                               |
| `source-unavailable`         | source collection、读取、decode 或 containment 失败（含该阶段 Worker 不可用）；检查 source、file-selection 来源及 Worker 权限。                                                |
| `source-too-large`           | 某个 selected Markdown source 超过 `maxMarkdownBytes`。                                                                                  |
| `markdown-parse-failed`      | selected source 无法形成完整 parser facts。                                                                                              |
| `invalid-local-destination`  | local destination 无法按受支持的 path/URI grammar 安全解析。                                                                             |
| `target-unavailable`         | target containment probe、I/O、decode、parse、directory read 或 Worker 收束失败；Markdown anchor target 超过 `maxMarkdownBytes` 也属于此分支。       |
| `occurrence-limit-exceeded`  | semantic occurrence 总数超过 `maxOccurrences`。                                                                                          |
| `target-read-limit-exceeded` | direct endpoint validation work 超过 `maxTargetReads`。                                                                                  |
| `cancelled`                  | invocation signal 取消本 Check；不要把结果解释为 clean validation。                                                                      |

这些边界不发布 partial link-finding Records，也不提供 final data；若 selected classification 已完成，已发布的
rejected-input Records 与对应 warning 仍保留。通用 preparation 语法见
[options preparation 与 execution](../api-mechanics.md#options-preparation-与-execution)。

## I/O 与安全边界

source I/O scope 只包含通过 `.md` / `.markdown` eligibility 的 accepted paths；rejected path 不读取内容。resolver I/O scope
是本地 filesystem，HTTP、DNS、TLS 与 redirect request 数为零。默认 `report` mode 对 root-external target 形成 finding，显式
`validate` mode 授权 bounded read。published facts 排除 raw external absolute path、target bytes 与 remote credentials。

启用 `cache` 会额外访问调用方指定 directory，并可能写入上文所列 source-derived parse facts；它不改变 published facts，
也不把 cache directory 当作 security boundary。调用方应仅传入自己信任、可删除的 absolute directory。

## 适用边界

该 Check 不评估 remote URL reachability 或 HTML attribute links；需要时另配拥有明确网络或 HTML parsing policy 的 Check。
