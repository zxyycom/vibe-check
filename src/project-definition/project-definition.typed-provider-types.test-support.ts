import { defineCheck, type Check, type CheckDataParser, type CheckResult } from "../check/check.ts";

interface ChangedFilesData {
  readonly files: readonly string[];
  readonly version: 1;
}

function changedFilesProvider(files: readonly string[] = []) {
  return defineCheck({
    checkId: "changed-files",
    displayName: "Changed files",
    parseData(data): ChangedFilesData {
      return data.version === 1 && Array.isArray(data.files)
        ? {
            files: data.files.filter((value): value is string => typeof value === "string"),
            version: 1
          }
        : { files: [], version: 1 };
    },
    execution(): CheckResult<ChangedFilesData> {
      return { status: "passed", data: { files, version: 1 } };
    }
  });
}

function _typeCheckTypedProviderData() {
  const changedFiles = changedFilesProvider(["src/index.ts"]);
  const parsed: ChangedFilesData = changedFiles.parseData({ files: [], version: 1 });
  const canonicalIdentityParser: CheckDataParser = (data) => data;
  // @ts-expect-error the default parser contract rejects erased asynchronous returns.
  const asyncParserWithErasedReturn: CheckDataParser = async () => ({ version: 1 });
  void parsed.files;
  void asyncParserWithErasedReturn;
  void canonicalIdentityParser;
}

function _typeCheckProviderParserReuse() {
  const changedFiles = changedFilesProvider();
  const variableParser = changedFiles.parseData;
  const variableProvider = defineCheck({
    checkId: "variable-provider",
    displayName: "Variable provider",
    execution(): CheckResult<ChangedFilesData> {
      return { status: "passed", data: { files: [], version: 1 } };
    },
    parseData: variableParser
  });
  const variableData: ChangedFilesData = variableProvider.parseData({ files: [], version: 1 });
  const explicitUndefined = defineCheck({
    checkId: "undefined-parser",
    displayName: "Undefined parser",
    execution: () => ({ status: "passed", data: {} }),
    parseData: undefined
  });
  const _omittedParser: undefined = explicitUndefined.parseData;
  void variableData;
}

function _typeCheckProviderOptionsAndComposition() {
  const changedFiles = changedFilesProvider();
  const optionAware = defineCheck({
    checkId: "typed-options",
    displayName: "Typed options",
    options: { maximum: 5 },
    preflight: (options) => ({ status: "success", preparedOptions: options }),
    parseData(data): { readonly count: number } {
      return { count: typeof data.count === "number" ? data.count : 0 };
    },
    execution({ options }) {
      return { status: "passed", data: { count: options.maximum } };
    }
  });
  const optionData: number = optionAware.parseData({ count: 1 }).count;
  const recursive: Check = {
    checkId: "typed-container",
    checks: [changedFiles, optionAware],
    displayName: "Typed container"
  };
  const spread = defineCheck({
    ...changedFiles,
    checkId: "spread-provider",
    displayName: "Spread provider"
  });
  const spreadData: ChangedFilesData = spread.parseData({ files: [], version: 1 });
  void optionData;
  void recursive;
  void spreadData;
}

function _typeCheckProviderRejections() {
  const broadCheck = {
    checkId: "broad-check",
    displayName: "Broad check",
    execution: () => ({ status: "passed" as const, data: {} }),
    // @ts-expect-error broad Check is ordinary; typed providers use defineCheck.
    parseData(_data: Readonly<Record<string, unknown>>) {
      return {};
    }
  } satisfies Check;
  void broadCheck;

  defineCheck({
    checkId: "mismatched-provider",
    displayName: "Mismatched provider",
    parseData(_data): ChangedFilesData {
      return { files: [], version: 1 };
    },
    // @ts-expect-error execution final data must match this provider's parser return.
    execution: () => ({ status: "passed", data: { paths: [], version: 1 } })
  });

  defineCheck({
    checkId: "async-parser",
    displayName: "Async parser",
    // @ts-expect-error provider parsers synchronously restore canonical runtime data.
    async parseData(_data) {
      return { files: [], version: 1 } satisfies ChangedFilesData;
    },
    execution: () => ({ status: "passed", data: { files: [], version: 1 } })
  });

  const maybeAsyncParser = (
    _data: Readonly<Record<string, unknown>>
  ): ChangedFilesData | Promise<ChangedFilesData> => ({ files: [], version: 1 });
  defineCheck({
    checkId: "maybe-async-parser",
    displayName: "Maybe async parser",
    // @ts-expect-error a maybe-async parser cannot define synchronous final data.
    execution(): CheckResult<ChangedFilesData | Promise<ChangedFilesData>> {
      return { status: "passed", data: { files: [], version: 1 } };
    },
    // @ts-expect-error every typed provider parser return constituent must be synchronous.
    parseData: maybeAsyncParser
  });

  // @ts-expect-error a typed provider parser requires execution.
  defineCheck({
    checkId: "parser-container",
    displayName: "Parser container",
    parseData(_data: Readonly<Record<string, unknown>>): ChangedFilesData {
      return { files: [], version: 1 };
    }
  });
}
