---
title: "Momoa 选型确认与 Bun/candidate 闭合 spike"
formedAt: "2026-08-24T14:28:56Z"
question: "在 Vibe Check 的 `add-json-validation` Change 中，哪个库能以最小 adapter 在 Bun 中验证严格 JSON 并可靠检测 decoded duplicate key，同时怎样在热度、生态、接入复杂度与运行时重量之间取舍？"
tags:
  - "implementation-libraries"
  - "json-validation"
relations:
  - type: "补充"
    target: "compare-minimal-json-duplicate-key-candidates.md"
---

## 形成时背景

用户在看完“零依赖只校验严格 JSON”“Clarinet 极简组合”与 Momoa 的直接加载面比较后，明确选择 Momoa，并接受其较大的单入口代码面。此前调查只从 npm tarball 和临时样本得到候选判断，尚未把 Momoa 安装为项目 production dependency，也没有证明它能从本项目实际 candidate tarball 的外部 Bun consumer 解析。

本报告形成时，`add-json-validation` 仍未实现 Product runtime；其 Change-local `maximumBytes`、`.json` eligibility、issue cap/truncation、safe Record/final-data schema 与位置公开方式仍未收敛。用户的选择只授权 parser 选型与最小 dependency/spike 闭合，不把这些未决 public-contract choices 静默定为实现默认值。

## 调查目的

1. 将用户确认的 Momoa 选择与“已安装、已通过严格语义 spike、已进入 candidate dependency closure”区分记录。
2. 在 Bun 与 ancestry-external candidate consumer 中验证 Momoa 的实际 import、strict JSON 行为、decoded duplicate-key AST 语义和位置单位。
3. 记录 license/material 审计所能证明与尚不能证明的边界，避免把 manifest SPDX 字段误作 package legal-material 完成。

## 调查范围与依据

在本工作区执行 `pnpm add --save-prod @humanwhocodes/momoa@3.3.12`，得到 root `package.json` 和 `pnpm-lock.yaml` 的精确 production dependency；`pnpm why @humanwhocodes/momoa` 显示仅由 `vibe-check@0.1.0 (dependencies)` 引入。然后将相同精确版本加入 `scripts/package/artifact/package-contract.ts` 的 candidate dependency contract，并把 artifact test 的独立 expected manifest literal 同步为该直接依赖。

使用 Bun `1.3.14` 的临时、删除后不保留脚本，以 `{ mode: "json", allowTrailingCommas: false, ranges: true }` 调用 `parse()`：覆盖 `null`、boolean、number、string、array、object root；BOM、comment、trailing comma、trailing content、empty text、unquoted key 与 `NaN` 的拒绝；direct/nested `"a"`/`"\\u0061"` duplicate 的 AST decoded name；以及 emoji 前缀下 `loc.offset`/`range` 与 UTF-8 byte length 的比较。它不实现或调用 Vibe Check 的未来 JSON Check。

运行 `bun test scripts/package/artifact/artifact.test.ts`，并用 temporary state directory 和 ancestry-external temporary consumer 调用现有 `preparePackageCandidate`：candidate tarball 安装后，consumer 从 `@humanwhocodes/momoa` import `parse()`、得到 `['a', 'a']`，且 installed `vibe-check/package.json` 声明该 exact direct dependency。该 consumer 的 manifest 没有 Momoa direct dependency，因此该解析不能来自 repository source 或 consumer manifest。检查实际安装包的 `package.json` 得到 `license: "Apache-2.0"`、`engines.node: ">=18"`，且没有 production dependencies；完整 file inventory 未发现独立 license text。pnpm 在 host Node `26.7.0` 上提示仓库 `engines` 只接受 `>=24 <25`，这是 pnpm host-engine warning，不是 Bun `1.3.14` import failure。

## 调查结果与边界

**已确认和已执行。** 用户选择已写入 active/unaligned Decision 和 active Change；Momoa 现在是 root 与 candidate manifest 的精确 production dependency。Bun 实测 ESM import 成功，strict matrix 中六种合法 root 都成功、上述七种非严格输入都抛错。Momoa 不把 duplicate 视为 parse error，而是保留每个 `Object.members` 的 decoded name，因此 owning adapter 可以在 materialization 前将 direct 与 nested escaped duplicate 归一化为 Check-owned issue。候选 tarball 在临时外部 Bun consumer 中携带并解析了相同版本，证明 source workspace 的 ambient installation 不是这项结论的依据。

**位置语义。** emoji 样本中第二个 member 的 source UTF-16 index、Momoa `loc.start.offset` 与 `range[0]` 都是 `10`，而其前缀 UTF-8 bytes 是 `12`。因此若首版公开位置，必须明确为 UTF-16 code-unit offset，或在 Change 的 open question 中选择不公开位置；不能把 Momoa offset 标成 byte offset。

**license/material 结果。** `Apache-2.0` manifest 是可复核的 package metadata，足以进入后续 license review；但已安装 tarball 不包含 separate license text，且本项目尚未把该 third-party material 纳入 candidate legal inventory。故不能把 SPDX metadata 说成完整 license/material closure，也不能把 Decision 标为 aligned。

**仍未验证与不应外推。** 本轮没有实现 private strict-document helper、bounded read、safe Record/final data、four-state settlement、issue cap/pointer semantics 或 public `jsonValidation`；未修改 Product semantic Cases；未跑完整 `typecheck`、`lint`、required/full Gate 或 benchmark Momoa 的 AST memory/throughput。严格 parser 的 direct behavior 不能替代最终 Check contract。库选型调查本身到此结束；上述 implementation/contract work 由 Change 和 Decision owner 继续承接，若 Momoa 版本、Bun compatibility 或内存预算改变，需要重新调查。
