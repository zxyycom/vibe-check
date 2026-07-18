本 design 起草 external project 配置发现与初始化路径；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

正式 CLI 接受任意 project root，但省略 `--config` 时使用的 built-in config 只匹配 Vibe Check 自身目录。显式配置又必须完整包含 scope、threshold、report、cache 和 tool commands。当前行为适合 dogfood，不适合作为外部项目默认入口。

本 change 以“明确选择项目配置”为边界，不同时解决稳定 machine output、发行包装或 scanner backend。

## Goals / Non-Goals

**Goals:**

- 外部项目不会静默继承 Vibe Check 仓库专用 globs 和 code areas。
- `--config`、project-root discovery 与 dogfood 配置具有单一 precedence。
- 提供安全、确定、非交互的初始化命令。
- config provenance 在 scanner 启动前可见并可测试。

**Non-Goals:**

- 不搜索父目录或用户 home。
- 不支持多文件 extends、远程 config 或 plugin config。
- 不在第一版引入任意深层 merge DSL。
- 不改变 scanner、threshold 算法或 artifact schema。

## Decisions

### Decision 1: 只发现 project root 下的固定文件

未传 `--config` 时，CLI 只检查 `<project-root>/vibe-check.config.json`。不向父目录、launch cwd 或 home 递归搜索，避免 monorepo 与嵌套 project 的隐式继承。

显式 `--config` 始终最高优先级，并继续按 normalized project root 解析相对路径。

### Decision 2: 没有配置时 fail closed

正式 scan 若既没有显式 config，也没有 discovered config，则在启动 scanner 前退出 config error，并提示运行 `init` 或传入 `--config`。仓库 dogfood wrapper 改为显式传入 checked-in Vibe Check config。

备选方案是提供 generic silent fallback。由于 scanner、code area 与 threshold 选择会直接影响结果可信度，第一版不采用静默 fallback。

### Decision 3: `init` 生成完整、可提交的 starter config

新增 `init [project-root]` operation，在固定 discovery path 不存在时生成满足当前完整 `QualityConfig` parser 的 JSON。初始化不扫描、不联网、不自动修改 package scripts，也不覆盖已有文件。

第一版继续使用完整 config schema，不同时引入 partial merge；降低使用门槛依靠 deterministic generation 和 owner documentation。后续若完整配置维护成本仍过高，再独立设计 public partial config 与 resolved runtime config。

### Decision 4: Config source 成为 runtime metadata

Selected config 记录 `explicit` 或 `discovered` source、resolved path 和 config version。Console 在 tool preflight 前打印 source；current、baseline 和 fallback collection 复用同一 parsed object。

## Risks / Trade-offs

- [完整 starter config 较长] → 生成文件按职责分组并附 schema/documentation link；不让用户手工从 fixture 复制。
- [fail closed 会打破当前省略 config 的 formal CLI] → dogfood wrapper 在同一 change 迁移到 checked-in config，并在 CLI error 中给出迁移命令。
- [generic starter globs 不适合所有项目] → 明确 starter 只是可编辑起点，初始化后首次 scan 打印 effective scope。

## Migration Plan

1. 确定 starter config 内容与 checked-in Vibe Check dogfood config。
2. 增加 config source model、root discovery 和 `init` routing。
3. 迁移 dogfood wrapper 显式选择仓库 config。
4. 更新 external fixture，覆盖 explicit、discovered、missing、existing-init 和 cwd independence。
5. 更新 CLI/config/scan-scope owner 文档和验证入口。

## Open Questions

1. Starter config 应提供单一 mixed TypeScript/Rust scope，还是提供显式 `--preset typescript|rust|mixed`；推荐第一版只提供单一 mixed starter，避免在未建立真实用户样本前固化 preset taxonomy。
