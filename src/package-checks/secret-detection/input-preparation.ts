import { closeSync, constants, fstatSync, openSync, readSync } from "node:fs";
import { resolve } from "node:path";

import type { CheckExecutionContext } from "../../check/check.ts";
import {
  classifySecretDetectionBytes,
  type SecretDetectionCoverageGapReason
} from "./classification.ts";
import type { ResolvedSecretDetectionOptions } from "./options.ts";

/** Private, already-classified text passed to this Check's private detector adapter. */
export interface ApprovedTextInput {
  readonly content: string;
  readonly path: string;
}

/** A safe explanation for an exact selected input that did not receive detector coverage. */
export interface SecretCoverageGap {
  readonly path: string;
  readonly reason: SecretDetectionCoverageGapReason;
}

export type PreparedSecretDetectionInputs = Readonly<
  | { readonly kind: "cancelled" }
  | { readonly kind: "unavailable" }
  | {
      readonly coverageGaps: readonly SecretCoverageGap[];
      readonly inputs: readonly ApprovedTextInput[];
      readonly kind: "complete";
    }
>;

/** Reads and classifies the already-selected paths before the detector can receive text. */
export function prepareSecretDetectionInputs(
  context: CheckExecutionContext<ResolvedSecretDetectionOptions>,
  selectedPaths: readonly string[]
): PreparedSecretDetectionInputs {
  const coverageGaps: SecretCoverageGap[] = [];
  const inputs: ApprovedTextInput[] = [];
  let consumedBytes = 0;

  for (const [index, path] of selectedPaths.entries()) {
    if (context.signal.aborted) return Object.freeze({ kind: "cancelled" });
    const selectionLimit = selectionLimitGaps(
      context.options.maximumFileCount,
      selectedPaths,
      index
    );
    if (selectionLimit !== undefined) {
      coverageGaps.push(...selectionLimit);
      break;
    }
    const prepared = prepareSelectedInput(context, path, consumedBytes);
    if (prepared.kind === "cancelled" || prepared.kind === "unavailable") return prepared;
    if (prepared.kind === "coverage-gap") {
      consumedBytes += prepared.consumedBytes;
      coverageGaps.push(Object.freeze({ path, reason: prepared.reason }));
      if (prepared.stop) {
        coverageGaps.push(...coverageGapsFor(selectedPaths.slice(index + 1), "total-byte-limit"));
        break;
      }
      continue;
    }
    consumedBytes += prepared.byteLength;
    inputs.push(prepared.input);
  }
  return Object.freeze({
    coverageGaps: Object.freeze(coverageGaps),
    inputs: Object.freeze(inputs),
    kind: "complete"
  });
}

type PreparedSelectedInput = Readonly<
  | { readonly kind: "cancelled" }
  | { readonly kind: "unavailable" }
  | {
      readonly consumedBytes: number;
      readonly kind: "coverage-gap";
      readonly reason: SecretDetectionCoverageGapReason;
      readonly stop: boolean;
    }
  | { readonly byteLength: number; readonly input: ApprovedTextInput; readonly kind: "approved" }
>;

type BoundedRegularFileRead = Readonly<
  | { readonly kind: "unavailable" }
  | {
      readonly kind: "coverage-gap";
      readonly reason: Extract<
        SecretDetectionCoverageGapReason,
        "file-byte-limit" | "total-byte-limit"
      >;
    }
  | { readonly bytes: Uint8Array; readonly kind: "complete" }
>;

function selectionLimitGaps(
  maximumFileCount: number,
  selectedPaths: readonly string[],
  index: number
): readonly SecretCoverageGap[] | undefined {
  if (index < maximumFileCount) return undefined;
  return coverageGapsFor(selectedPaths.slice(index), "file-count-limit");
}

