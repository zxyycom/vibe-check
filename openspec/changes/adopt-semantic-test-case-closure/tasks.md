本临时 tasks 清单用于把完整 Bun 测试实体与语义 Case 双向覆盖落地到 Vibe Check；勾选只表示对应仓库工作和验证已经实际完成。

## 1. 实现前审计

- [x] 1.1 阻塞级审计 proposal、design、spec delta 与 tasks 是否围绕“完整当前实体事实 + 语义 Case 事实”核心句，capability ID 是否为 `test-evidence-management`，是否没有把临时 artifact 表述为已批准或已实现，是否只修改本 change 目录，且 Open Questions 没有未回答项；本项完成前不得执行任何实现任务
- [x] 1.2 核对 Docnav 最终实现、Vibe Check 当前 23 个 Bun test 文件、173 个 runtime entities、149 个字面量 static nodes、3 个动态 registration 和 35 个责任组，记录仅移植 Bun/Case 通用边界

## 2. Bun 测试实体发现

- [x] 2.1 添加精确锁定的 ast-grep 开发依赖、Vibe Check runner profile、文件展开和 workspace-safe path 边界
- [x] 2.2 移植并适配 ast-grep static scan、Bun JUnit report/parser、static/runtime closure、entity model 和 diagnostics
- [x] 2.3 添加 Bun rule、profile、JUnit parser、unsupported shape、duplicate 与 static/runtime closure focused tests
- [x] 2.4 将 3 处动态 test registration 收敛为 3 个稳定字面量原生节点，并运行两个目标测试文件

## 3. 语义 Case 目录

- [x] 3.1 实现 topic catalog、topic Markdown、Owner heading、Case model、workspace-safe source 和重复诊断
- [x] 3.2 实现 many-to-many entity coverage、topics/list/show/check CLI 与有界查询 focused tests
- [x] 3.3 按当前 35 个责任组迁移 Owner、Entities 与 Proves，为 9 个新增工具节点建立 3 个测试基础设施 Case，保留语义连续 ID，并删除 173 个单节点文件和 committed index
- [x] 3.4 运行全树 check，证明完整当前实体集合全部被 Case 覆盖且 Case 不引用未知实体

## 4. Owner、Skill 与验证接线

- [x] 4.1 用 Docnav 的能力感知语义审查版本替换项目 `test-evidence-review`，删除旧 catalog runtime，并明确其项目本地例外
- [x] 4.2 同步 AGENTS、文档导航、测试策略、Case 维护和脚本工具 owner，删除一对一、sync-index 与旧目录语义
- [x] 4.3 演进测试证据长期决定，并限定上游完整 skill 包策略对本项目 `test-evidence-review` 的例外
- [x] 4.4 把全树 check 接入 required profile，删除 full profile 重复 Bun test 调度；仓库没有 verifier test 文件，改由 focused tool tests 与真实 required/full profile 验证接线

## 5. 验证与交付

- [x] 5.1 运行 test-evidence rules、focused tool tests、目标产品 tests、全树 Case check
- [x] 5.2 运行 product/scripts typecheck 与 lint、decision check、docs/OpenSpec validation
- [x] 5.3 运行 required workspace verification；按影响面运行 full verification并记录质量 observation
- [x] 5.4 审查局部 diff、删除旧活跃术语和派生制品引用，确认没有修改 Product CLI/runtime contract
