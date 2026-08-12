# cli-interface

## Case BB-CLI-CHANGED-FILES-001: Product changed-files CLI 路径与错误映射稳定
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/cli.test.ts|changed-files CLI contract > exposes the same scan help through the product parser`
- `bun|src/product/cli.test.ts|changed-files CLI contract > maps wrapped read errors to ordinary and missing-input exits`
- `bun|src/product/cli.test.ts|changed-files CLI contract > resolves a relative changed-files list from an explicit project root`
Proves:
- 正式入口与 dogfood wrapper 通过同一 product parser 展示 changed-files 路径和 entry 语义。
- 正式入口从 project root 外启动时，相对 list path 仍基于显式 project root 读取，并把 project-relative entry 纳入 changed scope。
- Missing list 保留 `failed to read --changed-files` diagnostic 并退出 `3`；其它普通 read error 使用 exit `2`。

## Case BB-CLI-ROUTING-001: Product CLI routing 与进程映射稳定
Owner: `docs/cli.md#产品入口`
Entities:
- `bun|src/product/cli-init.test.ts|product CLI routing > maps init usage and runtime failures to operation-specific exit three diagnostics`
- `bun|src/product/cli.test.ts|product CLI routing > maps scan outcomes to the pinned process status contract`
- `bun|src/product/cli.test.ts|product CLI routing > normalizes an explicit project root and passes scan flags through unchanged`
- `bun|src/product/cli-init.test.ts|product CLI routing > normalizes init roots and reports neutral paths plus discovery-ready state`
- `bun|src/product/cli.test.ts|product CLI routing > rejects unknown commands before starting a scan`
- `bun|src/product/cli-init.test.ts|product CLI routing > shows root and init help without starting either operation`
- `bun|src/product/cli.test.ts|product CLI routing > uses the startup cwd when project root is omitted`
- `bun|src/product/cli.test.ts|product CLI routing > writes top-level errors to stderr and preserves ordinary and special mappings`
Proves:
- 正式入口归一化显式 project root，省略时使用启动 cwd，并将 product-owned scan flags 原样交给唯一 core。
- 未知命令在 scan 启动前失败；core outcome 与顶层 error 分别投影到固定 exit 和 stdout/stderr 边界。
- Root 与 `init` help 成功退出并展示受支持的 scan/init 命令面、missing-target 补齐与 existing-target 保留语义，不启动任何 operation。
- `init` 对显式 project root 和省略值分别按启动 cwd 归一化，不启动 scan；首次或重复成功时 stdout 只报告两个 fixed target paths 与 `discovery-ready` 状态。
- `init` 的未知 option、多余 project root 与 runtime failure 不启动 scan，不写 stdout，并以 operation-specific stderr diagnostic 退出 `3`。

## Case WB-CLI-CHANGED-FILES-001: Product changed-file input 路径与错误边界稳定
Owner: `docs/cli.md#scan-flags`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality changed file input > allows absolute and parent-relative list paths while keeping project-relative entries`
- `bun|src/product/quality-core/src/input/files.test.ts|quality changed file input > keeps current, changed, and baseline submodule files aligned`
- `bun|src/product/quality-core/src/input/files.test.ts|quality changed file input > preserves the read failure cause and filesystem error code`
- `bun|src/product/quality-core/src/input/files.test.ts|quality changed file input > resolves a relative changed-files list from the project root`
Proves:
- 相对 explicit `--changed-files` list path 基于 normalized project root 解析；absolute path 与基于 root 的 `..` path 可以指向 root 外。
- 列表 entries 保持 project-relative，不改为相对于列表文件解释。
- Unreadable explicit list 映射为保留 flag 名称、请求路径与原始 cause 的 thrown diagnostic；missing list 同时保留 top-level `ENOENT` 分类。
