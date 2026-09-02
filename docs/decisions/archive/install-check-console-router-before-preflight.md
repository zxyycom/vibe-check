---
title: 在 Check preflight 前一次安装 console router
status: archived
alignment: aligned
createdAt: 2026-08-31T09:53:01Z
purpose: 让一轮 resolved Check execution 在任何 author work 前建立唯一 console 路由，同时保持每项 Check 的异步归属隔离。
background: 按单个 callback 获取和释放全局路由会在 preflight 与 execution 之间反复改写 console，无法直接呈现整轮执行的资源生命周期。
decision: 静态 graph 校验后、任何 author preflight 或 execution 前安装一次路由，全部 Check 闭合后恢复，并用独立异步 context 隔离每项调用。
tags:
  - product-contract
relations:
  - type: 修订
    target: provide-product-progress-with-check-console-capture.md
---

## 目的

- 让启用默认 progress 的 package consumer 继续获得一致的 prepared、running、settled 与 final lifecycle feedback。
- 在任何 author Check work 前建立一次 console routing 边界，避免 preflight 与 execution 之间反复改写全局方法。
- 让 Check author 使用常见 `console.*` 时不破坏 TTY cursor state，并让内容可从终态输出与 `RunResult` 读取。
- 保持并发归属、host logging、输出失败隔离、Check facts 和高容量诊断责任清晰。

## 背景

- Product 已拥有 resolved Check execution、settlement 顺序、progress target stream 与 `RunResult.checkMessages`，能够覆盖完整 preflight barrier 和后续 Task execution。
- Check callback 和 Product progress 在调用方 Bun runtime 内并发；任意 console write 插入动态 running region 后，后续 cursor erase 会覆盖日志或留下 stale running row。
- 只要求作者返回 messages 或关闭 progress 不能保护第三方 Check、既有 console logging 或间接调用的库。
- 全局 console 是共享对象；按单个 callback 安装和恢复路由会在阶段之间反复改写方法，也不能直接表达“一轮 resolved Check execution 拥有一个路由”的资源不变量。
- 直接 process streams、child-process 大量输出、floating work 和预先保存的 console method reference 不能仅靠 global-console routing 获得可靠 Check 归属。

## 决策

- 采用: Product 先校验静态 Check graph，再在任何 author preflight 或 execution 前安装一次 global console router；router 贯穿完整 preflight barrier 与 Task execution，在全部 resolved Checks 闭合后恢复原 method descriptors。
- 采用: 每次 awaited Check preflight 或 execution 只建立独立异步 capture context。context 内写入 Check-local buffer；context 外委托安装时的 host method；并发 context 共用 router 但不共享 buffer。
- 采用: 重叠的 Run 各自拥有 router lifecycle，最早开始的 owner 安装方法，最后结束的 owner 恢复方法，避免一个 Run 提前拆除另一个 Run 仍在使用的路由。
- 采用: 每项 console call 用非彩色 Console semantics 格式化，再以 `console-<method>` code 和 `info | warning | error` level 转为 settlement-time message；renderer 先安全清除 running region，再连续写 settled block。
- 采用: preflight console、accepted preflight author messages、execution console、accepted terminal author messages 按此顺序进入 owning Check feedback；已捕获 console 在 callback throw、取消或 malformed author result 后仍保留，非法 author attachment 仍不接受部分内容。
- 采用: captured console 与 accepted author messages 一起保留在 final-snapshot `RunResult.checkMessages`，但不进入 CheckOutcome、Records、Check facts、dependency、aggregation 或 machine publication。
- 采用: attention visibility 只有在 passed 且既无 author message 也无 captured console 时隐藏 settled row；plain/dumb output 继续只追加 settled feedback。
- 采用: 捕获只保证通过当前 global console 发起且属于 callback awaited async work 的调用。直接 stdout/stderr、pre-bound method、global console replacement、floating work 和高容量或 child-process output 必须使用 Check-owned sink 或 transcript。
- 不采用: 公共 live logger/observer、Check 可写 progress stream、process stream monkey-patch、per-Check worker isolation，或把 console 文本提升为质量事实。
