---
title: 以面向用户的数据契约完成可选工具隔离
id: 260912-provide-public-data-boundaries-for-tool-isolation
status: active
alignment: aligned
createdAt: 2026-09-12T09:22:19Z
purpose: 让外部用户与随包工具通过同一公开数据契约复用单份实现。
background: 可选工具仍使用 Core 私有数据能力，目录迁移不能靠私有例外或复制算法完成。
decision: 公开最小可独立使用的数据能力，保留 Core owner，并将三个可选工具纳入统一边界。
tags:
  - dependency-policy
  - product-contract
relations: []
---

## 目的

让外部用户无需实例化 Check、Definition 或 Run，即可从 package root 使用 canonical JSON 与安全快照能力；可选随包工具通过同一契约复用单份实现，完整进入统一依赖边界。

## 背景

两向依赖门禁和首批两个工具已经实施，但 cache、waiver、learned 仍使用 Core 私有数据能力。Core 不依赖这三个具体工具，现有出向耦合是需要清理的实现问题，不应成为排除其 Non-core 身份的理由。

共同数据能力同时服务 Core 与工具，不能迁入可选工具层令 Core 反向依赖工具，也不能通过重复算法或私有例外完成隔离。用户允许新增公开 API，要求外部用户也能实际使用；首版可以保持小范围，后续再完善更丰富的用户方案。

## 决策

- 采用: 公开最小、可被外部用户独立调用的数据契约，以真实的 canonical JSON materialization、确定性序列化和闭合配置快照任务审查公开面；不机械公开整个私有模块，不要求用户掌握内部工具接线。
- 采用: 公开能力仍由现有 Core 数据边界拥有，Core 与工具复用单份实现；工具从定义处具名导入具有 package-root 公开身份的符号，不增加 deep-import API、兼容 wrapper 或私有白名单。
- 采用: cache、waiver、learned 及仅供其使用的支撑实现进入 `src/package-tools/`，保持既有行为和 API 兼容。Core 所需基础与真正 Core tools 保留其机制 owner。
- 采用: 首版公开必须具备可理解的名称、完整类型、中文契约、最小独立使用示例，以及 installed consumer 的类型和运行时证据；更完整的应用方案可以后续演进，但当前失败、安全与数据语义不能留给未来解释。
- 采用: [两向目录规则](keep-core-independent-of-package-tools.md)继续拥有依赖方向；本判断单独拥有新增公开数据面与工具隔离所需的复用选择，不以首批两个工具或其旧 Gate 证据宣称本方向已经落实。
