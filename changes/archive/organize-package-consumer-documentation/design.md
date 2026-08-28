# Design

设计以 README 作为唯一导航和入门 owner，将稳定差异明确的 Check 指南与深入机制说明留在两个直接下钻层级。

## Context

- package 当前包含生成的 root README、`docs/checks/index.md` 和七份手写 Check 指南。
- README 示例和 source JSDoc examples 由 `scripts/docs/package-api/**` 从 allowlisted TypeScript source 投影。
- artifact build、staging/tar audit、installed candidate audit 与 external documentation consumer 都绑定 exact documentation material。
- active Decision `use-chinese-as-primary-language-for-public-documentation.md` 要求 package consumer prose 以中文叙述为主。
- 目标 consumer 包括在 Bun 项目中集成 installed candidate 的编码型 AI。它实际依次获得 root README、按需链接的唯一 API mechanics 文档或某一 Check 指南，以及 installed declarations；仓库构建流程与内部源码不应成为完成普通集成的隐含前提。

## Goals / Non-Goals

- 目标：让首次 reader 从 README 快速理解自定义 Check、Definition、Run、基础结果和内置能力入口。
- 目标：只保留一份进阶机制说明，并让七项 Check 各自拥有完整、直接可达的说明。
- 目标：保留生成、链接、清单、tarball、安装和示例执行证据。
- 目标：让 consumer 从实际随包文本准确恢复 root import、Check / Project Definition / Run 术语、API owner、执行顺序和两层结果语义。
- 非目标：改变 Product API、内置 Check 行为、package runtime layout、registry 发布状态或声明 JSDoc 参考边界。

## Decisions

### Intended Change

- README 保留 package 定位、当前可用性、包内结构、最小 Run、自定义 Check 与 effects、基础结果处理、内置 Check 简表和支持边界。
- README 直接列出七项 Check 文档链接，不通过中间 index。
- `docs/api-mechanics.md` 是唯一进阶文档，承载完整 preflight、typed dependency、Controls、outputs、aggregation 与 RunResult 边界。
- 文档投影 target 从 README 专用概念收敛为可定位的 Markdown output target，使同一 example source 能投影到 README 或唯一进阶文档；JSDoc target 继续保持独立变体。
- package documentation collector 分别验证唯一机制文档和 exact Check guide directory，随后对 README 与所有随包文档执行本地链接闭合。
- README 是常见 authoring 与文档路由 owner；API mechanics 是通用进阶生命周期与结果分支 owner；每份 Check guide 是对应内置 Check options、效果和安全边界 owner；installed declarations 是局部类型与字段签名 owner。非 owner 位置只保留完成当前任务所需的摘要与链接。
- README 的代表性消费任务是创建自定义 Check、组成 Definition、调用 `run` 并读取目标 outcome；API mechanics 的代表性消费任务是处理 preflight、typed dependency、aggregation、output failure 和 cancellation；Check guide 的代表性消费任务是安全配置并运行一项内置 Check。
- 正向目标状态先于负向边界：入口先说明 root API 可以完成的任务；结果页先说明各分支可读取的 facts；安全边界只在对应 Check 指南保留会改变 I/O 或授权的限制。
- “普通 Check”“Run 与 Check 分层”等共享判断由 README / API mechanics 完整说明一次。单项指南通过链接复用，不重复解释 Core、Definition 特判、旧 index 或 direct execution 防御。
- Check 指南的最后一节使用“适用边界”总结该能力负责的判断或输出；只有区分相邻能力所必需的内容才保留，不用否定式功能清单收尾。

### Resulting Impacts

- README 与 API 机制文档都成为 generated outputs，各自从相邻 template 产生；CLI check/write 必须覆盖二者。
- fingerprint 必须覆盖新 template、registry 和全部 package documents，删除 Check index 输入。
- isolated documentation acceptance 必须比较全部 installed documentation，而不只比较 README，并继续执行所有 registry runtime examples。
- Check guide tests 保留“七项 exact inventory + README 直链 + 拒绝额外页面”的可证伪信号；renderer tests 扩展为多 Markdown target，而不是按文件数拆分 Case。
- `docs/script-tooling.md` 与 Repository Tooling Cases 同步描述多 Markdown output 和无索引直链契约。

## Risks / Trade-offs

- 多 Markdown projection 会增加 renderer 的路径和 placeholder validation；用一个通用 Markdown target 承接真实的 README 与机制文档两个场景，避免建立逐文件分支。
- README 变短后必须保证基础结果处理仍足够独立；进阶语义通过一个显眼链接下钻，不拆成更多专题页。
- 删除 Check index 会让 Check 间共用的 composition/preflight 说明失去原位置；通用部分迁入 README 或 API 机制文档，每项指南只保留必要链接。
- 文档更明确后，错误表述也更容易被 AI 稳定复用；所有责任和顺序描述必须回查 public declarations 与 invocation implementation，不能用结构整齐替代事实核对。
- 删除负向句时可能误删安全与失败闭合条件；按“是否改变调用、授权、数据可信度或结果处理”判断保留，而不是按否定词数量机械删除。

## Open Questions

无；用户已确认唯一 README 总入口、Check 独立指南以及最多一份深入 API 机制说明。