function prepareSelectedInput(
  context: CheckExecutionContext<ResolvedSecretDetectionOptions>,
  path: string,
  consumedBytes: number
): PreparedSelectedInput {
  if (context.signal.aborted) return Object.freeze({ kind: "cancelled" });
  const read = readBoundedRegularFile({
    consumedBytes,
    filePath: resolve(context.project.root, path),
    options: context.options
  });
  if (read.kind === "unavailable") return read;
  if (read.kind === "coverage-gap") {
    return Object.freeze({
      consumedBytes: 0,
      kind: "coverage-gap",
      reason: read.reason,
      stop: read.reason === "total-byte-limit"
    });
  }
  if (context.signal.aborted) return Object.freeze({ kind: "cancelled" });

  const classification = classifySecretDetectionBytes(read.bytes, context.options.maximumFileBytes);
  if (classification.kind === "coverage-gap") {
    return Object.freeze({
      consumedBytes: read.bytes.byteLength,
      kind: "coverage-gap",
      reason: classification.reason,
      stop: false
    });
  }
  return Object.freeze({
    byteLength: read.bytes.byteLength,
    input: Object.freeze({ content: classification.content, path }),
    kind: "approved"
  });
}

function readBoundedRegularFile(input: {
  readonly consumedBytes: number;
  readonly filePath: string;
  readonly options: ResolvedSecretDetectionOptions;
}): BoundedRegularFileRead {
  const descriptor = openRegularFileWithoutFollowingSymlink(input.filePath);
  if (descriptor === undefined) return Object.freeze({ kind: "unavailable" });
  try {
    const byteLength = regularFileByteLength(descriptor);
    if (byteLength === undefined) return Object.freeze({ kind: "unavailable" });
    const limit = resourceLimitReason(input.options, byteLength, input.consumedBytes);
    if (limit !== undefined) return Object.freeze({ kind: "coverage-gap", reason: limit });

    const bytes = readExactBoundedBytes(descriptor, byteLength);
    if (bytes === undefined || regularFileByteLength(descriptor) !== byteLength) {
      return Object.freeze({ kind: "unavailable" });
    }
    return Object.freeze({ bytes, kind: "complete" });
  } catch {
    return Object.freeze({ kind: "unavailable" });
  } finally {
    closeDescriptor(descriptor);
  }
}

function closeDescriptor(descriptor: number): void {
  try {
    closeSync(descriptor);
  } catch {
    // The descriptor cannot carry source bytes into a public result; preserve the completed read fact.
  }
}

function openRegularFileWithoutFollowingSymlink(filePath: string): number | undefined {
  if (!supportsNoFollowDescriptorOpen()) return undefined;
  try {
    return openSync(filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    return undefined;
  }
}

function supportsNoFollowDescriptorOpen(): boolean {
  return process.platform !== "win32" && constants.O_NOFOLLOW !== 0;
}

function regularFileByteLength(descriptor: number): number | undefined {
  try {
    const details = fstatSync(descriptor);
    return details.isFile() && Number.isSafeInteger(details.size) && details.size >= 0
      ? details.size
      : undefined;
  } catch {
    return undefined;
  }
}

function readExactBoundedBytes(descriptor: number, byteLength: number): Uint8Array | undefined {
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const read = readSync(
      descriptor,
      bytes,
      offset,
      Math.min(65_536, bytes.byteLength - offset),
      null
    );
    if (read <= 0) return undefined;
    offset += read;
  }
  return bytes;
}

function resourceLimitReason(
  options: ResolvedSecretDetectionOptions,
  byteLength: number,
  consumedBytes: number
): Extract<SecretDetectionCoverageGapReason, "file-byte-limit" | "total-byte-limit"> | undefined {
  if (byteLength > options.maximumFileBytes) return "file-byte-limit";
  return consumedBytes + byteLength > options.maximumTotalBytes ? "total-byte-limit" : undefined;
}

function coverageGapsFor(
  paths: readonly string[],
  reason: SecretDetectionCoverageGapReason
): readonly SecretCoverageGap[] {
  return Object.freeze(paths.map((path) => Object.freeze({ path, reason })));
}
