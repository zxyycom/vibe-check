import { createHash } from "node:crypto";

import { MOMOA_LICENSE_SHA256, PACKAGE_LICENSE_SHA256 } from "./package-contract.ts";

export function assertJSDocExamplePayloads(input: {
  readonly declarationSources: readonly string[];
  readonly description: string;
  readonly expectedPayloads: readonly string[];
}): void {
  const { declarationSources, description, expectedPayloads } = input;
  for (const payload of expectedPayloads) {
    const expectedCommentPayload = payload
      .split("\n")
      .map((line) => (line.length === 0 ? " *" : ` * ${line}`))
      .join("\n");
    if (!declarationSources.some((source) => source.includes(expectedCommentPayload))) {
      throw new Error(`${description} is missing a generated JSDoc example payload`);
    }
  }
}

export function assertMomoaLicenseContent(content: Buffer): void {
  const sha256 = createHash("sha256").update(content).digest("hex");
  if (sha256 !== MOMOA_LICENSE_SHA256) {
    throw new Error("candidate Momoa license material does not match the approved source text");
  }
}

export function assertPackageLicenseContent(content: Buffer): void {
  const sha256 = createHash("sha256").update(content).digest("hex");
  if (sha256 !== PACKAGE_LICENSE_SHA256) {
    throw new Error("candidate own MIT license does not match the approved holder and text");
  }
}

export function sameOrderedStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
