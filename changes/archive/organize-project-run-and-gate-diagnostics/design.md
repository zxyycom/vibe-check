# Design

本设计按事实 owner 和主要读者分层组织同一次 invocation 的诊断材料，同时保持 Product、Gate、machine publication 与 process adapter 的既有职责。

## Context

Product diagnostic logging 已在真实 core facts 形成位置连续观察 planning、preflight、scheduler、Check lifecycle、dependency、Record、aggregation 和 closure；它是一次性人工诊断文本，不是 machine contract。Project Gate 另在 Product Run 外拥有 candidate preparation、selection、afterGate performance observation、最终结果和 exit mapping。标准 machine v4 继续以 `run.json` 与 `records.ndjson` 发布可信终态和 Records；process adapter 独占 child command/stdout/stderr transcript。

用户已确认：高频结构使用独立 `[]` 标签便于筛选；process transcripts 必须进入 invocation 子目录。当前工作树在本 Change 建立前干净，Test Evidence 基线为 266 个 Bun entities、80 个 Cases，完整闭合通过。

## Goals / Non-Goals

目标是让 core 时间线可直接扫描和筛选、让 Gate 外层运行过程在 invocation 内闭合、让根目录按事实层级清晰分组，并保留所有已选择的 Scheduler decision 与 Record observation。

非目标包括新增公共 logger/observer、改变 Check contract、建立日志 schema/parser/version、将 diagnostic text 纳入 machine v4、增加质量专用报告、创建跨 invocation index/retention、兼容双写旧 process transcript 路径，或把 child process 原始输出复制进 core/Gate summary。

## Decisions

### Intended Change

1. Product-private observation 继续由事实 owner 产生，但显式携带可筛选 component/status tags；logger 统一负责安全转义、序号、单调 elapsed、inline facts 与长值续行。标签只承载 component、Check、phase、decision/outcome 等稳定阅读轴，动态数量和原因继续使用 `key=value`；Scheduler decision 的顶层 `kind` / `taskId` 与 Record observation 的顶层 `result` 已由标签表达时不在渲染 facts 中重复。
2. 普通事件以单条主行写入。descriptor-safe 的顶层 primitive/短数组 facts 内联；Record data、消息、异常 raw value 等嵌套或长值使用带 key 的缩进续行。Scheduler owner 将 typed decision 投影为紧凑但信息完整的 capacity、blockers、trigger 和 reservation facts，不丢弃任何 decision。
3. Gate 在 candidate preparation、import 和 exact entry identity 检查完成后建立 invocation directory，再进入一个作用域明确的 transcript 生命周期，同时 tee Gate console 与 direct stdout/stderr 到原 terminal writer 与 `gate.log`。文件侧移除 TTY presentation control sequences，并在终端结果形成后写入 exit mapping；directory 已建立但 transcript setup 失败时显示该 directory 且不启动 Product Run，无 invocation 的 help、argument、candidate preparation/import failure 不虚构日志目录。
4. Process adapter 的唯一 transcript path 改为 `process/<check-id>.log`，目录由同一 adapter 在写 running evidence 时创建。相关消息和 Record 使用同一个 invocation-relative reference，不暴露绝对路径 contract。
5. `run.json`、`records.ndjson` 与 Product core log 留在 invocation 根；`gate.log` 只保存外层人读过程，不解析或归约 machine facts，也不增加 `gate-result.json`。

### Resulting Impacts

- Diagnostic logger 的安全渲染界限继续适用于 tags、facts 和续行，不能触发 accessor、`toJSON`、Proxy 或其它 author hooks；output failure 仍由既有 Product output status 承接。
- Gate transcript 对 process-wide console/stdout/stderr 的临时接管必须封装在单一生命周期 owner 中，通过 `try/finally` 恢复原 descriptor，并用目标测试证明终端 tee、stream 区分、控制序列清理、exit 写入和失败映射。
- 测试正文变化必须复核并更新现有 runtime diagnostic 与 Project Gate Cases；新增独立 Gate transcript 目的时才新增 Case，不按 helper 或文件数量拆 Case。
- 文档只说明当前人读布局和责任边界，不把格式示例提升为稳定语法，也不从归档 Change 恢复旧计划内容。

## Risks / Trade-offs

- 过多 `[]` 会形成新的视觉噪声，因此每行只把常用过滤轴放入标签，普通 facts 不加括号。
- Gate 捕获 console/process streams 是 process-wide 副作用；它只允许存在于单次 root Gate invocation 的显式作用域，测试注入和恢复必须阻止泄漏到其它调用。
- TTY progress 的原始 cursor update 不适合作为文件内容；`gate.log` 优先保存可读 plain transcript，而终端继续保留原 TTY 呈现，因此文件不是逐 byte 镜像。
- Process transcript 路径发生硬切；项目未承诺该一次性布局的兼容读取，避免双写带来的重复证据和根目录噪声。

## Open Questions

无。标签范围、Gate transcript、process 子目录和不增加额外 Gate machine 文件均已确认。
