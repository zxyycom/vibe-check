---
title: "Lizard 上游正式版本与发布线差异核验"
formedAt: "2026-09-03T01:08:31Z"
question: "截至 2026-09-03，Lizard 相对 Vibe Check 锁定的 1.23.0 的最新正式版本、实质更新、通常发布线及该线 HEAD 相对最新 release tag 的精确提交差分别是什么？"
tags:
  - "dependency-upgrades"
  - "function-metrics"
  - "lizard"
  - "release-provenance"
  - "upstream-release"
relations:
  - type: "补充"
    target: "compare-lizard-and-scc-typescript-port-priority.md"
---

## 形成时背景

Vibe Check 的 source-aligned port 当前以 Lizard `1.23.0` 为 baseline；其官方 tag 指向 commit [`06284ec87c1966fee4ddbf3f068ccf89b987b0f8`](https://github.com/terryyin/lizard/commit/06284ec87c1966fee4ddbf3f068ccf89b987b0f8)。用户需要截至本轮形成时的上游版本状态，以及“latest”相对该 baseline 的实质变更和未发布 `master` 增量，而不是笼统地知道存在更新。

本报告直接**补充** [`compare-lizard-and-scc-typescript-port-priority.md`](./compare-lizard-and-scc-typescript-port-priority.md)：前序报告以 Lizard/SCC 迁移优先级为问题，并记录形成时 `1.24.0` 已超过 `1.23.0`。本轮新增可复核的 release workflow、近期 tag ancestry、PyPI 上传和 `tag..master` 计量；它没有重新裁决前序的迁移结论，故不是“复查”。

**使用边界。** 本文只保存 `2026-09-03T01:08:02Z` 获取上游 refs 时的认识。上游 tag、release、分支与 PyPI 状态会变化；当前依赖版本、产品兼容性和升级授权仍分别由仓库的 current owner、Decision/Change owner 承接，不能由本报告替代。

## 调查目的

本轮只回答以下四项：

1. 最新**正式** Lizard 版本、release tag 与 source commit 是什么？
2. 它相对 Vibe Check 锁定的 `1.23.0` 有哪些会影响使用者或 port-parity 判断的实质变化？
3. 上游通常从哪条分支/提交链打包发布；workflow 对分支是否有硬性限制？
4. 该观察到的发布线当前 HEAD 相对最新 tag 多多少提交，并如何精确复核？

不评估 Vibe Check 是否应升级、是否应 port、未发布提交何时会发布，也不把 GitHub 分支惯例推断成维护者不可改变的发布承诺。

## 调查范围与依据

**检索时点与来源。** 在 `2026-09-03T01:08:02Z`，对官方仓库 `https://github.com/terryyin/lizard.git` 做只读 `git fetch --prune --tags origin`；临时 clone 在工作区外 `/tmp/lizard-upstream-investigation`，未向上游或 PyPI 写入。交叉读取官方 [PyPI JSON](https://pypi.org/pypi/lizard/json)、[PyPI 1.24.0 project page](https://pypi.org/project/lizard/1.24.0/)、[GitHub releases](https://github.com/terryyin/lizard/releases)、[`1.24.0` tag/release](https://github.com/terryyin/lizard/releases/tag/1.24.0)、[`1.24.0` 的 CHANGELOG](https://github.com/terryyin/lizard/blob/1.24.0/CHANGELOG.md)、[`1.24.0` release workflow](https://github.com/terryyin/lizard/blob/1.24.0/.github/workflows/release.yml) 和 [`master`](https://github.com/terryyin/lizard/tree/master)。这些均为项目或分发方的一手来源。

**版本与分发的比较方法。** PyPI JSON 的 `info.version` 为 `1.24.0`，`releases["1.24.0"]` 有 non-yanked wheel 与 sdist；其上传时间分别是 `2026-08-19T00:04:03.569245Z` 和 `2026-08-19T00:04:05.280448Z`。GitHub latest release 同为 `1.24.0`，`published_at=2026-08-19T00:03:37Z`、`prerelease=false`、`draft=false`、`target_commitish=master`。本地 refs 中 `git tag --list '[0-9]*.[0-9]*.[0-9]*' --sort=-version:refname | head -1` 也返回 `1.24.0`；`git rev-parse 1.24.0^{commit}` 返回 `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`。三种独立观察共同用于“最新正式版本”，而不是仅按网页排序下结论。

**发布线的比较方法。** 在 `1.24.0` 所含 workflow 中，`on.push.tags` 只匹配 `'[0-9]*.[0-9]*.[0-9]*'`；它 checkout tag ref、执行 `python -m build`，随后以 `pypa/gh-action-pypi-publish` 上传 PyPI，**没有** `branches:` filter。为避免把默认分支名当作发布事实，另核验了 GitHub release metadata 的 `target_commitish`（正式 releases `1.20.0`、`1.23.0`、`1.24.0` 均为 `master`），以及 `1.21.7`、`1.22.0`、`1.22.1`、`1.22.2`、`1.23.0`、`1.24.0` 六个近期 tag 的 branch containment：每个在这次 fetch 的远程分支中仅被 `origin/master`（及其 symbolic `origin/HEAD`）包含。`1.24.0` 本身是非 merge 的 “Release 1.24.0” commit，parent 为 `31e3014d434a584fb892989c99344e86abd1f421`。

**术语与计量口径。** 本文的“最新正式版本”仅指检索时同时有正式 PyPI 分发、GitHub 非 draft/non-prerelease release 与对应版本 tag 的 `1.24.0`，不包括 `master` 上未打 tag 的提交。“通常发布线”是从已观察的 release metadata、tag ancestry 与默认分支归纳出的惯例；workflow 的硬性触发条件另行说明，不能由该惯例替代。“`tag..HEAD` 提交差”固定以同次 fetch 后的 `1.24.0^{commit}..origin/master` 计数，方向是 tag 之后、尚未进入 tag 的候选发布线提交，而非下一正式版本的内容或承诺。

**提交差的精确复核。** 以 fetch 后 `origin/master`（默认分支）为候选发布线，而不是本地 checkout：

```text
git rev-parse 1.24.0^{commit} origin/master
# 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec
# 116eb410b199dea4ea36894165dfc0f1f0bbfe5a

git merge-base --is-ancestor 1.24.0^{commit} origin/master
# exit 0 (true)
git merge-base 1.24.0^{commit} origin/master
# 308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec

git rev-list --count 1.24.0^{commit}..origin/master
# 5
git rev-list --count origin/master..1.24.0^{commit}
# 0
```

tag 已先证明为候选发布线 HEAD 的祖先，故此计数不含分叉或反向提交。另以 `git rev-list --count 1.23.0^{commit}..1.24.0^{commit}` 得到 `34`，并以 `git diff --shortstat 1.23.0^{commit}..1.24.0^{commit}` 得到 `51 files changed, 4333 insertions(+), 1475 deletions(-)`。后者包括测试和上游开发文档，不能当作产品代码或 port 工作量。

## 调查结果与边界

### 已确认事实

| 问题 | 结果 | 证据与可复核值 |
| --- | --- | --- |
| 最新正式版本 | **`1.24.0`** | PyPI current version/non-yanked artifacts 与 GitHub latest non-prerelease release 一致；tag commit 是 [`308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`](https://github.com/terryyin/lizard/commit/308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec)。 |
| 相对项目 `1.23.0` | 版本号从 `1.23.0` 升至 `1.24.0`；tag range 为 34 commits、51 changed files（含测试/文档） | 基线 commit 是 [`06284ec87c1966fee4ddbf3f068ccf89b987b0f8`](https://github.com/terryyin/lizard/commit/06284ec87c1966fee4ddbf3f068ccf89b987b0f8)；完整范围见 [`1.23.0...1.24.0`](https://github.com/terryyin/lizard/compare/1.23.0...1.24.0)。 |
| 通常的发布线 | **观察到的常规发布线是 `master`，但 workflow 不强制它。** | 默认远程 HEAD 为 `origin/master`；GitHub releases 的三个正式 release 均 `target_commitish=master`，且六个近期 release tags 都仅被 fetched `origin/master` 包含。workflow 的硬条件只有 version-shaped tag push。 |
| 当前发布线增量 | `origin/master` HEAD [`116eb410b199dea4ea36894165dfc0f1f0bbfe5a`](https://github.com/terryyin/lizard/commit/116eb410b199dea4ea36894165dfc0f1f0bbfe5a) 比 `1.24.0` **领先 5 commits**；tag 反向领先 `0` | `1.24.0` 是该 HEAD 的祖先，merge-base 等于 tag commit；精确方向和命令见上节。HEAD commit date 为 `2026-08-29T02:05:01Z`（原 commit timestamp `2026-08-29T10:05:01+08:00`）。 |

### `1.24.0` 的实质更新（相对 `1.23.0`）

以下是官方 release notes/CHANGELOG 与 tag diff 共同支持的、比单纯提交标题更接近可观察行为的摘要：

- 增加 `-Ehalstead`：按函数给出 Halstead volume、difficulty 与 effort；同时 CSV 扩展字段的多列输出得到处理。这会扩展输出/扩展行为，不是 `functionMetrics` 当前只消费的既有核心 CCN/NLOC 契约。
- 增加 `--no-gitignore`，可使已发现文件不再因 `.gitignore` 被过滤；这改变 CLI 的候选文件选择路径。
- PHP reader 重做为 PHP-specific state machine，覆盖现代语法（classes/traits/visibility、constructor property promotion、match、arrow functions、union types、named arguments），并避免 null-coalescing/nullsafe operators 夸大 nesting depth；属于 parser/metric 语义的实质变化。
- Java 修正 static block 控制结构误报为方法、field initializer 中 anonymous class、`record` 在 field initializers **和 method declarations** 中的 contextual-keyword handling，以及 anonymous class 的 generic/qualified type handling；这些可影响函数识别和复杂度。
- **GoLike 共享 reader**修正带 `[...]` type parameters 的 generic functions 注册；该 reader 被 Go、Scala、Kotlin、Rust、Swift、Zig 与 Solidity 复用。Python 修正 f-string interpolation 内 control-flow 的计数；Objective-C 修正 block/function-pointer 参数中的嵌套括号；script reader 修正 trailing backslash 后 `#` comment 的延续。这些是各 reader 的分析正确性改动。

**未发布的 `master` 5 commits 不是 `1.24.0` 内容。** 它们的题面/差异指向 Python PEP 695 type-parameter function-name 修正、Kotlin expression-body/`when` 处理及 Rust `match` complexity 处理；截至检索时仍只能称为未打 tag 的上游提交，不能当作正式版本功能或保证下一版一定包含。

### 推断、未知与适用边界

- **推断：** 对“通常从哪条分支发布”的实际操作判断，`master` 是证据最强的候选发布线；近期 release metadata、tag containment 和默认分支均一致。
- **已知限制：** 该 workflow 接受任意匹配版本格式的 tag push，故无法由配置证明“只有 `master` 可以发布”。若维护者未来从别的 commit/branch 推 tag，workflow 仍可能打包该 tag 所指快照。
- **未知：** 没有维护者的正式 release policy 声明时，无法证明 `master` 是永久政策、下一版版本号/日期，或上述 5 commits 会完整进入下一个 PyPI release。
- **重新调查条件：** PyPI/GitHub 出现新正式 release、`master` 继续前进/重写、release workflow 的 tag或branch条件改变，或 Vibe Check 的 baseline 从 `1.23.0` 移动时，应在新的 UTC 时点重跑本报告所列 fetch、ancestry 和 range 命令。

本报告没有修改产品、锁定版本或上游仓库，也不授权升级或 port；它只给出形成时可复核的上游状态。
