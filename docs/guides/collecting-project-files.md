# 收集项目文件

`collectProjectFiles(...)` 是 package root 的同步工具，供普通项目脚本或自定义 Check 按 Vibe Check 的显式文件选择规则取得**一份**项目文件 path 快照。它只收集 path；调用方仍拥有 Check eligibility、内容读取、安全边界、Finding、Record 和终态结算。

## 最小用法

```ts
import { collectProjectFiles, defaultProjectFileSelection } from "@zxyycom/vibe-check";

const selectedPaths = collectProjectFiles({
  projectRoot: ".",
  selection: {
    ...defaultProjectFileSelection,
    exclude: [...defaultProjectFileSelection.exclude, "**/fixtures/**"],
    include: ["src/**/*.ts"]
  }
});

if (!Object.isFrozen(selectedPaths)) {
  throw new Error("Expected an immutable project-file snapshot");
}
```

## 输入、来源与结果

每次调用都必须给出 `projectRoot` 与完整 `selection: { source, include, exclude }`：

| 输入 | 要求与作用 |
| --- | --- |
| `projectRoot` | 非空且不含 U+0000 的路径；相对路径从调用时的工作目录解析，绝对路径直接使用。示例的 `"."` 是调用方显式选择当前目录，并非省略字段的默认值。 |
| `selection.source` | 只能是 `"filesystem"` 或 `"git-worktree"`，决定候选路径来源。 |
| `selection.include` | 无空洞的字符串数组，每项是相对 root、使用 `/` 的 glob；路径至少命中一项才被选中，`[]` 不选择任何路径。 |
| `selection.exclude` | 同样是无空洞的字符串数组；命中任一 glob 就排除，`[]` 不增加排除条件。排除优先于包含。 |

这些对象只接受列出的自有数据字段，不接受额外字段或 getter/setter；数组也不接受额外属性或 accessor 元素。工具不在遗漏 root 时替调用方选择目录；显式 root 不是路径隔离、文件系统沙箱或文件内容可读性的承诺。

本工具不解释 `ProjectFileSelectionOptions` 的省略字段，也不代表任何随包 Check 的默认值。需要通用基线时，像示例一样显式 spread `defaultProjectFileSelection`，再完整替换或派生 `include`、`exclude` 与（需要时）`source`。两组数组使用相同的 minimatch glob 语义，点号开头的路径也参与匹配，不会被额外隐藏。

返回值是相对解析后 root、使用 `/`、按稳定文本顺序排序并去重的冻结数组。没有匹配 path 时，返回冻结的空数组；返回后文件是否仍存在、是否可读或内容是否变化不在此工具承诺范围内。它不会读取文件内容，也不与 Check 或其它调用共享原子快照。

`filesystem` 递归枚举 root 下普通文件，不跟随符号链接，也不解释 `.gitignore`。

`git-worktree` 使用 Git 已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。已初始化且确为独立 Git worktree 的 submodule 当前文件也会加入，并返回相对本次 project root 的路径；gitlink 目录本身不是文件候选。两种来源都在候选收集后应用上述 glob 选择；即使 `include: []`，来源不可用仍是失败，不会被当作成功空结果。

## 失败与非目标

options、root 或完整 selection 不合法时，调用同步抛出 `TypeError`；例如缺失/多余字段、accessor value、非法 source、非 string glob、空 root 或含 U+0000 的 root 都不被接受。选定 filesystem 无法遍历或 Git source 不可用时，同步抛出带失败路径或 Git 来源上下文的普通 `Error`；工具绝不改用另一来源或把失败伪装成空数组。

这是同步、单 selection collection，不接受 `AbortSignal`，不支持中途取消或非阻塞执行。它不公开/不承诺命名 batch selection、`Map`、候选枚举、cache、watcher、scanner、`codeAreas`、阈值、Check exact-input handoff 或任何 content-read API。需要处理多份 selection 时，调用方分别调用此工具并自行拥有合并语义。
