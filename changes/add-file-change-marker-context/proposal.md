# Proposal

本 Draft 为 package 设计 opt-in 的文件变更标记 provider Check 与 execution wrapper，并先收敛 source、baseline 和性能证据后再进入 Plan。

## Why

多个 Check 分别读取文件系统或 Git 会重复 I/O，也会让每个 consumer 重复实现变更规范化、marker 匹配、dependency read 与 parser 错误处理。

把 changed files 放进 Run Controls 或所有 callback context 会制造没有统一 source/baseline 语义的侵入式公共契约。即使改用 typed provider，consumer 直接扫描大型 changes 数组仍可能把解析和查询成本乘以 dependent 数量。因此，本 Change 需要同时建立稳定查询抽象和先测量后选索引的实施路径。

## Outcome

本 Change 完成后，package consumer 可用显式 source、baseline 和 marker rules 构造 ordinary provider Check，并用普通 execution wrapper 自动读取、解析 provider facts，取得冻结的 `change` 查询工具。Provider 的 versioned canonical data 是唯一可发布事实，内部索引保持私有且由可复现 baseline 决定；现有 Core、Run Controls、preflight、dependency authorization 与 aggregation 不被改写。
