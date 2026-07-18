## Context

Product CLI 已把 `project-root` 相对于 startup cwd 解析成 normalized absolute root。
`parseArgs` 随后把 `--changed-files` 保留为字符串，`getChangedFileList` 直接读取该字符串。
Node 文件 API 因而按 process launch cwd 解释相对值，而列表 entries 由 scan core 当作
project paths 使用。

`getChangedFileList` 会为 read failure 增加可行动 error prefix 和 `cause`，但
`qualityScanErrorExitCode` 只检查 top-level error 的 `code`。Missing list 的底层
`ENOENT` 因而被重新分类为 ordinary exit `2`，与 CLI owner 的 `ENOENT` exit `3` 规则不一致。

Scan scope 的 current 与 baseline collector 都优先运行
`git ls-files --cached --others --exclude-standard`。Current collector 只在 command
失败时 fallback；baseline collector 在 command 失败或 stdout 为空时 fallback。后者会把
一个成功的空 Git result 当成 collection failure，并可能通过 config-only walker 重新纳入
VCS-ignored path。两个 fallback 都应用 product config 的 include、exclude directories
与 generated-file globs，不读取 VCS ignore source。

该 change 横跨 `cli-contract` 与 `scan-scope`，但两个 owner 保持分工：CLI 定义选项路径
和 error mapping，Scan Scope 定义 collector 的候选集合。

## Goals / Non-Goals

**Goals:**

- 让相对 `--changed-files` 列表文件路径只依赖 normalized project root，不依赖启动位置。
- 固定绝对列表路径、允许的 parent segments 与 project-path entries 语义。
- 让 missing list 保留 `ENOENT` 分类并使用 CLI 已定义的 exit `3`。
- 让 current/baseline Git success（包括空结果）均为权威结果。
- 把两个 failure fallback 的 config-only best-effort 行为写成可观察、可回归验证的合同。
- 让正式入口、dogfood wrapper、core input、owner 文档与测试使用同一套边界。

**Non-Goals:**

- 不把列表 entries 改成相对于列表文件的路径，也不新增 entry canonicalization 或
  existence filtering。
- 不把列表文件限制在 project root 内；absolute path 与基于 root 解析后的 `..` path 均可
  指向 root 外。
- 不为 fallback 引入 `.gitignore` parser、全局 Git excludes、nested ignore precedence
  或新的 ignore diagnostic。
- 不改变 include、exclude、generated-file、code-area 或 supported-input 配置值和
  precedence。
- 不改变 CLI 的通用 exit-code table、metrics、warnings、artifact/report、summary status
  或 scanner adapter 合同。

## Decisions

### Decision 1: 相对列表路径基于 normalized project root

文件读取边界使用 normalized project root 解析相对 `--changed-files` 值。绝对值直接使用，
不经过 project-root rebasing。实现遵循平台原生 path resolution，解析 `.` / `..` segments，
但不做 realpath canonicalization 或 project-root containment。

该基准与 `project-root`、列表 entries 和其它 scan input 的上下文一致，也使
`scan <project-root> --changed-files <relative-path>` 不受 startup cwd 变化影响。合同只
定义 project-root-relative 基准。

### Decision 2: 读取边界同时拥有路径解析与 filesystem error 分类

Product parser 与 dogfood wrapper 保持透传，不各自解析或重写该选项。当前同时拥有
normalized root 和 raw option 的 `getChangedFileList` input boundary 负责定位文件；这样
direct entry、wrapper 与 core 调用不会形成多套基准。

读取失败继续使用 `failed to read --changed-files` error prefix 和原始 `cause`。Wrapper
额外保留底层 `ENOENT` 分类，使 CLI 使用既有 exit `3`；不匹配 `ENOENT` 或 config mapping
的普通 read failure 继续使用 exit `2`。文件内容仍按既有换行与 slash normalization
处理，entries 继续作为 project paths 传入 scan context。

### Decision 3: Git success 对 current 与 baseline 都具有权威性

Current 与 baseline collector 在 Git command 成功时都直接使用其 normalized result；
空 stdout 表示合法的 empty candidate set，不触发 walker。只有 command failure 才进入
对应 fallback。

这使成功 Git collection 的 VCS ignore 结果不会因候选集合为空而被 baseline walker
覆盖，也让两个 collector 共享同一个 success/failure 状态转移。

### Decision 4: Command failure fallback 采用 config-only best-effort

Current 与 baseline fallback candidate eligibility 都只由 product config 的 include、
excludeDirs 与 generatedFiles 决定；`.gitignore`、`.git/info/exclude` 和 global excludes
不作为 fallback input。

Fallback 是 command failure 的有界恢复 collector，不承担第二套 VCS rule engine。由于
Product CLI 不提供配置入口，需要新增稳定排除时由 Config / Scan Scope owner 处理；
调用者不能把 VCS ignore source 当作 fallback 合同。

### Decision 5: 在各自 owner 层证明合同

- Product input tests 证明 relative/absolute changed-files 路径、entry 语义和读取失败。
- Product entry test 从 project root 外启动，证明 public CLI 组合了同一个 root 与相对
  list path；wrapper test 证明参数透传。
- File collection tests 对 current 与 baseline 分别证明 Git success/empty result 和
  command-failure fallback，并证明 config exclusions 在 fallback 中生效。
- CLI 与 Scan Scope 文档分别拥有路径基准和 ignore 差异；测试文档只记录证明目标。

## Risks / Trade-offs

- [相对路径可通过 `..` 或 absolute value 指向 project root 外] → 这是显式 list-file
  参数的既有能力，不是 scan entry 扩张；entries 仍按 project paths 解释。
- [Missing list 的 error wrapper 丢失 `ENOENT`] → 在 input boundary 保留分类，并用 unit 与
  Product CLI tests 固定 exit `3`。
- [Baseline 成功空结果被误判为 failure] → 成功状态优先于 stdout 是否为空，并用只有
  VCS-ignored input 的 Git fixture 证明不会 fallback。
- [Git 可用与失败时 VCS-ignored 文件集合不同] → 把差异作为 fallback 合同和测试场景，
  稳定排除由 Config / Scan Scope owner 处理。
- [同一选项在 parser、wrapper 和 core 被重复解析] → 只允许 input boundary 定位文件，
  入口层保持 opaque value 透传。
