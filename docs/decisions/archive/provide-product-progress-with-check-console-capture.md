---
title: 由 Product progress 捕获并结算 Check console 输出
status: archived
alignment: aligned
createdAt: 2026-08-31T09:23:57Z
purpose: 保持 Product-owned Check progress 的一致生命周期，同时让普通 console logging 不再破坏受管 TTY region。
background: Check 与 progress 在同一 runtime 中执行；禁止直接 console 只能依赖作者自律，实际调用会使 running row 被清除或留下错误状态。
decision: 用异步上下文隔离的临时 console router 捕获 awaited Check 调用，并在 settlement 作为受管 messages 呈现和返回。
tags:
  - product-contract
relations:
  - type: 修订
    target: provide-product-owned-check-progress.md
---

## 目的

- 让启用默认 progress 的 package consumer 继续获得一致的 prepared、running、settled 与 final lifecycle feedback。
- 让 Check author 使用常见 `console.*` 时不再破坏 TTY cursor state，并让内容可从终态输出与 `RunResult` 读取。
- 保持并发归属、输出失败隔离、Check facts 和高容量诊断责任清晰。

## 背景

- Product 已拥有 Check lifecycle、settlement 顺序、progress target stream 与 `RunResult.checkMessages`，最适合决定何时安全呈现一项 Check 的 console 文本。
- Check callback 和 Product progress 在调用方 Bun runtime 内并发；任意 console write 插入动态 running region 后，后续 cursor erase 会覆盖日志或留下 stale running row。
- 只要求作者返回 messages 或关闭 progress 不能保护第三方 Check、既有 console logging 或间接调用的库。
- 全局 console 是共享对象；按 callback 临时替换而没有 async context 会把并发 Check、host logging 和并行 Run 相互混合。
- 直接 process streams、child-process 大量输出、floating work 和预先保存的 console method reference 不能仅靠 global-console routing 获得可靠 Check 归属。

## 决策

- 采用: Product 继续用 package-private lifecycle feedback 驱动 TTY/plain progress、canonical completion ordinal、monotonic duration 与 final summary；progress failure 只失败该 output，不改写 Check/Record facts。
- 采用: 每次 awaited Check preflight 或 execution 建立独立异步 capture context；存在 capture 时临时路由当前 global console 的 callable methods，context 内写入 Check-local buffer，context 外委托安装时的 host method，并在最后一个 capture 结束后恢复原 descriptors。
- 采用: 并发 capture 共用 router 但不共享 buffer。每项 console call 用非彩色 Console semantics 格式化，再以 `console-<method>` code 和 `info | warning | error` level 转为 settlement-time message；renderer 先安全清除 running region，再连续写 settled block。
- 采用: preflight console、accepted preflight author messages、execution console、accepted terminal author messages 按此顺序进入 owning Check feedback；已捕获 console 在 callback throw、取消或 malformed author result 后仍保留，非法 author attachment 仍不接受部分内容。
- 采用: captured console 与 accepted author messages 一起保留在 final-snapshot `RunResult.checkMessages`，但不进入 CheckOutcome、Records、Check facts、dependency、aggregation 或 machine publication。
- 采用: attention visibility 只有在 passed 且既无 author message 也无 captured console 时隐藏 settled row；plain/dumb output 继续只追加 settled feedback。
- 采用: 捕获只保证通过当前 global console 发起且属于 callback awaited async work 的调用。直接 stdout/stderr、pre-bound method、global console replacement、floating work 和高容量/child-process output 必须使用 Check-owned sink 或 transcript。
- 不采用: 公共 live logger/observer、Check 可写 progress stream、process stream monkey-patch、per-Check worker isolation，或把 console 文本提升为质量事实。
