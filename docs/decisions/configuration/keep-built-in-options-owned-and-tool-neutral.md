---
title: 保持内置 Check options 受 descriptor owner 约束且工具中立
status: archived
alignment: aligned
createdAt: 2026-08-14T13:50:47Z
purpose: 让 exported built-in Check descriptor 支持可类型化的项目级调整，而不把 scanner 私有实现、通用深合并或第二份质量配置暴露给项目。
background: 内置 Check 的可调整语义因能力不同；任意 options record 或 generic deep merge 会让未知字段、数组和工具参数在没有 owner 的情况下进入长期配置契约。
decision: 内置 descriptor 提供完整 typed defaults；项目显式 spread，project-wide quality 留在顶层。
relations: []
---

## 目的

- 让项目能从 exported built-in descriptor 继承默认语义，并只在该 descriptor 明确允许的范围内覆写或追加 options。
- 保持 quality policy、scanner implementation 与 Check tree authoring 各自只有一个 owner，避免配置重叠和不可解释的合并行为。

## 背景

- duplicate detection、file metrics 与 function metrics 的公开可调语义不同，单一开放 options map 无法可靠表达每个字段的 type、default、覆写或追加规则。
- project-wide code areas、文件范围、generated-file classification、report presentation 与跨 Check shared input 已有顶层 quality/policy owner；built-in-specific thresholds 当前混在该 owner 下，需要移入对应 descriptor，而不是在两处保留副本。
- scanner command、arguments、adapter、exit mapping、平台探测和 execution binding 是 Product private operational concern，不能因 descriptor 可组合而成为 project policy。

## 决策

- 采用: 每个 exported built-in descriptor owner 定义其自身完整的 public typed default options 与合法 nested fields；Project Definition validation 只接受该 descriptor 已声明的完整形状。
- 采用: 项目通过普通 TypeScript object/array spread 显式继承 defaults、覆写 scalar/object fields 或追加 collection fields；runtime 不对 descriptor options 执行隐式 inheritance、generic deep merge 或数组拼接。
- 采用: project-wide quality configuration、DecisionPolicy、effects、scheduler 和 operational dependency defaults 继续保留各自顶层 owner；built-in leaf options 不复制、覆盖或竞争这些全局语义来源。
- 采用: 内置 descriptor 的 stable Check identity、record type surface、private binding 与 scanner dependency semantics 不可由 project options 改写。外部 executable location 仍只经既定 operational dependency precedence 绑定。
- 不采用: `Record<string, unknown>` options、scanner-native command/flag/exit-code fields、built-in 同名 custom override、未声明数组拼接规则，或把 project-wide quality 的局部副本嵌入 Check tree。
