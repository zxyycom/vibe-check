---
title: 默认展示有界且安全的 Finding 摘要
status: active
alignment: aligned
createdAt: 2026-08-31T07:11:25Z
purpose: 让少量 Finding 直接出现在 Check 终态输出中，同时保持大量或敏感明细的受控边界。
background: 当前随包 Check 只显示 Finding 数量，维护者必须另行读取 Records 才能定位普通问题。
decision: 由 producing Check 默认展示至多十条安全摘要，超限时报告剩余数量，完整事实仍由 Records 拥有。
tags:
  - product-contract
relations: []
---

## 目的

- 让普通 consumer 在 Finding 数量较少时直接从已有 progress rendering 看见可行动的路径、位置、指标或原因，不必先打开 machine artifacts。
- 让大量 Finding 不淹没 Check lifecycle 与最终汇总，并让完整、可程序化的事实继续由 final data 与 Records 承接。
- 保持 finding settlement、Run aggregation、machine publication 与人读 presentation 的现有责任分层。

## 背景

- 当前随包质量 Check 的 terminal message 只给出 Finding 数量并要求读取 Records；这不是“默认折叠”，而是终端完全没有明细投影。
- Generic Record data 由 producing Check 拥有，既不都表示 Finding，也没有统一的路径、位置、级别或 message 字段；通用 progress renderer 无法安全推断其含义。
- CheckMessage 已由 producing Check 在 settlement 时安全附带，并由 progress rendering 和 `RunResult.checkMessages` 消费；复用该边界不需要新增 observer、Record renderer 或 Gate-specific 归约器。
- 终端输出没有可移植的交互展开协议。大量明细必须以有界摘要和完整 Records 的组合表达，而不是伪装成可再次展开的 UI 节点。

## 决策

- 采用: 能形成普通 Finding 的随包 Check 由各自 owner 从已验证、稳定排序的 Finding 候选生成安全摘要；默认在原有数量/处置消息之后展示最多十条摘要，零 Finding 不增加输出。
- 采用: 超过十条时再附加一条省略消息，精确说明尚有多少条未显示并引导读取 owning Check 的 Records；终端不声称提供交互式展开。完整 Finding 集合、identity 与领域 data 继续只由 final data 和 Records 拥有。
- 采用: 摘要只使用 producing Check 已确认可安全显示的 project-relative path、行列、函数名、指标、阈值和封闭 reason；不得复制绝对路径、raw link destination、remote response、命令或 scanner output、credential、stack 或其它未审查材料。
- 采用: Finding 的 blocking/non-blocking 处置决定摘要等级；waived 或其它非 actionable Finding 可以使用 info。摘要格式和 code 由 owning Check 负责，公共 Product 不建立 Finding 字段目录或跨 Check formatter。
- 采用: Generic progress rendering 仍只呈现 Check messages，不读取或解释 Records；custom Check 是否提供同类摘要继续由 author 决定。该展示不改变 Check status、Record publication、explicit aggregation、Gate exit 或 machine v4。
- 不采用: 默认打印全部 Records、由 Gate 或 progress 按 Check ID 猜测 Record shape、把摘要写回 Record data、增加通用 Finding contract，或用任意终端控制序列模拟不可移植的折叠交互。
