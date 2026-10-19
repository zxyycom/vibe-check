# 选择与收集项目文件

本文完整定义共同文件 selection、固定默认排除与同步 `collectProjectFiles`。收集只提供普通文件路径；Check eligibility、内容安全、Finding、Record 与终态仍由 owning Check 负责。

## 最小用法

```ts
import { collectProjectFiles, defaultProjectFileSelection } from "@zxyycom/vibe-check";

const selectedPaths = collectProjectFiles({
  projectRoot: ".",
  selection: {
    ...defaultProjectFileSelection,
    patterns: ["src/**/*.ts", "!**/fixtures/**"]
  }
});

if (!Object.isFrozen(selectedPaths)) {
  throw new Error("Expected an immutable project-file snapshot");
}
```

## 共享的 files 选择语义

selection 使用 `{ patterns, useDefaultExcludes?: boolean }`。`patterns` 是相对 project root、使用 `/` 的完整 micromatch 4.0.8 原生正/负列表。点号路径参与匹配；brace、extglob、globstar 和大小写敏感语义由同一后端解释。固定参数为 `dot: true`、`matchBase: false`、`nobrace: false`、`nocase: false`、`noext: false`、`noglobstar: false`、`posix: true`、`strictSlashes: false`。

原生列表可以用 `!` 排除；后续正 pattern 可以重新包含用户负规则排除的路径。只有负规则的列表选择相应补集；空数组始终不选择路径。所有规则遵循同一完整列表语义，不对单个负 pattern 做 any 匹配。

`useDefaultExcludes` 省略或 `true` 启用固定防呆层，只有 `false` 关闭，其它类型拒绝。最终范围是用户列表结果减去启用的默认排除；用户包含、重新包含或排列规则都不能绕过这一层。关闭仅移除默认数组，用户负规则、eligibility 与内容安全仍生效。

`DEFAULT_PROJECT_FILE_EXCLUDES` 是冻结的固定普通 glob 数组，覆盖 VCS/Product state、dependencies、build/generated、cache、coverage、log、temporary 与 virtual-environment 路径。它沿用以下基线，不自动加入 archive/historical 或业务规则：

```text
**/.cache/**  **/.git  **/.git/**  **/.log/**  **/.pytest_cache/**
**/.tmp/**  **/.venv/**  **/.vibe-check/**  **/__pycache__/**
**/artifacts/**  **/build/**  **/coverage/**  **/dist/**  **/generated/**
**/*.generated.*  **/node_modules/**  **/target/**  **/tmp/**  **/vendor/**  **/venv/**
```

`defaultProjectFileSelection` 是深冻结的 `{ patterns: ["**/*"], useDefaultExcludes: true }` 基线，不是全局配置。Check constructor 物化省略的 patterns，显式数组完整替换该默认；追加用户规则时显式 spread patterns。`functionMetrics`、`jsonValidation`、`markdownLint` 与 `markdownLinkValidation` 按支持后缀派生默认 patterns；其它使用基线的 Check 与各 area 的实际默认见对应指南。`secretDetection` 要求显式完整 selection。

Run change regions 只使用 `{ patterns }`，对 Git changed-path facts 使用同一原生列表与参数，不枚举磁盘，也不应用扫描默认排除；删除和重命名路径仍可匹配。默认排除只控制收集范围，不是显式路径的全局过滤器。

已经取得文件值后，可以用无 I/O 的[Core 文件—区域索引](file-region-index.md)组合多份来源、双向查询并追加重建；
实际筛选结果作为 members regions 保留，规则区域作为 patterns regions 计算，不让 Core 再做 acquisition 或默认排除。

## 工具输入

每次公开调用必须提供 `projectRoot` 与 `selection.patterns`，本工具不猜测 root 或 Check 的后缀默认。

| 输入 | 契约 |
| --- | --- |
| `projectRoot` | 非空、无 U+0000 的字符串；相对路径按调用时 cwd 解析，绝对路径直接使用。 |
| `selection.patterns` | 无空洞的非空字符串数组（数组本身可为空），整体解释为相对 root 的 slash glob 列表。 |
| `selection.useDefaultExcludes` | 可省略的 boolean；省略或 true 启用固定默认层。 |

对象只接受列出的自有可枚举数据字段；不接受 getter/setter、额外字段或 symbol。数组不接受空洞、accessor 元素或额外属性。校验形成 detached、冻结快照，不修改调用方输入；反射 Proxy 仍可能执行自身 trap，不构成不可信对象沙箱。

## 磁盘来源与访问范围

候选来自纯磁盘普通文件枚举，不跟随文件/目录 symlink，root symlink 作为不可用 root 失败。子仓库按普通目录处理；不发现、读取或转换 ignore 策略，不调用 Git，也不查询 tracked/untracked、HEAD、index 或 repository 身份。ignore 文件本身可以作为普通路径入选。

Check 的一次操作包含多份 selections 时，读取前只在能证明全部 selections 均无需求时剪枝；无法证明时继续访问。混合开关下仍需要默认排除目录的 selection 不会被其它 selection 剪掉。这种共享只限一个 Check 的本次操作。

公开工具 `collectProjectFiles` 每次同步处理一份 selection；各次调用及各 Check 之间没有 hidden cache 或全局候选上下文。

## 结果与路径身份

结果是相对解析后 root、使用 `/`、按稳定文本顺序排序、去重并冻结的数组。候选进入完整 matcher 前只移除后端的 `./` 前缀，不改写真实文件名字符。

POSIX 上实际名称含反斜杠、drive-like 前缀，或 byte name 不能忠实转换为 UTF-8 等、无法表示为 Product normalized relative path 的 selected 文件导致普通 acquisition Error，不伪造别名或静默丢弃。真正含 U+FFFD 的合法名称仍可返回；同名有损 byte entry 不能借它隐藏，也不能用有损 spelling 访问另一真实目录。未入选普通文件和已证明无需求的目录不导致这类失败；字节名 Error 给出所在绝对目录与 raw name hex。

合法无匹配返回冻结空数组；空 patterns 仍验证 root 存在、真实目录和可读取。扫描前已不存在的 glob 路径是合法无匹配；已观察到且必要访问的目录在扫描中消失属于失败。

不读取文件内容，不承诺返回后存在性、内容可读性、跨调用/文件系统原子快照、sandbox 或恶意并发路径替换隔离。

## 失败与调用边界

非法 options/root/selection 同步抛 `TypeError`；必要 filesystem inspection 或目录读取失败抛带目标路径上下文及 cause 的普通 `Error`，不返回 partial paths，不回退来源。无匹配与不可用不是同一结果。Check 在自己的生命周期边界将收集失败结算为 unavailable，后续内容读取与 exact-input 安全继续由它负责。

要将所选当前全集映射为 change tokens 并检查零命中、重叠与双向结果，使用[调试 change flags](debugging-change-flags.md)；获取范围仍由本页拥有。

## 迁移旧配置

从旧版文件选择配置升级时，先按[变更日志](../changelog.md#文件收集范围迁移)复核字段与候选范围变化。
