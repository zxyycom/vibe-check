---
title: "项目文件收集：fast-glob 能力、Git 剪枝与职责拆分"
id: "261008-fast-glob-git-collection-boundaries"
formedAt: "2026-10-08T03:04:41Z"
question: "fast-glob 能替代哪些职责，Git 范围外子仓库为何仍被访问，统一 filesystem 收集并按需保留忽略、追踪和变更能力有哪些边界？"
tags:
  - "file-collection"
  - "git"
  - "glob"
  - "ignore-rules"
  - "responsibility-boundaries"
  - "symbolic-links"
relations:
  - type: "补充"
    target: "261006-compare-node-file-collection-backends"
    summary: "补充Git原生枚举与下沉前排除的责任边界"
---

## 形成时背景

用户报告被排除的子仓库仍被访问，先询问 fast-glob 能否解决 Git 收集，再追问是否可以统一 filesystem
收集、按需保留忽略规则、追踪状态与变更事实。本轮的重心由后端替换收敛为**实际需要哪些文件事实，
以及由谁在进入目录前控制范围**。

直接前序[Node 文件收集后端选型](./compare-node-file-collection-backends.md)比较了 filesystem
后端，本轮补充 Git 原生 fixture 和责任边界。

取证开始时的后端 Draft 采用 fast-glob 替换 filesystem walker，保留 Git 枚举；同轮讨论后，
[该 Draft](../../changes/switch-project-file-collection-backend/design.md)改为评估统一收集与可选文件事实。
职责拆分仍是设计候选，尚未成为产品行为或长期决策。

## 调查目的

1. 识别 fast-glob、纯路径 matcher 和 Git 原生命令各自能承担的职责。
2. 解释最终排除正确、范围外子仓库却仍被访问的执行顺序。
3. 比较修补现有 Git 来源与收缩为 filesystem 收集加可选 Git 事实，列出采用条件。

## 调查范围与依据

资料与 fixture 于 2026-10-08 取得，源码 HEAD 为 `d266937d0c3e76dfeeee87f7b0901316e162dea3`。
后续讨论补查 ignore/status、文件读取规则及现有 change flags；产品代码与依赖保持不变。

