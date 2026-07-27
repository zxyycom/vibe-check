本任务清单按 skill 同步、决策迁移、测试证据单轨切换和最终验收推进；实现前审计已经作为阻塞任务记录。

## 1. 实现前审计

- [x] 1.1 阻塞级审计 proposal、design、agent-workflows/test-fixtures delta 与本清单是否围绕同一目标，确认 capability ID、修改范围、迁移顺序、无开放问题、旧 owner 退出和验证路径完整；本任务完成前不得执行 2.x 及后续实现任务

## 2. Skill 分发同步

- [x] 2.1 从核实的上游 release 更新 4 个 OpenSpec skill，并逐包检查版本、完整文件集和结构 validator
- [x] 2.2 原样添加 product-architecture-judgment、dependency-boundary-design、common-denominator-design、minimal-implementation 与 investigation-report，并验证内部引用和 updater
- [x] 2.3 检查 `.codex/skills` 局部 diff，确认没有更新用户未选择的 skill 或把项目适配写入上游包

## 3. Decision Records 升级

- [x] 3.1 保存当前决策集合的语义、状态和建立时间证据，原样更新 decision-records 分发单元
- [x] 3.2 建立受控 decision domains，把现有决策迁移为最新自包含 Markdown，并由最新 CLI 重建索引
- [x] 3.3 更新项目 wrapper、类型导出、package/docs 入口并运行 list、show 与严格 check

## 4. Test Evidence 迁移

- [x] 4.1 原样添加 test-evidence-review，读取目录与旧模型迁移契约并验证分发脚本
- [x] 4.2 盘点全部当前原生测试入口、旧 case、源码 marker、fixture 与 owner，生成无遗漏和无碰撞的迁移映射
- [x] 4.3 建立受控 topic 表和一原生入口一 case 文件，保留可证实的 Contract/Proves，并生成统一派生索引
- [x] 4.4 新增项目测试证据 wrapper/package scripts，把 strict check 接入 workspace verifier
- [x] 4.5 删除旧聚合账本和 Vibe Check-owned 源码 marker，确认没有专用 marker validator，停用外部惰性 marker 输入并更新 testing owner 文档且不保留双读
- [x] 4.6 对比迁移前后测试入口与 case 映射，运行 topics、sync-index、check、代表性 list/show 和目标测试

## 5. 长期契约与决策同步

- [x] 5.1 更新 AGENTS、navigation、script tooling、testing 与相关文档，使 skill、决策和测试证据 owner 只有一个当前入口
- [x] 5.2 完善 test-fixtures 与 agent-workflows delta，严格验证 OpenSpec change 与全部 specs；主 specs 保持由后续显式归档同步
- [x] 5.3 在迁移后的 decision-records 中记录并建立用户确认的项目 skill 组合与测试证据 owner 判断，核对事实后标记 aligned

## 6. 验证与交付审查

- [x] 6.1 运行全部项目级 skill 结构检查、上游包一致性检查、决策与测试证据严格检查
- [x] 6.2 运行 validate、scripts typecheck/lint、product tests、quality check 和 required workspace verifier
- [x] 6.3 审查最终 diff、删除范围、生成索引、新旧 owner 引用和残余风险，并确认工作区只包含本 change
