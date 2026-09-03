# `secretDetection`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

`secretDetection({ files })` 是随包 ordinary Check，发现高置信 PEM private-key material。它不是全面 credential protection，也不验证 secret 有效性。

## 参数与默认配置

`files` 必填，且必须是完整 `{ source, include, exclude }` value；它是唯一的输入授权，不提供隐式全仓库 fallback。

```ts
{
  files: { source: "filesystem", include: ["src/**/*", "config/**/*"], exclude: ["**/generated/**"] },
  maximumFileBytes: 1_048_576,
  maximumTotalBytes: 8_388_608,
  maximumFileCount: 2_048,
  findingWaivers: []
}
```

`source` 可取 `filesystem` 或 `git-worktree`，include/exclude 是 project-relative `/` glob 且 exclude 优先。三个 limit 都是正安全整数；它们可收窄或显式提高。options 不接受 arbitrary regex、command、baseline、detector allowlist 或 message suppression。

## 工作原理

Check 先从 own `files` policy 收集 exact project-relative paths。对每个 selected path，它先执行文件数限制；在本仓库验证的 POSIX Bun runtime 中，再以 `O_NOFOLLOW` 打开 final leaf、对同一 descriptor 做 regular-file 与 size 检查，并在单文件/剩余总预算内分块读取。成功 read 后才进行 fatal UTF-8 与 NUL 分类，只有 approved text 会传入 private adapter。symlink、非 regular file、读取变更或不支持 no-follow descriptor open 的 runtime 不获 detector coverage。adapter 使用 [Secretlint monorepo `v13.0.5`](https://github.com/secretlint/secretlint/releases/tag/v13.0.5) 提供、MIT-licensed 的 `@secretlint/core@13.0.5` 与 `@secretlint/secretlint-rule-privatekey@13.0.5` 固定单规则集合；它不接收 project root，也不会重新枚举输入。

第三方 source/result/message/data/exception 只短暂存在 invocation-owned memory。adapter 立即只投影 rule ID、path、safe line/column、`text-document` structural class 和 ordinal；不返回 raw value、substring、hash、message 或 stack。

## 效果与结果

`parseSecretDetectionData(data)`（或返回 Check 的 `parseData`）只在 `passed` 或 `failed` 时验证并恢复：

```ts
{ selectedFileCount, scannedFileCount, findingCount, waivedFindingCount, coverageGapCount }
```

字段的责任如下：`selectedFileCount` 是 files policy 的 exact selection 数；`coverageGapCount` 是其中未获得 detector coverage 的确定性缺口数；`scannedFileCount` 是其余已获 bounded text coverage 的数，因而恒有 `scannedFileCount + coverageGapCount === selectedFileCount`。`findingCount` 是所有安全投影后的 detector finding 数；`waivedFindingCount` 是其安全 identity 被唯一 waiver 匹配的子集，不能大于 `findingCount`。actionable finding 指未 waived 的 finding。

zero selected paths 为 `not-applicable`，没有 final data。否则，无 actionable finding 且没有 coverage gap 为 `passed`；任一 actionable finding 或 deterministic coverage gap 为 `failed`。`unavailable` 也没有 final data，且不发布 partial result。`secret-finding` Record 只含 blocking、rule ID、path、safe location、structural class 与 ordinal。coverage Record 是不可豁免的 `{ kind: "coverage-gap", path, reason, blocking: true }`。`SecretDetectionOptions`、`ResolvedSecretDetectionOptions`、`SecretDetectionFinalData`、`SecretDetectionRecordData` 与 `SecretDetectionUnavailableReasonCode` 均从 package root 导出。

`findingWaivers` 复用 `reconcileFindingWaivers(...)`：identity 恰为 `{ path, ruleId: "@secretlint/secretlint-rule-privatekey", structuralClass: "text-document", ordinal }`，不含 value/message/line/hash。唯一匹配的 finding 是 **waived finding**：它仍保留原 finding Record 与 reason，但不再计入 actionable finding；`unused` 与 `overmatched` waiver 形成 audit，后者不豁免任一 finding。coverage gap 与 unavailable 不受 waiver 影响。

```ts
const check = secretDetection({
  files: { source: "filesystem", include: ["src/**/*"], exclude: [] },
  findingWaivers: [
    {
      identity: {
        ordinal: 1,
        path: "src/legacy-key-fixture.ts",
        ruleId: "@secretlint/secretlint-rule-privatekey",
        structuralClass: "text-document"
      },
      reason: "已跟踪的 synthetic fixture；移除前保留此精确 waiver。"
    }
  ]
});
```

上例的 identity 应从该 Check 的安全 finding Record 复制；不要根据 detector message、secret 值、hash 或 line 自行构造。`reason` 会作为 waiver evidence 发布，因此只写不含敏感材料的说明。

## `not-applicable` 与 `unavailable`

zero selected paths 为 `not-applicable / no-eligible-input`。NUL、invalid UTF-8、单文件超限、总 byte 超限和文件数超限为 deterministic `coverage-gap` 且为 `failed`；所有成功 descriptor read 的 raw bytes 都先消耗总预算，即使随后成为 non-text gap。symlink、non-regular file、read/change failure 或不支持 `O_NOFOLLOW` descriptor open 的 runtime 是 `source-unavailable`。以下受控 reason 是 `unavailable`，绝不伪造 clean 或 partial result：`invalid-options`、`scan-input-unavailable`、`source-unavailable`、`detector-unavailable`、`detector-protocol-failed`、`execution-cancelled`。

## I/O 与安全边界

I/O 只限 files 选择的 local paths；无 command、network、history、environment、home、binary 或 remote secret-manager I/O。POSIX no-follow 打开绑定 final leaf；Bun/Node 没有 portable `openat`/dirfd traversal，因此中间目录或已打开 inode 的恶意并发替换不属于 OS sandbox guarantee，需该隔离级别的调用方应使用 OS-level sandbox。raw detector material 不会进入 result、Record、message、machine output、cache、log 或 error。

## 最小用法

```ts
import { defineConfig, secretDetection } from "@zxyycom/vibe-check";

const definition = defineConfig({
  checks: [
    secretDetection({
      files: { source: "filesystem", include: ["src/**/*"], exclude: ["**/generated/**"] }
    })
  ]
});
```

## 适用边界

只选择需保护的 text-bearing paths，并将 detected material 移除或使用精确、带理由的 waiver。不要把本 Check 当作 history、environment、binary 或 remote-secret scanner。该 guide 的 package Check owner 维护固定 rule set、依赖升级和 synthetic corpus；每次 Secretlint release、engine 或 dependency graph 变化都必须重跑 candidate、installed consumer 和 leak-canary evidence。
