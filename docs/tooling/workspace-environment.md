# 工作区环境与 Git hook

准备或检查开发环境、选择破坏性 clear，或提交前核对 hook 时读取本页；根命令见[工作区工具](workspace.md)。

## Local post-commit auto-push

### 启用与授权

`.githooks/post-commit` 是仓库拥有的 Git `post-commit` 入口。Git 不会在 clone 后自动启用版本化 hook；需要该行为的 checkout 必须显式运行 `git config --local core.hooksPath .githooks`，只修改当前 checkout 的本地 Git 配置。使用 `git config --local --unset core.hooksPath` 可以停用它。

在本仓库中，`core.hooksPath=.githooks` 表示当前 checkout 已显式选择该 hook 及其下述受限 push 行为。该配置存在时，任务对普通 `git commit` 的授权同时覆盖 hook 按本节契约发起的 push，无需另行确认；执行者不得仅为避免 auto-push 而临时覆盖 `core.hooksPath` 或以其他方式绕过 hook。只有任务明确要求仅创建本地提交，或 hook 故障后另行取得绕过授权时，才能在该次提交中绕过 hook。

### 推送范围与失败行为

启用后，hook 只在当前分支精确为 `main` 时处理提交，并且：

- 每 3,600 秒最多执行一次真实 push 尝试；attempt time 保存在 Git-local state 中，失败的尝试同样占用该窗口，避免在网络、鉴权或远端状态持续失败时由每次 commit 重复触发。
- 只向 `origin` 推送显式 refspec `refs/heads/main:refs/heads/main`，同时关闭 force 与 follow-tags；远端包含本地没有的提交时，普通 non-fast-forward 保护会拒绝 push。
- 远端、时间或 state 不可用以及 push 被拒绝时只输出诊断并返回成功，不改变 commit 结果，也不自动 fetch、pull、rebase、merge、创建或推送 tag。

每次调用都会先输出 `policy`，说明显式启用的受限 auto-push 属于普通 `git commit` 授权的预期行为、执行者不应仅为避免该 push 而绕过 hook，并直接给出 `260831-rate-limit-non-force-main-auto-push-after-commit` 的稳定 Decision ID 与仓库相对路径。随后输出 `commit`、`branch`、`target` 和 `action`。跳过时还会输出 `reason`；真实 push 完成后会输出 `result`，失败时另输出不会执行的恢复动作和 retry 边界。因此从 commit transcript 可以区分“分支不适用”“cooldown 内未发起请求”“正在执行安全 push”“成功”和“提交仍留在本地”。这些内容写到 hook 的 stdout/stderr；图形化 Git client 是否展示 hook transcript 仍由该 client 决定。

该 hook 只同步开发分支，不发布 npm package，也不创建 GitHub Release。npm package 仍是产品发布单元。

## Environment setup and destructive boundary

### 自举前提与效果

首次检出、工具 pin 变更或环境缺失时运行 `bun run env:setup`。该入口包含联网安装工具、依赖及显式联网缓存准备；确认这些外部操作与下述本地写入均在当前授权范围内。成功返回表示 checkout 已按以下顺序完成标准自举：

1. trust 当前 `mise.toml`，按锁定结果安装工具和根 Node dependencies，再按环境脚本列出的五项上游 Skill 各自的 manifest/锁文件安装隔离的生产依赖，禁用依赖安装脚本；
2. 初始化并同步当前 checkout 的 CodeGraph；
3. 显式运行 `bun run package:cache:prepare` 准备安装缓存，再通过 `bun run package:build` 离线准备 exact local package candidate。

标准开发与验证命令以 `env:setup` 成功返回为前置条件；项目不承诺未自举的 cold checkout 可以直接运行 Project Gate。后续独立启动的 Gate 从已自举的 private consumer 解析 candidate，并由自己的 preparation assessment 重验 exact installation 后复用；`package:build` 不建立第二套 package acceptance。

首次自举会写入 user-level mise trust/tool state、checkout 与上游 Skill 各自的 `node_modules`、Bun 安装缓存、`.codegraph`、candidate build/cache evidence 和 `scripts/project/node_modules`。后续执行按各 owner 的 reuse 规则更新或复用这些状态。

该 bootstrap 入口只依赖 Node/Bun 内置能力与根级错误映射，不能在依赖安装前加载 `process-execution` 的第三方 runner；`package:build` 只在 frozen dependency install 和 CodeGraph setup 成功后运行，失败会使 `env:setup` 失败。

### 检查与破坏性环境

执行前审阅 `mise.toml`。`bun run env:check` 只检查已安装 tools、jscpd 和 CodeGraph 状态，不检查或准备 candidate，也不执行 trust、安装或索引同步；检查失败后再运行 setup。两个命令以 `MISE_GLOBAL_CONFIG_FILE` 隔离用户全局 mise 配置。

`.codex/environments/environment.toml` 在 setup 后运行默认 Project Gate，不清理 worktree。

`.codex/environments/environment-2.toml` 的 `clear` 环境会在同一 setup 前对 `CODEX_WORKTREE_PATH` 执行 `git restore --staged --worktree -- .` 与 `git clean -fd -- .`；这会不可恢复地删除 tracked 改动和未跟踪、非 ignored 文件。只有明确授权丢弃目标 worktree 内容时才能选择它。

Product Check 的 scanner command、availability command 和 unavailable behavior 仍由[Check-owned scanner dependencies](../development/scanner-dependencies.md)所列的各 Check owner 定义；Gate 不创建第二套 scanner workflow。
