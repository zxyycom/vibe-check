---
title: 从显式来源选择 Check 文件
status: active
alignment: aligned
createdAt: 2026-08-28T11:14:37Z
purpose: 让读取文件的 Check 以稳定 source 和 include/exclude 完整表达候选文件与过滤规则，并在 owning Check 内复用同源枚举。
background: 当前三字段选择重复表达排除语义，Git 成功与失败还会让同一配置隐式切换候选来源。
decision: 文件选择使用 source/include/exclude；filesystem 与 git-worktree 均为显式来源且失败时停止，同一 Check 对每种来源至多枚举一次。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: let-each-check-own-file-selection.md
---

## 目的

- 让调用方从一个 Check-owned 文件选择值恢复候选来源、包含规则、排除规则和失败语义。
- 让相同文件选择在 Git 与非 Git 环境中不再因隐式回退得到不同结果。
- 让基于 area 的 Check 复用一次候选枚举，同时保持 exact inputs、阈值和领域结果由 owning Check 拥有。

## 背景

- 既有 selection 将 `include`、目录 segment 排除和 generated glob 排除作为三个公共数组，但后两者都只参与排除；filesystem 遍历剪枝属于内部实现要求。
- 既有文件收集先运行解释标准 ignore 规则的 `git ls-files`，成功空集合被视为权威，命令失败才遍历 filesystem。同一 selection 因 Git 可用性与 `.gitignore` 产生不同候选集合。
- 三个 metric Checks 分别为每个 code area 调用完整候选收集；repository quality 的重复 area 已证明 owning Check 内存在真实的多 selection 复用需求。
- Direct dependency final data 会成为正式 Check facts；用隐式 provider Check 传递完整路径会增加身份、aggregation、machine output 与路径暴露，并不能自动解决跨 constructor 去重。

## 决策

- 采用: 完整 `ProjectFileSelection` 恰为 `{ source, include, exclude }`。constructor input 可省略三个字段并补齐 package defaults；旧 `excludeDirs`、`generatedFiles` 或缺失 resolved source 直接拒绝，不提供 alias、双读或兼容期。
- 采用: `source` 只能是 `filesystem` 或 `git-worktree`，省略时默认 `filesystem`。filesystem 枚举 project root 下的普通文件，不跟随 symlink，也不解释 `.gitignore`；`git-worktree` 枚举已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件，并包含可安全下沉的已初始化 submodule worktree 文件，不把 gitlink 目录本身作为文件候选。
- 采用: 两种来源都在失败时停止。filesystem 目录读取失败，或 git-worktree command、repository、gitlink inspection 失败，都会使 owning Check unavailable；不得静默切换成另一来源。合法空候选与来源失败保持不同结果。
- 采用: `include` 与 `exclude` 都按相对项目根目录且使用 `/` 的路径，以同一 glob grammar 匹配；路径必须匹配 include 且不匹配 exclude，exclude 优先。目录剪枝可以从规则安全派生，但不改变最终 glob 语义。
- 采用: project-files owner 将候选枚举与命名选择过滤分开。一个基于 area 的 Check 按 source 对全部 area 分组，每种来源至多枚举一次，再从同一个稳定候选快照形成冻结、稳定排序的 area paths。
- 采用: 不增加 Product-wide file context、隐式 file provider Check、跨 Check hidden cache 或 source 自动探测。项目仍可用普通 TypeScript value 复用 selection；只有未来证据证明跨 Check 运算复用值得发布路径 facts 时再单独设计显式 provider。
