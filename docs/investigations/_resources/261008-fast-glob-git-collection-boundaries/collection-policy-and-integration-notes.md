# 文件策略与接入边界的复核说明

用途：为 `261008-fast-glob-git-collection-boundaries` 保留固定版本来源和需要按需展开的接入细节。
2026-10-08 同轮前段的库/Git 取证与后段的 ignore、状态和 symlink 讨论分别列出。
这里的静态检查和候选策略不是产品接入结果或已采用决策。

## 固定版本后端来源

fast-glob 3.3.3：

- [公开入口](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/index.ts)提供同步 glob，
  没有公开纯 path-list matcher。
- [task manager](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/managers/tasks.ts)与
  [sync provider](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/providers/sync.ts) /
  [sync reader](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/readers/sync.ts)承接 pattern base 和 fs 遍历。
- [deep filter](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/providers/filters/deep.ts)控制下沉；
  [entry filter](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/providers/filters/entry.ts)控制最终匹配。
- [error filter](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/providers/filters/error.ts)默认忽略 ENOENT。
  `suppressErrors:false` 因此仍不足以证明全部扫描失败都会报告。
- [固定 README](https://github.com/mrmlnc/fast-glob/blob/3.3.3/README.md#how-to-exclude-directory-from-reading)
  区分 `**/dir/**` 与 `**/dir/**/*` 的目录读取效果。
- [micromatch 4.0.8 matcher](https://github.com/micromatch/micromatch/blob/4.0.8/README.md#matcher)
  提供纯字符串匹配，可用于既得 Git paths 和其它共同 glob 消费者。

上述版本仅阅读源码，未安装或执行。root 预检、task base、静态 include 的 stat、
symlink base 与遍历期间消失的目录，仍需用实际接入证明执行顺序。
文件系统 descendant 的 `followSymbolicLinks:false` 不自动涵盖所有入口或内容读取。

## Git 原生能力与过滤边界

- [Git 2.53.0 ls-files 文档](https://github.com/git/git/blob/v2.53.0/Documentation/git-ls-files.adoc)与
  [源码](https://github.com/git/git/blob/v2.53.0/builtin/ls-files.c)限定 recurse-submodules 的模式；
  该 fixture 的 cached+others union 加 recursion 实测 exit 128。
- [pathspec glossary](https://github.com/git/git/blob/v2.53.0/Documentation/glossary-content.adoc#def_pathspec)
  说明默认、glob、literal、exclude 模式。Product brace glob 与 Git glob 的差异由原生 fixture 验证。
  exclude-only Git pathspec 的全集含义也不同于 Product 空 include。
- [Git directory reader](https://github.com/git/git/blob/v2.53.0/dir.c)的 `open_cached_dir`
  在 opendir 失败时发出 warning。当前 collector 通过 process failure 判断来源错误；
  exit 0 acquisition warning 的严格策略尚未定义，本轮没有权限反例实测。
  这是待验证风险，不是已确认 Product Bug。

候选预过滤只可采用已证明不漏掉 selection 所需路径的子集。简单整目录排除可先应用；
复杂模式无法证明时保留访问。所有同源 selection 均无需求，才允许共享 acquisition 跳过子树。
Git 非零退出、spawn/signal 或不可信 metadata 继续失败；合法空输出与失败分开。
空 include 的来源可用性检查仍由当前契约要求。

## 同轮后续：ignore、状态与链接各自是什么事实

### 忽略规则

[Git 2.53.0 ignore 文档](https://github.com/git/git/blob/v2.53.0/Documentation/gitignore.adoc)
规定后匹配优先、`!`、相对 ignore 文件位置、目录模式及父目录排除限制。
标准 Git ignore 还包含 info/exclude 与用户级配置，并对已 tracked 文件保留例外。

因此可独立支持 ignore 文件，但实施前要确定：

1. 读取哪些显式文件，是否覆盖嵌套规则；用户级配置是否属于预期输入。
2. 采用 Git ignore grammar，还是显式 Product glob；成熟 matcher 可承担解析。
3. 对所有扫描候选应用规则，还是只对 untracked 应用；后一项需要在剪枝前考虑 tracked 路径。
4. 显式 include/exclude 与 ignore 文件之间的优先级，尤其重新包含是否仍服从最终 exclude。

这些选项尚未定稿，不能把 `.gitignore` 各行直接并入普通 exclude 数组后宣称等价。

### 追踪与变更

[Git status 文档](https://git-scm.com/docs/git-status)区分 index 相对 HEAD、
worktree 相对 index，以及 untracked。追踪状态以 Git index 为事实源；
修改状态还需要 baseline，单一文件 mtime 不是同等证据。

本项目的 `src/project-run/changes/git.ts` 合并 committed comparison、
staged、unstaged 和标准非忽略 untracked，再由 regions 形成 path/flags。
这是现有变更触发能力，既不暴露完整 status，也不改变其它 Check 的文件 selection。
新增、删除、重命名事实应与磁盘现存候选分开；跨子仓库的 Git 状态范围需显式界定。

“仅 tracked”与“本地新文件也检查”是可说明价值的场景，不是已证实的外部消费者需求。
Git 查询可以按需批量进行；未配置时保持 filesystem 路径，配置但不能取得可信事实时报告对应失败。

### 符号链接

[Node 24.18.0 文件系统文档](https://nodejs.org/download/release/v24.18.0/docs/api/fs.html)
区分 `lstat` 的链接身份、`stat` 的目标身份，以及 `readlink` 的目标路径字符串。
保留链接条目和读取目标内容是不同能力；“当普通文件”本身没有确定读哪份数据。

当前 Git collector 接受文件或 symlink candidate；filesystem 跳过 symlink。
候选策略若开放读取目标，应明确逻辑路径/目标身份、断链、越界、循环和重复；
文件链接与目录链接分开验收。收集阶段给出的路径不是 owning Check 的内容读取授权。
例如 secret detection 继续拥有 regular-file、descriptor identity 和 no-follow 检查。

## 判断层级与后续验收

同轮讨论支持“统一 filesystem 收集 + 按需 Git 事实”的候选方向。
是否取消双来源、保留哪些状态、采用何种 ignore/link policy，仍需产品取舍与对应 Decision/Change；
现有按需收集、纯 membership 和 change flags 的职责保持清楚。

后端集成、Git warning 反例、Windows/链接行为或新的真实性能目标出现时，按新条件重新取证。
库接入与 installed consumer 验收覆盖范围不同；原生调用数也不能代替真实 workload 的性能对照。
