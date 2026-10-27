# Gate test execution

本文拥有 Project Gate 测试 lane 的分区、输入消费者与执行验证。整体选择与调用见 [Project Gate](project-gate.md#selection-presets-and-scheduling)。

## Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。`checks/test-execution/checks.ts` 拥有 lane 到 Check ID、显示名、candidate input、mutex、timeout 与 Gate selection metadata 的闭合对象组；`definition.ts` 显式引用该组并把它放入完整 Gate manifest，避免复制 identity 或执行配置。

测试按证明责任分别结算：package tooling/artifact/installed-consumer、各 Product Check owner 与 Core/package-tools、Project Gate selection 与其余 tooling、admission workbench、Test Evidence、repository layout、package-tools/Core 闭包、machine artifacts、其余 material validation，以及 ordinary scripts。拆分依据是各 lane 的输入和证明义务，不是增加并行度。

仓库扫描的 displayName 明确标记 `Repository scan`，与 `tests-product-*` 功能测试及 `acceptance-installed-package-*` 安装验收区分。Markdown 功能 lane 同时拥有 lint 与 links；Core-and-tools lane 包含 Core 与 package-tools；package-tooling lane 是仓库包工具测试，不是 installed acceptance。Gate 私有 ID 也是本地 learned-history 的 task identity；更名后旧缓存不迁移，历史 workbench fixture 保留形成时 identity。

几项容易混淆的 test lane 各有自己的输入和证明边界：

- **Project Gate selection：** 对 Gate region 数据运行轻量路径矩阵，使用与 Product config-glob 相同的 `micromatch` 完整列表选项；选择规则、Definition、lane registry 或 Product 变更选择机制变化时运行。真实 Git changed-path、rename 和 unavailable fallback 由 Product tests 证明。
- **Repository layout：** 扫描当前 `src/**` / `scripts/**` 源文件的结构、import 与 package-tools 边界；任何源码变化均选择它。
- **Package-tools/Core 闭包：** 使用独立 fixture；验证器、共享 fixture、依赖或运行配置变化时选择。
- **Machine artifacts：** 实际材料、生成器、validator、Product Definition 输入或该 lane 测试文件变化时选择；其测试文件变化不启动其余 material tests。

### Product test lanes 的输入

Product test lanes 的 changed 输入由 `runtime/product-test-regions.ts` 声明，从完整 Product source 与 runner/工具链输入出发，按实际消费者收窄已知私有输入：

| 输入 | 选择边界 |
| --- | --- |
| 已知 Check 私有实现、helper、fixture | 选择所属组。file metrics 还消费 JSON validation/document 的实现、helper 和 fixture；Markdown lint 与 links 同组。 |
| 已知 owner 的 `*.test.ts` 正文 | 选择自身 Product lane 及扫描其正文的组。host-environment/project-files 测试属于 supporting Checks；Core/package-tools 测试正文由 Core-and-tools lane 承接。 |
| 根导出、Core/runtime、package tools、共用 Check helper、project-files、host-environment 的实现与 helper | 保守选择全部七个 Check 组。 |
| 尚未分类的新模块，包括测试正文 | 保持共享输入回退，直到确认消费者。 |

function metrics 的 source-identity 审计与行为测试仍在同一 lane。审计读取全部 `src/**` 与 Lizard provenance，因此该组保留完整输入范围。

package tooling、Gate 本体与普通 tooling 三个 routine 脚本组依赖 Product 实现、helper、fixture 和未知 owner 路径；已知 Product 测试正文由其 owning lane 承接。包源码/JSDoc 扫描本身排除测试正文，Gate 读取的完整测试文件清单则由每次启动的 lane 分区校验承接。layout、质量扫描与 Test Evidence 按各自实际的正文输入选择。

### 维护与验证

维护 region 时同时核对 import 和直接文件读取，并同步新增消费者。路径矩阵验证跨 owner 输入、正文/helper 区别及删除或重命名后的路径；完整 lane 清单验证每个测试文件触发自身。Git evidence 不可用时保守选择，显式 preset 提供强制路径。

各 lane 按[选择参数](project-gate.md#选择参数)进入本次 Run。两组材料测试与 schema/example validators 共享 repository-material mutex；machine drift 测试使用私有材料，隔离与证明分工见[输出维护](../development/output-maintenance.md#package-材料的维护与验证)。快速 candidate contract 属于 package tooling；`candidate.integration.ts` 的正式入口是 `package:candidate:integration`，不属于 routine `*.test.ts`。External-consumer provider 是独立 Check。