| 依据 | 实际动作与覆盖 |
| --- | --- |
| fast-glob 3.3.3 / micromatch 4.0.8 | 读取固定版本官方 API、filters 与 grammar；确认源码责任，尚未安装或接入。 |
| Git 2.53.0 | 读取官方文档与源码；Linux / Node 24.18.0 隔离 fixture 执行八组查询，原脚本和 JSON 留存。 |
| 当前 collector | 通过 CodeGraph 定位并读取 [collection](../../src/package-checks/project-files/collection.ts)、[submodule collector](../../src/package-checks/project-files/revision-worktree-files.ts)及相关 helpers，核对 include/exclude 顺序。 |
| Product 子树 trace | 主代理执行 root/child/nested fixture 两次；保存条件和聚合结果，原 wrapper 与 fixture 已清理。 |
| 能力拆分 | 核对[公开收集契约](../guides/collecting-project-files.md)、[内部 owner](../development/project-files.md)、[change flags](../api-mechanics.md#按文件变化选择-check)、[secret 读取规则](../checks/secret-detection.md)及仓库 Gate 默认。 |

Git probe 只写独占临时 fixture 的本地 index/commit/gitlink，结束后删除并确认目录不存在。
独立审阅者重跑的八项观察与留存 JSON 全等。Node 版本仅限定该 probe，不代表在 Node 上运行过 fast-glob。

固定版本来源与接入风险集中在随附说明中；八组命令、原始结果与 Product trace 可进一步复核。
本轮直接证明了能力和执行路径，性能收益、权限反例及实际库接入仍需实施证据。

## 调查结果与边界

### 已确认的能力边界

**fast-glob 可以承担 filesystem glob 扫描；Git 已原生提供 index、标准 ignore 和状态查询。
二者的能力边界允许薄适配，也允许进一步收缩产品范围，均不要求重写 Git。**

- fast-glob 提供同步遍历、task base 和下沉 filters；共同纯路径匹配可由显式 micromatch 承担。
  fast-glob 本身没有公开纯 path-list matcher，也不解释 Git index 或标准 ignore 文件。
- 当前 Git 来源通过 `ls-files --cached --others --exclude-standard` 取得 tracked 与可见 untracked，
  再自行处理安全初始化的子仓库。当前 Product selection 没有“只选 tracked”的公开选项。
- 当前 filesystem 默认按普通文件与显式 glob 收集，独立于 Git ignore，且不跟随 symlink。
  提供默认 selection 的随包 Check 及本仓库质量 Gate 默认均为 filesystem；secret detection 的 files
  要求显式给出。外部用户的 Git 来源使用情况未知。

原生 Git 实测保留以下取舍依据：

| 查询 | 观察及含义 |
| --- | --- |
| root cached + others + exclude-standard | 包含 tracked、可见 untracked、dot/newline paths；标准 ignore 仅排除 untracked；child gitlink 不展开为 child files。 |
| cached + recurse-submodules | 得到 child tracked，但没有 child untracked。 |
| 上述 union 加 recurse-submodules | exit 128，unsupported mode；原生递归无法直接满足当前 union 义务。 |
| child 单独执行 union | 得到 child tracked/untracked，应用该 child 的标准 ignore。 |
| union 加 --exclude=src/tracked.ts | tracked 保留；这个选项不是通用文件排除器。 |
| union 加 exclude literal pathspec | tracked 可被排除，说明原生 Git 也有候选过滤能力。 |
| brace glob / 分别传 ts、tsx pathspec | `:(glob)src/**/*.{ts,tsx}` 成功空；拆成两条后匹配文件。Product glob 与 Git pathspec 不能直接等同。 |

### 排除子仓库的缺口在进入前

当前 root collector 只把 include 并集传入子仓库 collector。它先对 HEAD gitlink 做
stat/realpath 和 child `rev-parse --show-toplevel`，再执行 child 枚举、revision/gitlink 检查与递归；
include 和最终 exclude 都在获取候选后生效。

对 `include: ["**/*.ts"]`、`exclude: ["**/vendor/**"]`，两个 trace 均返回
`["src/kept.ts"]`，每次仍有 **11 个 Git 调用，其中被排除子树 8 个**。
插桩 wall 38.73 / 31.14 ms 只记录执行路径，尚无 before/after 性能结论。

若保留当前 Git 来源，修补顺序应为：

1. 检查 root 来源并取得 gitlink metadata，建立 project-root-relative prefix。
2. 判断整个子树对全部同源 selections 是否均无需求。
3. 只有仍可能需要时，才 inspection、进入子仓库并执行 Git。
4. 用完整 matcher 形成各 selection 的稳定结果。

剪枝采用已证明覆盖整个子树的规则；复杂模式无法证明时继续下沉。任一 selection 仍需要子树，
就不能剪掉；目录名本身未匹配 file include，不足以证明后代没有匹配。

### 后续收敛：统一收集，按需保留独立事实

**建议方向，尚未采用：filesystem 拥有路径收集；忽略规则、Git 追踪/变更查询按需求组合，
内容读取继续由 owning Check 负责。**能力拆分比保留两套完整递归 acquisition 更贴近用户提出的核心需求。

| 能力 | 独立价值 | 需要确定的边界 |
| --- | --- | --- |
| 忽略文件 | 复用项目已有排除规则，减少配置和遍历。 | 文件来源、规则 grammar，以及 tracked 是否享有例外。 |
| tracked / untracked | 仅 tracked 控制版本管理范围；包含 untracked 能在 git add 前检查新文件。 | 是否需要选择或仅观察；Git 仓库范围与失败处理。 |
| 变更事实 | 触发相关 Check，或明确选择增量输入。 | 相对哪个 baseline、staged/unstaged，以及新增、删除、重命名。 |
| symlink 策略 | 明确列出链接条目或读取其目标。 | 收集与读取授权分别决定，目录链接和文件链接分别评估。 |

采用这一路径前，应闭合以下语义：

- **ignore 与 tracked 有优先关系。** Git ignore 包含 `!`、顺序和按文件位置解释的规则；
  已 tracked 文件不受其影响。通用扫描 ignore 对所有候选生效也合理，但属于不同策略。
  若保留 tracked 例外，应在剪枝前获知相关事实，不能先忽略整棵目录再补状态。
- **状态查询按需批量执行。** Git index/status 仍有原生事实源；取消 Git 枚举不等于取消这些查询。
  子仓库查询范围需显式界定，未知或失败不解释为 untracked/unchanged。
- **变更触发与增量输入不同。** 当前 `changes` 会汇总 committed/staged/unstaged/untracked paths，
  用 region 派生 flags，只发布命中的 path/flags。可先复用已有机制，再评估其覆盖；
  它不是完整 status API，也不自动把随包 Check 的输入改成 changed-only。删除路径的变更事实独立于现存文件。
- **链接条目与目标内容不同。** 普通文件读取通常会跟随链接；`readlink` 取得的是目标路径字符串。
  跳过、保留条目、读取目标可作为候选策略，读取目标时明确断链、越界、循环和重复；
  收集选项不能绕过 Check 自己的安全规则，例如 secret detection 的身份校验与 no-follow。
- **迁移保持显式。** 取消 `git-worktree` 会改变已有配置与 ignore/子仓库/链接语义，
  需要替代[显式双来源决策](../decisions/select-check-files-from-explicit-sources.md)并给出迁移说明，
  而不是把旧配置悄悄映射成另一来源。

这些是本轮形成的设计建议，不是新公共字段或已确认的实现计划。纯 membership 继续只计算显式路径关系；
文件收集和状态获取不因此进入其无 I/O 边界。

### 验证状态与下一步

原生 Git 八组 assertions 及独立复核通过，Product trace 和当前源码支持下沉前排除缺口。
fast-glob 仅完成固定版本源码核对；其 root/task base、静态 include、symlink base、
ENOENT 和范围内错误策略仍需实际接入验证。Git exit 0 acquisition warning 的严格策略也待权限反例验证。

下一步先选择产品范围，再开展对应验收：

- **保留 Git 来源：**证明 excluded child 在 inspection 前被跳过，覆盖 nested prefix、
  多 selection、include 无需求、untracked/ignore、独立仓库与循环保护。
- **收缩为 filesystem 加可选事实：**确认 ignore/tracked 优先级、Git 查询范围和 unavailable，
  明确变更 baseline、链接政策及旧 source 配置迁移。
- **共同边界：**保持按需收集、完整结果与可信失败；验证范围剪枝、空 include、稳定路径、
  支持宿主和 owning Check 的 exact inputs。性能结论使用同一真实 workload 的 before/after。

本轮取证未改变源码和依赖；后续产品范围、接入验收和迁移由
[收集 Draft](../../changes/switch-project-file-collection-backend/proposal.md)承接。

## 随附资源

- [固定版本能力来源、规则差异与接入风险](./_resources/261008-fast-glob-git-collection-boundaries/collection-policy-and-integration-notes.md)
- [原生 Git 命令与实际观察](./_resources/261008-fast-glob-git-collection-boundaries/native-git-observations.json)
- [隔离原生 Git 调查脚本](./_resources/261008-fast-glob-git-collection-boundaries/native-git-probe.mjs)
- [Product 排除子树 trace 的条件与结果](./_resources/261008-fast-glob-git-collection-boundaries/product-excluded-subtree-observation.md)
