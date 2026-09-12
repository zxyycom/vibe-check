# `secretDetection`

## 用途

`secretDetection({ files })` 是随包 ordinary Check，发现高置信 PEM private-key material。它不是全面 credential protection，也不验证 secret 有效性。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, run, secretDetection } from "@zxyycom/vibe-check";

const check = secretDetection({
  files: { source: "filesystem", include: ["src/**/*"], exclude: ["**/generated/**"] }
});
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`Secret detection did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。若需接受 `not-applicable` 或聚合多个 Check，
显式配置并读取 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation)；`run(...)` 返回本身不表示通过。

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

代码块中的 `files` 是示例选择，其余为默认值。三个 limit 都是正安全整数，可收窄或显式提高。
files grammar、source failure 与数组替换见[共享 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)。
options 不接受 arbitrary regex、command、baseline、detector allowlist 或 message suppression。

## 工作原理

1. 按显式 `files` 收集 exact project-relative paths，先应用文件数限制。
2. 在受支持 POSIX runtime 中，先用 `lstat` 取得 final leaf 的 regular-file 身份，再以 `O_NOFOLLOW` 打开 descriptor，
   并要求 descriptor 的 device/inode 身份与路径身份一致。随后在同一 descriptor 上检查 size，并在单文件/剩余总预算内
   分块读取。symlink、无可靠文件身份或身份在打开前变化的路径不获 detector coverage。Windows 分支会以 read-only flag
   尝试同一身份握手，避免仅因平台缺少 `O_NOFOLLOW` 就预先拒绝普通文件；这是 portability optimization，不扩展受支持平台契约。
3. 成功读取后检查 NUL 与 fatal UTF-8，只有 approved text 交给 private adapter；它不接收 project root，也不重新枚举文件。

adapter 固定使用 [Secretlint v13.0.5](https://github.com/secretlint/secretlint/releases/tag/v13.0.5) 中 MIT-licensed 的
`@secretlint/core@13.0.5` 与 `@secretlint/secretlint-rule-privatekey@13.0.5` 单规则集合。
第三方 source/result/message/data/exception 只短暂存在 invocation-owned memory；立即投影为 rule ID、path、safe line/column、
`text-document` structural class 与 ordinal，不返回 raw value、substring、hash、message 或 stack。

## 效果与结果

`parseSecretDetectionData(data)`（或返回 Check 的 `parseData`）只在 `passed` 或 `failed` 时验证并恢复：

```ts
{ selectedFileCount, scannedFileCount, findingCount, waivedFindingCount, coverageGapCount }
```

`selectedFileCount` 是 exact selection 数；其中 `scannedFileCount` 获 bounded text coverage，`coverageGapCount` 未获得，
恒有 `scannedFileCount + coverageGapCount === selectedFileCount`。`findingCount` 包括所有安全 Finding；
`waivedFindingCount` 是被唯一 waiver 匹配的子集，不得大于总数。未 waived 的 Finding 是 actionable。

非空 selection 中，存在 actionable Finding 或 coverage gap 即 `failed`，否则 `passed`。Records 分为：

- `secret-finding`：只含 blocking、rule ID、path、safe location、structural class、ordinal，以及 applied 时的 `waiver.reason`。
- `coverage-gap`：`{ kind: "coverage-gap", path, reason, blocking: true }`，不可豁免。
- `finding-waiver-audit`：unused/overmatched authoring 的 identity、reason、matchCount 与 status，不豁免任何 Finding。

Actionable Finding 附 `secret-findings` error，coverage gap 附 `incomplete-coverage` error；applied waiver 附 `finding-waived` info，
unused/overmatched 附 warning。公开类型为 `SecretDetectionOptions`、`ResolvedSecretDetectionOptions`、`SecretDetectionFinalData`、
`SecretDetectionRecordData` 与 `SecretDetectionUnavailableReasonCode`。

`findingWaivers` 采用[共同 waiver reconciliation/audit](../guides/finding-waivers.md#随包-check-的采用边界)：identity 恰为
`{ path, ruleId: "@secretlint/secretlint-rule-privatekey", structuralClass: "text-document", ordinal }`，不含 value/message/line/hash。
唯一匹配的 finding 是 **waived finding**：它仍保留原 finding Record 与 reason，但不再计入 actionable finding。coverage gap
与 unavailable 不受 waiver 影响。

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

空 selection 为 `not-applicable / no-eligible-input`，无 final data；configured waiver 仍产生 unused audit。

- NUL、invalid UTF-8、单文件/总 bytes/文件数超限是 deterministic `coverage-gap`，使 Check `failed`。
  成功 descriptor read 的 raw bytes 先消耗总预算，即使随后成为 non-text gap。
- symlink、非 regular file、无法取得可靠 device/inode 身份、open 前身份变化、POSIX 不支持 `O_NOFOLLOW` 或 read/change
  failure：`source-unavailable`。
- whole-Check `unavailable` 的 closed reasons 为 `invalid-options`、`scan-input-unavailable`、`source-unavailable`、
  `detector-unavailable`、`detector-protocol-failed`、`execution-cancelled`。它们附同 code 的 error message，无 final data 或 partial result。

## I/O 与安全边界

I/O 只限 files 选择的 local paths；无 command、network、history、environment、home、binary 或 remote secret-manager I/O。
raw detector material 不进入 result、Record、message、machine output、cache、log 或 error。

这些检查只绑定 final leaf；Node 没有 portable `openat`/dirfd traversal，无法保证中间目录不被恶意并发替换，也无法排除
已打开 inode 的同长度并发写入。Windows portability branch 未经本次原生 Windows 文件系统验证；路径若在 `lstat` 后被换为
redirection，底层 open 可能取得目标 descriptor，但身份不匹配时不会读取或交给 detector。需要已承诺的 POSIX 边界之外的
平台保证或更强隔离时，调用方须自行验证目标 runtime，并使用 OS-level sandbox。

## 适用边界

只选择需保护的 text-bearing paths；发现材料后应移除或使用精确、带理由的 waiver，不将本 Check 当作全面 secret scanner。
