# Proposal

按真实证明责任简化测试与 Gate 自动选择；本计划保存实施范围、验收证据和结项边界，稳定规则归对应 owner。

## Why

测试层级过高、重复准备、弱断言和自动验收职责混杂，使维护成本与 Gate 耗时高于必要水平。选择保留层级时，先明确再降一层会失去什么不可替代的观察，再选择直接领域入口或必要的真实边界。

## Outcome

测试以最窄充分观察层和小规模输入证明行为，保留公开 API、四项质量扫描及完整 package 验收。changed 按受影响范围、all 完整验收 installed docs/runtime；consumer types 由正式发布及显式入口验收，admission workbench 按需执行。以原预算交付功能与性能结果，并明确局部收益和稳定性边界。

## Scope

### Intended Change

前七版已提交的降层、fixture 减重、断言加固与 Gate 选择分工作为基线。本次从 `4cf52b42` 继续的范围是：

1. 用三条重复引用的 `2 / 3 / false` 小矩阵证明 Markdown 两项预算的独立计费、精确边界和无部分发布。
2. 将四次 ast-grep 扫描合为一次 config 扫描，保留四规则分类、异常进程/输出和 static/runtime 闭合诊断。
3. 全局与项目 Bun 升至 1.4.4；候选包、正式准备和 external consumer 统一严格离线真实安装，以 copyfile 隔离安装与缓存；增加显式联网缓存准备及 env:setup 接线。
4. 修正升级暴露的 JSON 内容断言兼容，保留独立原型、冻结和身份验证；包工具 Case 移入独立查询 Topic，身份和证明语义连续。
5. Worker 参数拼写由纯函数矩阵覆盖，真实 Node/Worker 保留默认继承与过滤两个代表，继续观察 preload、read 和 finalize。
6. Test Evidence 每次发现内复用已编译 glob，在 include 存在性已得到证明后跳过确定排除的子树，保持完整测试集合和诊断。
7. 按完整编码规范复核变化模块及直接调用边界，补强扫描输出的源码/元变量范围合法性，以及 dependency 测试的 readback 状态/引用前提。
8. 用 ai-ready-docs 复核本次全部文档变更，按当前状态、形成时认识和稳定规则各自的 owner 收敛内容。

前序实施与形成时证据见 [tasks 的历史索引](tasks.md#证明范围与历史依据)。

### Resulting Impacts

同步原 Case、静态发现、安装 owner 与计划；测试移动继承原 lane 和输入 region。Product、公开 API、lint、Gate 资格、原预算、timeout 和统计口径保持不变，公开用户文档及发布映射无需调整。

受影响边界由局部测试、全树 Case、工程/材料检查、独立审查、完整 all、显式 cold integration 和 consumer types 分别验收。
第十版 all 已通过；末轮代码/文档修正后的集中验证与唯一一次新 all 尚待执行。用户已授权必要 Git 提交、既有 hook 推送和正常结项；提交与 finalize 由主执行者在最终验收后完成，不扩张到其它依赖升级或正式 package 发布。

## Success Criteria

- layout 验证可证伪的跨层依赖；目录形状和等价构建写法由人工审查。降层保留取消、容量、缓存和输入 guard 观察，fixture 按调用隔离。
- routine、release-only、explicit-only 按职责选择；changed/all 覆盖 docs/runtime，正式 receipt 验收包含 types。Check 粒度和命名表达证明责任。
- 小矩阵分别证明两项预算超限及精确相等成功；constructor 接受大安全整数。退出旧 10,000 隐式上限专门执行回归的取舍明确可查。
- 单次扫描保留完整测试面、四规则与 JUnit 独立闭合；进程失败或非法输出拒绝整次结果。文件发现优化保持同树精确集合和原诊断。
- 全局及项目实际 Bun 版本一致；冷缓存对可用 registry 零请求并明确失败，显式准备后断网完成两次全新安装，安装文件与缓存不共享可变文件。
- 完整 all、cold integration、consumer types 覆盖升级后真实 package 边界；局部前后测与完整 Gate 的功能/性能分别报告，不改变预算、lint、timeout 或重试政策。
- 独立审查与工程验证完成；文档能独立恢复当前 owner、执行路径、授权和证据边界。历史报告保持形成时认识，最终全勾计划保存后按授权结项。

## Affected Owners

- 测试与发现：[Testing](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)、[Markdown Link](../../docs/development/markdown-link-resolution.md)与相关 Case。
- 安装与验收：[Workspace](../../docs/tooling/workspace.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、[Package release](../../docs/tooling/package-release.md)。
- 前序降层依据：[Architecture](../../docs/development/architecture.md)、[Coding style](../../docs/development/coding-style.md)、[Admission workbench](../../docs/tooling/admission-workbench.md)、[Scheduler](../../docs/development/scheduler.md)、[Package tools](../../docs/development/package-tools.md)、[Project files](../../docs/development/project-files.md)、[Output maintenance](../../docs/development/output-maintenance.md)。
