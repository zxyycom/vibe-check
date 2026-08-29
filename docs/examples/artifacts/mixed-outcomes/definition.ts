import { defineCheck, defineConfig, inherit, jsonValidation } from "vibe-check";

interface ReleaseInputsData {
  readonly files: readonly string[];
  readonly version: 1;
}

const configuredReleaseInputFiles: readonly string[] = [];

// 一个随包 Check：只验证 project root 的 package.json，并保留其它文件选择默认值。
const packageManifest = jsonValidation({
  files: { include: ["package.json"] }
});

// 一个 typed provider：preflight 用 fallback 准备 invocation-local options。
const releaseInputs = defineCheck({
  checkId: "example-release-inputs",
  displayName: "Example release inputs",
  options: { files: configuredReleaseInputFiles },
  parseData(data): ReleaseInputsData {
    const files = data.files;
    if (
      Object.keys(data).length !== 2 ||
      data.version !== 1 ||
      !Array.isArray(files) ||
      !files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported example release-input data");
    }
    return { files: [...files], version: 1 };
  },
  preflight(options) {
    if (options.files.length > 0) {
      return { status: "success", preparedOptions: options };
    }
    return {
      status: "failure",
      action: "continue",
      fallback: { files: ["package.json"] },
      reason: { code: "default-release-input" },
      messages: [
        {
          level: "warning",
          code: "default-release-input",
          message: "未配置发布输入；本次调用改用 package.json。"
        }
      ]
    };
  },
  visibility: "attention",
  execution({ options, signal }) {
    if (signal.aborted) {
      return { status: "unavailable", reason: { code: "execution-cancelled" } };
    }
    return {
      status: "passed",
      data: { files: [...options.files], version: 1 as const }
    };
  }
});

// 一个 downstream policy：读取内置 Check 和 typed provider 的 final data。
const releasePolicy = defineCheck({
  checkId: "example-release-policy",
  displayName: "Example release policy",
  dependsOn: inherit({ add: [releaseInputs.checkId] }),
  options: { minimumFileCount: 2 },
  visibility: "attention",
  execution({ dependencies, options, records }) {
    const manifestRead = dependencies.get(packageManifest.checkId);
    if (!manifestRead.ok) {
      return {
        status: "unavailable",
        reason: { code: "manifest-data-unavailable" },
        messages: [
          {
            level: "error",
            code: "manifest-data-unavailable",
            message: "请检查 json-validation 的 terminal outcome，并恢复可解析的 final data。"
          }
        ]
      };
    }
    const inputsRead = dependencies.get(releaseInputs.checkId);
    if (!inputsRead.ok) {
      return {
        status: "unavailable",
        reason: { code: "release-input-data-unavailable" },
        messages: [
          {
            level: "error",
            code: "release-input-data-unavailable",
            message: "请检查 release-input provider 的 terminal outcome，并恢复可解析的 final data。"
          }
        ]
      };
    }

    const manifest = packageManifest.parseData(manifestRead.data);
    const inputs = releaseInputs.parseData(inputsRead.data);
    const data = {
      manifestValid: manifest.invalidFileCount === 0,
      minimumFileCount: options.minimumFileCount,
      selectedFileCount: inputs.files.length
    };

    for (const file of inputs.files) {
      records.report({ id: `selected:${file}` }, { kind: "release-input", path: file });
    }
    if (!data.manifestValid) {
      records.report(
        { id: "package-manifest-invalid" },
        { invalidFileCount: manifest.invalidFileCount, severity: "error" }
      );
    }
    if (data.selectedFileCount < data.minimumFileCount) {
      records.report(
        { id: "minimum-file-count" },
        {
          actual: data.selectedFileCount,
          expected: data.minimumFileCount,
          severity: "error"
        }
      );
    }

    if (data.manifestValid && data.selectedFileCount >= data.minimumFileCount) {
      return { status: "passed", data };
    }
    return {
      status: "failed",
      data,
      messages: [
        {
          level: "error",
          code: "release-policy-failed",
          message: "请修复 package.json，并补足发布输入。"
        }
      ]
    };
  }
});

const optionalDocumentation = defineCheck({
  checkId: "example-optional-documentation",
  displayName: "Example optional documentation",
  options: { enabled: false },
  execution: ({ options }) =>
    options.enabled
      ? { status: "passed", data: { reviewed: true } }
      : { status: "not-applicable", reason: { code: "documentation-disabled" } }
});

// block preflight 会在任何 Check execution 开始前把本 Check 结算为 unavailable。
const externalReview = defineCheck({
  checkId: "example-external-review",
  displayName: "Example external review",
  options: { serviceConfigured: false },
  preflight(options) {
    if (options.serviceConfigured) {
      return { status: "success", preparedOptions: options };
    }
    return {
      status: "failure",
      action: "block",
      reason: { code: "review-service-unconfigured" },
      messages: [
        {
          level: "error",
          code: "review-service-unconfigured",
          message: "启用此 Check 前请先配置 review service。"
        }
      ]
    };
  },
  execution: () => ({ status: "passed", data: { reviewed: true } })
});

// 组织节点自身不产生 outcome；children 继承 packageManifest dependency 和并行预算。
const releaseWorkflow = defineCheck({
  checkId: "example-release-workflow",
  displayName: "Example release workflow",
  checks: [releaseInputs, releasePolicy, optionalDocumentation, externalReview],
  dependsOn: [packageManifest.checkId],
  maxParallel: 2
});

export default defineConfig({
  checks: [packageManifest, releaseWorkflow],
  outputs: {
    machinePublication: { directory: "artifacts/vibe-check", enabled: true },
    progressRendering: { enabled: false }
  },
  scheduler: { maxParallel: 3 }
});
