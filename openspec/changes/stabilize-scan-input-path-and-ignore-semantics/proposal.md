## Why

`project-root` 已在 Product CLI 边界归一化，但相对 `--changed-files` 选项值仍由
`readFileSync` 按 process launch cwd 读取；列表中的 entries 又按 project paths 使用。
因此，同一个显式 project root 从不同目录启动时可能读取不同的列表文件。

显式列表读取失败时，input boundary 会包装底层 filesystem error，但当前 wrapper 不保留
`ENOENT` 分类，导致 missing input 无法进入 CLI 已定义的 exit `3` mapping。

Current 与 baseline collection 都先运行 Git。Current collection 只在 Git command 失败时
fallback；baseline collection 还会把成功的空结果改走 walker，可能把 Git 已正确排除的
VCS-ignored file 重新带入 scope。Fallback 本身只应用 product config。路径、错误分类与
两个 collector 的成功/fallback 边界需要形成一致、可测试的合同。

## What Changes

- 相对 `--changed-files` 列表文件路径统一基于 normalized project root 解析；绝对列表路径
  保持不变，列表 entries 继续作为 project paths 解释。
- Changed-files input boundary 在包装 read failure 时保留底层 `ENOENT` 分类，使 missing
  list file 按既有 CLI 合同退出 `3`；其它普通 read error 继续退出 `2`。
- Product parser、正式入口与 dogfood wrapper 透传同一个选项值，不增加 wrapper-specific
  rebasing 规则。
- Current 与 baseline Git collection 的成功结果均直接成为候选集合，包括成功的空结果；
  只有 Git command 失败才进入 fallback。
- 两个 fallback walker 采用相同的 config-only best-effort 合同：只应用 include、exclude
  与 generated-file 规则，不解析 `.gitignore` 或其它 VCS ignore source。
- 增加正式入口、路径边界、error mapping、Git success/failure、current/baseline fallback
  与 config exclusion 的定向测试，并同步 CLI、Scan Scope 与测试 owner。
- Metrics、warnings、report/artifact shape、summary status 与 scanner input classification
  保持不变；CLI 不新增 exit code，只把 missing list 归入既有 exit `3`。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `cli-contract`：规定相对 `--changed-files` 列表路径基于 normalized project root 解析，
  并固定绝对路径、列表 entries、`ENOENT` 映射与 wrapper 透传边界。
- `scan-scope`：规定 current/baseline Git success（包括空结果）均为权威结果，并把两个
  failure fallback 固定为 config-only best-effort collector。

## Impact

- 预计修改 `src/product/quality-core/src/input/files.ts` 的 explicit changed-files 读取边界
  与 baseline Git-success 分支，并扩展相邻 product/CLI tests。
- 同步 `docs/cli.md`、`docs/scan-scope.md`、CLI help 和必要的测试 case 记录；不新建同义
  capability 或 owner。
- 不新增 runtime dependency、ignore parser、配置字段、CLI flag、scanner adapter 行为、
  machine-readable 字段或 output mode。
