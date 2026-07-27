# 测试证据维护

本文定义 Vibe Check 项目如何把原生测试节点维护为可检索的测试证据。固定目录格式、case
语法、派生索引和 CLI / ESM API 契约由项目内
`test-evidence-review` skill 拥有；本文只负责项目级 topic、case identity、证明目标和
测试变更流程。

产品语义仍以 [文档导航](../navigation.md#规则所有权) 指向的 owner 文档为准。测试证据
说明哪个可执行入口证明哪条契约，不重新定义产品行为。

## 当前材料

测试证据使用固定目录 `docs/test-evidence/`：

- `test-evidence-topics.json` 是受控 topic 表。
- `<topic-id>/<case-slug>.md` 是人工维护的 case source；每个文件只记录一个 case。
- `test-evidence-index.json` 是由统一 CLI 生成的派生索引，不手工编辑。

每个 case 必须只指向一个最小原生 runner 节点。一个文件、suite 或 fixture 可以服务多个
case，但不能用一个聚合 case 代替多个原生 test / it 节点。Vibe Check-owned 源码不再
保存 `@case` marker，也不存在 marker 与目录的双读关系。Pinned toolkit submodule
内部仍可能带有其上游 revision 的历史 marker 注释；项目不读取这些注释，也不把它们视为
Vibe Check 测试证据或当前 owner。

## 使用时机

出现以下任一变更时，检查并同步对应 case：

1. 新增、删除、重命名或移动原生 test / it 节点。
2. 修改断言，使测试证明目标、契约或可观察结果发生变化。
3. 修改 test suite 名称，导致 runner identity 改变。
4. 新增、删除或调整测试 fixture 的责任边界。
5. 把测试迁入或迁出当前统一验证入口。

只改测试内部实现细节，且 runner identity、Contract、Proves 和 Entry 都不变时，无需改
case；交付前仍要确认局部 diff 没有扩大测试职责。

## Identity 与归属

Case ID 延续 `类别-责任域-证明意图-NNN` 的项目命名习惯，并满足 skill 的固定语法：

- `BB`：通过正式入口观察用户链路、进程或输出边界。
- `WB`：通过 owner 函数、模型或 adapter 证明内部不变量。
- `AUX`：证明开发脚本、验证、质量观测或调度工具链。

同一稳定行为在移动或重命名时保留 case ID，只更新 title、Entry、Contract、Proves 和
文件 slug。行为身份改变时建立新 case，并删除不再有原生入口的旧 case；已删除的 ID
不得复用。新增责任面需要长期检索时，先在 `test-evidence-topics.json` 添加排序后的
topic 定义。

Topic 表只按长期可检索的能力边界划分，不按单个文件、临时 change 或每个测试 suite
扩张。当前 topic 以 `bun run test-evidence -- topics` 输出为准。

## Case 编写流程

1. 先按 [测试策略](../testing.md) 选择最窄测试层级，并从行为 owner 写出
   “稳定契约 -> 可观察结果”。
2. 运行或检查原生 runner，确认目标 test / it 节点具有可唯一定位的 path、suite 和
   test name。
3. 在对应 topic 下建立一个 case 文件；一个原生节点对应一个 case。
4. `Entry` 精确定位该节点；`Contract` 引用 owner 承诺的语义；`Proves` 说明该节点实际
   断言的可观察结果。
5. 写入后重建派生索引并运行严格检查：

   ```bash
   bun run test-evidence:sync-index
   bun run test-evidence:check
   ```

6. 运行目标测试。跨多个 owner、入口或 package 时，再运行
   `bun run verify:vibe-check-workspace:required` 或更高层级验证。

需要检索或审阅现有 case 时使用：

```bash
bun run test-evidence:list
bun run test-evidence -- list --topic <topic-id> --query <text>
bun run test-evidence -- show <case-id>
```

目录结构、字段或索引诊断不清楚时，先读
`.codex/skills/test-evidence-review/SKILL.md`，不要在项目脚本中复制 parser 或 validator。

## Fixture 责任

Case 只记录 fixture 与目标测试之间可验证的责任，不让 fixture metadata 成为产品 owner：

1. External project fixture 位于 `fixtures/projects/**`，用于正式入口链路。
2. Unit / scanner protocol support 与相邻测试放置，证明 parser 或 adapter 输入边界。
3. 一个 fixture 可被多个 case 复用；每个 case 仍只绑定一个原生 test 节点。
4. Fixture 变化若改变测试输入类别或可观察结果，同步更新所有受影响 case。

## 交付审计

测试或证据材料变更后确认：

1. 每个当前 case 都能定位一个且仅一个原生 runner 节点。
2. 每个进入项目验证范围的原生测试节点都有一个 case，ID、Entry 和 source path 无重复。
3. `Contract` 可追溯到当前 owner 或明确 change requirement，`Proves` 不只写“覆盖了场景”。
4. `test-evidence-index.json` 与 source files 同步，且没有手工维护的第二份账本或源码
   marker。
5. 目标测试与 `bun run test-evidence:check` 均通过；跨边界变更按风险补充 workspace
   verification。
