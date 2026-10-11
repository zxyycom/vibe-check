# 定位文件与区域

`createProjectFileRegionIndex` 是无 I/O 的 Core 工具：将多份文件与区域值数据构造成同一只读双向关系。
从 package root 导入，无需创建 Check、Project Definition 或 Run。文件获取、新鲜度、默认排除与业务策略仍由来源和消费者负责。

## 最小用法

```ts
import { createProjectFileRegionIndex } from "@zxyycom/vibe-check";

const index = createProjectFileRegionIndex({
  fileSources: [["src/a.ts", "docs/readme.md"], ["src/a.ts", "src/b.ts"]],
  regionSources: [[
    { id: "source", kind: "patterns", patterns: ["src/*.ts", "!src/ignored.ts"] },
    { id: "reviewed", kind: "members", files: ["src/a.ts"] },
    { id: "empty", kind: "members", files: [] }
  ]]
});

if (index.regionsForFile("src/a.ts")?.join(",") !== "reviewed,source") {
  throw new Error("Expected overlapping regions");
}
if (index.regionsForFile("docs/readme.md")?.length !== 0 || index.filesForRegion("unknown") !== undefined) {
  throw new Error("Expected known empty and unknown to remain distinct");
}

const next = index.appendSources({ fileSources: [["src/new.ts"]] });
if (next.filesForRegion("source")?.length !== 3 || next.filesForRegion("reviewed")?.length !== 1) {
  throw new Error("Expected rules to rebuild without expanding actual members");
}
if (index.regionsForFile("src/new.ts") !== undefined || !Object.isFrozen(next.filePaths)) {
  throw new Error("Expected independent immutable views");
}
```

## 来源与文件域

`ProjectFileRegionSources` 只接受以下可省略字段；省略整个构造参数或传 `{}` 得到空视图。
显式存在的字段必须是数组，不能为 `undefined`。

| 字段 | 值与作用 |
| --- | --- |
| `fileSources` | 多份文件路径数组；合并所有路径，去重后形成文件域。 |
| `regionSources` | 多份 `ProjectFileRegion` 数组；所有区域共同使用唯一 ID。 |

每份来源是已取得的值数组。实际成员区域的 `files` 本身也加入文件域，因此可只给 members regions，
不必重复声明 fileSources。只有规则区域时，未提供文件域则规则成员为空；patterns 只匹配已提供的路径。

所有路径必须采用**同一个 project root 相对坐标**，使用 `/`，不含空段、`.`、`..`、反斜杠、U+0000、绝对起点或 drive-like 前缀。
工具拒绝非规范 spelling，按原字符串建立身份，不解析 root、修正别名、做 Unicode normalization 或验证存在性。
同一个字符串代表同一个文件；不存在或已删除的路径可以显式参与。不同 root 的数据须由调用方先转换到共同坐标。

## 区域值与规则

`ProjectFileRegion` 是以下二选一的闭合记录；不接受混合字段或额外字段。

| 区域 | 成员关系 |
| --- | --- |
| `{ id, kind: "patterns", patterns }` | 对整个文件域用完整原生正/负列表计算；空 patterns 得到已知空区域。 |
| `{ id, kind: "members", files }` | 直接保留来源已经筛选的成员；其它来源追加路径不会扩大它。空 files 是已知空区域。 |

`id` 是非空字符串，区分大小写，按原值保留（包括 U+0000），不采用文件路径的字符限制；所有接收来源中的重复 ID 都同步抛 `TypeError`，
即使定义完全相同也不合并或覆盖。需要更新同 ID 区域时，调用方用新的完整值构造另一个独立索引，不用追加模拟替换。

patterns 是 dense 非空字符串元素数组，数组本身可为空。规则与 collection、Run regions 使用
[共同原生列表和参数](collecting-project-files.md#共享的-files-选择语义)。
Core 不应用扫描默认排除，显式 `build`、`node_modules` 等路径仍可匹配。
实际成员不会再被规则或默认排除过滤，Check eligibility、阈值、accepted/rejected、exact inputs 与结算仍归消费者。

## 只读双向结果

| `ProjectFileRegionIndex` 成员 | 结果 |
| --- | --- |
| `filePaths` | 文件域全部路径，包括零命中的文件。 |
| `regionIds` | 全部区域身份，包括零成员的区域。 |
| `regionsForFile(path)` | 已知文件的全部区域 ID；已知零命中返回冻结 `[]`，合法未知路径返回 `undefined`。 |
| `filesForRegion(id)` | 已知区域的全部文件；已知空返回冻结 `[]`，合法未知 ID 返回 `undefined`。 |
| `appendSources(sources)` | 合并新增值并重建，返回独立新视图。 |

两个方向来自同一关系，重叠不会丢失。所有公开数组去重、冻结，并按 JavaScript 字符串 `<` 比较的稳定文本顺序排列；
不使用 locale 排序。非法查询路径或 ID 同步抛 `TypeError`，不能用非法键表示未知。
结果外层冻结，私有 Maps 不暴露；方法不依赖 `this`，可以解构调用。

## 追加与隔离

`appendSources` 只接收新增来源值，合并已经接收的值后重新计算。新文件参与已有规则、新规则参与已有文件，
实际成员仍只来自自己的 files。旧视图保持原结果，新视图的结果也不会因随后修改输入而变化。
追加失败不改变旧视图；追加空来源仍返回新视图。刷新数据需要来源 owner 重新获取并构造新完整索引。
临时比较或替换数据时，也通过构造入口取得独立索引。

输入逐层复制为 detached、冻结快照，不修改或冻结原对象。记录只接受 plain/null-prototype 的自有可枚举数据字段；
数组只接受标准 Array.prototype、无空洞、无 accessor 或额外属性的结构。每层 getter/setter、symbol、非枚举字段、
其它原型、非字符串路径/规则或未知字段均拒绝。不调用 getter，但反射 Proxy 仍可能执行 trap，不构成不可信对象沙箱。

## 计算成本与边界

构造、查询和追加只计算值数据；获取失败与空文件域由来源 owner 区分。
关系快照不承诺实时或原子的文件系统状态，不替代安全读取或权限校验。

初版追加采用全量关系重建；保存文件、区域与双向边，空间随它们总量增长，规则成本取决于完整 matcher 与输入。
不承诺相对其它方案的性能改善；大规模使用前按实际文件、区域和边数测量。
