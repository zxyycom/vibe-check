# Manual CR: AI-ready 文档复核

## 对象与结论

- 审查者：非实施代理 `guide_consumer_review`；日期：2026-11-02。
- **结论：本轮专项通过，无影响任务恢复或正确使用的遗留问题。** 首轮 `review.md` 保持原样，只证明其原候选；本记录适用于新的文本组织与示例移交。
- 候选：`@zxyycom/vibe-check@0.0.0-local.b6c45a06fac8`；actual unpacked 为 `/workspace/vibe-check/build/package`。
- Tarball：`/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.b6c45a06fac8.tgz`；独立读取 SHA-256 为 `864ac83ee6fbcd9cb490b8ef47522ac43dc0622628b97cf585a5f1eda13445dd`。
- installed public entry：`/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check/index.mjs`；`package:status` 为 current。README、主指南及 command 专题的 workspace、unpacked、installed bytes 一致。

## 方法与任务答案

完整读取 `ai-ready-docs` skill 及其 principles。第一遍仅凭实际包 README、主指南全文 703 行和 command 专题全文 390 行恢复任务；之后才核对实际 diff、示例源、registry 与 Case。没有用内部实现补齐使用说明。

| AI 使用任务 | 从实际文本恢复的答案 |
| --- | --- |
| 真实 JSON 首次接入 | 主指南「首次接入」提供安装、真实文件、完整入口、合法/非法/修复对照。根目录取 cwd；异目录显式传 root；本地与 CI 使用同一 script；只接受 `completed + passed`，空输入、输出失败及异常不能放行。 |
| 选函数或命令接入 | 「选择接入方式」「接入已有检查」区分无 CLI 副作用函数和独立进程。直接调用仍承担取消、timeout、清理与隔离义务；命令使用 executable/argv、明确 environment 和受限输出。 |
| 共享准备而不合并验收责任 | 「准备一次，分别验收」及性能段区分 provider 准备成功与各消费者判决。材料身份、最后消费者后清理和污染风险明确；冷安装、不同环境、破坏性与失败注入保留独立边界。 |
| 找到并运行完整诊断适配 | 主指南摘要直链 command 专题「将工具结果映射为诊断」。新 owner 提供两套独立代码、共用运行尾部、Node/文件命名说明、预期 Record 与非零退出；无需返回主指南补运行步骤。 |
| 排查变慢并判断收益 | 性能段依次建立基线、检查重复准备和包装、核对证明目的、选措施并复测。固定输入/产物/工具/资源、区分冷热和计时区间；收益必须由同条件测量确认，方法示例不是已测性能事实。 |

## 重心、边界与结构判断

- 主承诺与正文一致：真实接入可在基础段结束，后续按问题展开。重复的固定值自定义教学撤回，改用 README 已有入口；完整 command 诊断移到 `afterCommand` 所属专题，主指南保留选择依据与直链，属于责任归位而非单纯转移长度。
- 收敛重复提醒后，严格退出、direct dependency 授权、保守增量、完整缓存 key、缓存信任边界与资源隔离仍可恢复。诊断保留协议资格、先完整验证再 report、stdout/stderr 分工、失败保留、字段白名单、transcript opt-in 与 preview 非脱敏边界。
- 没有要求使用者理解本次重写过程或退场方案的迁移话语；性能段的「调整前」用于比较当前可选调用链，不是旧版本兼容负担。定向扫描未发现撤回的 custom-rule source、旧编号锚点或过时片段数量引用。
- Markdown 用标题区分任务域、步骤列表表达执行顺序、表格表达配置和验证对照；新诊断章节的前提、代码、运行与公开边界在同一 owner 下。展开 callback 排版提高可读性，不以行数硬阈值牺牲语义。
- registry 保持两个诊断 source/region ID，目标改到 command 专题自然标题；相关 Case 只更新归属和证明文本，实体身份未变。五个既有示例的实际 diff 只调整 callback 排版，未发现逻辑变化；不把格式变化解释为新产品契约。

## 本轮独立验证与边界

- Node `24.18.0` 下，从 actual command Markdown 提取两套完整代码及运行尾部，原样拼接执行；经临时 fixture 路由复用上述 installed public entry，实际解析路径已核对。两例均退出 `1`，各有一条 `{ path: "config/app.json", line: 3, code: "missing-name" }` Record；私有 `debug` 内容未出现。
- 按新章节的验证步骤，各加入一条 `../outside.json` 诊断：两例均保持 failed、退出 `1`、`diagnosticsAvailable: false`，Records 数量为零，未先发布首条合法结果。
- fixture 不创建所报告的配置文件，也未生成 machine/diagnostic files；所有自有临时文件已清理。此演练证明 Markdown 接线，不代替严格隔离安装验收。
- 本审查另运行 `bun run docs:api` 和本次路径的 `git diff --check`，均通过。主线程记录的新候选 build audit、installed documentation 2 tests、Case 闭合及 documentation scope 验证作为已有机械证据引用，不声称由本审查者重复执行。
- 首次 JSON 入口代码未改，本轮做文本恢复与 diff 复核，行为对照保留为首轮证据；新候选的全部 runtime example 执行由本轮 installed documentation owner 验收提供。没有重新执行 consumer types、全 Gate、远端 CI、全部未改包页/JSDoc 或 benchmark，不作发布全包通过或已获加速的结论。
