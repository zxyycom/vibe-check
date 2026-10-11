# 调试 change flags

`debugChangeFlags` 是独立的同步 Non-core 工具：显式收集当前所选普通文件，展示它们假如发生变更时会命中的 change flags。
它保留零命中、单命中和重叠文件，不需要 Check、Project Definition 或 Run，也不取得 Git delta。

## 最小用法

下例的临时文件仅用于演示；实际使用时传入项目 root、完整 selection 与当前 Definition `changes.flags`。
formatter 只返回文本，示例不打印或保存报告。

```ts
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changeFlag, debugChangeFlags, formatChangeFlagDebugReport } from "@zxyycom/vibe-check";

const projectRoot = mkdtempSync(join(tmpdir(), "change-flags-example-"));
try {
  for (const path of ["a.ts", "b.ts", "zero.txt"]) {
    writeFileSync(join(projectRoot, path), "example\n");
  }
  const report = debugChangeFlags({
    projectRoot,
    selection: { patterns: ["*"] },
    regions: {
      source: { patterns: ["*.ts"] },
      extra: { patterns: ["a.ts"] },
      empty: { patterns: [] }
    }
  });
  if (report.files.map(({ hitCount }) => hitCount).join(",") !== "2,1,0") {
    throw new Error("Expected overlapping, single and zero hits in the complete selected universe");
  }
  if (report.filesForFlag(changeFlag("source"))?.join(",") !== "a.ts,b.ts" ||
      report.flagsForFile("zero.txt")?.length !== 0 || report.flagsForFile("outside.txt") !== undefined) {
    throw new Error("Expected bidirectional results and distinct unknown paths");
  }
  const text = formatChangeFlagDebugReport(report); // 返回文本，不自动输出。
  if (!text.includes('"zero.txt" 命中=0 flags=[]') || !Object.isFrozen(report.scope)) {
    throw new Error("Expected explicit presentation and immutable range metadata");
  }
} finally {
  rmSync(projectRoot, { recursive: true, force: true });
}
```

## 输入与失败

`debugChangeFlags({ projectRoot, selection, regions })` 恰好接收这三个字段，不发现配置或推断 root。

- `projectRoot` 与 `selection` 完整遵循[选择与收集项目文件](collecting-project-files.md#工具输入)：显式 patterns，默认开关省略/true 启用，false 关闭。
- `regions` 是至少一个非空 ID 到 `{ patterns }` 的闭合映射，可直接传入 Definition 的 `changes.flags`；每个 ID 保留原字符串，包括 U+0000、`__proto__`，不采用文件路径限制。空 patterns 是合法空区域。
- region 规则遵循[共同原生完整列表与固定参数](collecting-project-files.md#共享的-files-选择语义)，与同一路径的 Run region 匹配相同。
  collection 默认排除只控制文件全集，不叠加到 region 规则；全集独立于 regions 并集。

每层记录只接受 plain/null-prototype、自有可枚举数据属性；数组须使用标准 Array.prototype、dense、无 accessor/额外属性。
getter/setter、symbol、非枚举属性、未知字段和非法字段值同步抛 `TypeError`，不调用 getter。
输入形成 detached 冻结快照，不修改或冻结调用方对象；反射 Proxy 仍可能执行 trap，不是对象沙箱。
必要文件系统检查或读取失败沿用 collector 带目标路径与 cause 的普通 `Error`，不返回 partial report。
合法空 selection 或无匹配仍得到正常空 files；空 patterns 仍验证 root 可用。非法输入、必要读取失败与空结果不能混为一谈。

## 报告与双向查询

`ChangeFlagDebugReport` 的外层、嵌套记录与数组均冻结。
`files` 按 path、`regions` 按 ID 排序；文件 flags、区域 files 和两向查询结果使用 JavaScript 字符串 `<` 的稳定文本顺序，不依赖 locale。
collection 与 region 的 `patterns` 均保留输入规则顺序，不排序或去重；`defaultExcludes` 保留公共默认数组的顺序。

| 成员 | 内容 |
| --- | --- |
| `scope.projectRoot` | 本次按 cwd 解析后的绝对 root。 |
| `scope.patterns` | 已接收的完整 collection 原生列表，保留规则顺序。 |
| `scope.useDefaultExcludes` / `scope.defaultExcludes` | 有效开关与本次实际生效默认排除列表；关闭时列表为 []。 |
| `scope.fileKind` / `scope.followSymlinks` / `scope.snapshot` | 固定为 `"regular"`、`false`、`"per-call-non-atomic"`，说明普通文件、no-follow 与快照边界。 |
| `files` | 全部已收集文件 `{ path, flags, hitCount }`；包含 flags=[]、hitCount=0 的文件，数量为 flags 长度。 |
| `regions` | 全部 `{ id, flag, patterns, files }`，含空区域；flag 由公开 `changeFlag(id)` 投影，patterns 保存已接收规则。 |
| `flagsForFile(path)` | 已收集路径全部 tokens；零命中为冻结 []，合法未收集路径为 undefined。非法 normalized relative path 抛 TypeError。 |
| `filesForFlag(flag)` | 以 token（不是 author ID）查全部文件；已知空为冻结 []，未知非空字符串为 undefined；非字符串或空值抛 TypeError。 |

两向查询、逐文件 flags 和命中数来自本次同一个只读 [Core 关系](file-region-index.md#只读双向结果)。
方法可解构调用、不依赖 this。未收集路径不等于已收集零命中；它可能在 selection 外、默认排除中、是链接或已不存在。

## 生命周期与呈现

每次调用重新收集文件并采用当前传入的 regions；配置重载由调用方负责。
旧报告不会因新增文件、规则变化或随后修改输入而改变；要刷新结果，调用方重新调用入口。
本次双向查询与 `formatChangeFlagDebugReport(report)` 只读报告，不做 I/O、读取配置、调用 Git 或执行 Run。

formatter 按需返回含范围、完整逐文件数量/flags、全部区域规则/文件的中文文本；路径与 ID 采用 JSON 转义，避免控制字符伪造行。
它接收本工具产生的报告，不是任意 JSON 的恢复/校验入口；文本不是稳定机器协议。需要结构化消费时读取报告值。
工具与 formatter 不自动打印、写文件或分享；报告含项目路径，外部导出由调用方明确决定。

## 解释边界

候选来源和限制沿用[纯磁盘普通文件枚举](collecting-project-files.md#磁盘来源与访问范围)：不跟随文件/目录/root symlink、不读取内容、ignore 策略或 Git 身份。
不承诺跨文件原子状态、返回后的存在性或内容可读性，也不替代安全读取与权限检查。

当前文件全集可能缺少已删除路径和 rename 旧路径。报告是当前候选的假想映射，不是实际 Git delta、Run `project.changes` evidence、
effective flags、Check 选择或覆盖证明。实际 change preparation 仍由 [Run](../api-mechanics.md#按文件变化选择-check) 拥有。
