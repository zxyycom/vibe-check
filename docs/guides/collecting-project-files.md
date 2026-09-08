# 选择与收集项目文件

本文说明随包 Check 共用的文件选择规则，以及独立收集 path 的工具。只配置现有 Check 时，直接阅读[共享的 files 选择语义](#共享的-files-选择语义)；需要自行取得文件列表时使用下方工具。

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

## 共享的 files 选择语义

需要选择项目文件的随包 Check 使用 `{ source, include, exclude }`：`source` 明确选择 `filesystem` 或 `git-worktree`，include/exclude 使用 project-root-relative、`/` 分隔的 minimatch glob，点号开头的路径也参与匹配，exclude 优先。来源不可用时不切换来源；Check 将它结算为 `unavailable`，下方独立工具则同步 throw。

`defaultProjectFileSelection` 是深冻结、可组合的基线，不是全局配置。它排除常见 VCS/Product state、dependencies、build/generated、cache、coverage、log、temporary 与 virtual-environment paths。`duplicateDetection`、`fileMetrics` 与 `jsonSchemaValidation` 原样采用该基线；`functionMetrics`、`jsonValidation` 与 `markdownLinkValidation` 保留 source/exclude，按支持文件类型派生默认 include。`secretDetection` 要求显式完整 selection。精确默认列表可从导出值读取，各 Check 的实际默认与 eligibility 见其指南。

Check constructor 接受省略字段时，由 owning Check 物化默认值；显式 `include` / `exclude` 数组完整替换相应默认值，`include: []` 不选择路径，`exclude: []` 不排除路径。需要追加排除时像上例一样 spread；多个 Check 共享范围时显式复用 TypeScript value。各 Check 的 area policy、accepted/rejected input 与内容安全边界仍各自独立。

## 工具输入、来源与结果

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

## 失败与调用边界

options、root 或完整 selection 不合法时，调用同步抛出 `TypeError`；例如缺失/多余字段、accessor value、非法 source、非 string glob、空 root 或含 U+0000 的 root 都不被接受。选定 filesystem 无法遍历或 Git source 不可用时，同步抛出带失败路径或 Git 来源上下文的普通 `Error`；工具绝不改用另一来源或把失败伪装成空数组。

每次同步收集一份完整 selection，不接受 `AbortSignal`，不支持中途取消。需要处理多份 selection 时分别调用，并由调用方决定合并语义；内容读取与检查结果仍由调用方负责。
