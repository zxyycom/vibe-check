import type {
  DocsMachineValidationDiagnostic,
  DocsMachineValidationFailure
} from "./machine-artifact-types.ts";

export function failure(
  artifactRoot: string,
  logicalArtifact: string,
  diagnostic: Omit<
    DocsMachineValidationDiagnostic,
    "logicalArtifact" | "path"
  >
): DocsMachineValidationFailure {
  return {
    diagnostic: {
      ...diagnostic,
      logicalArtifact,
      path: artifactPath(artifactRoot, logicalArtifact)
    },
    ok: false
  };
}

export function setFailure(
  artifactRoot: string,
  logicalArtifact: string,
  diagnostic: Omit<
    DocsMachineValidationDiagnostic,
    "category" | "logicalArtifact" | "path"
  >
): DocsMachineValidationFailure {
  return failure(artifactRoot, logicalArtifact, {
    ...diagnostic,
    category: "set-invariant"
  });
}

export function artifactPath(
  artifactRoot: string,
  logicalArtifact: string
): string {
  return artifactRoot.endsWith("/")
    ? `${artifactRoot}${logicalArtifact}`
    : `${artifactRoot}/${logicalArtifact}`;
}

export function formatDiagnostic(
  diagnostic: DocsMachineValidationDiagnostic
): string {
  const locations = [
    diagnostic.pointer === undefined ? null : `pointer ${diagnostic.pointer || "/"}`,
    diagnostic.line === undefined ? null : `line ${diagnostic.line}`,
    diagnostic.index === undefined ? null : `index ${diagnostic.index}`,
    diagnostic.relationship === undefined
      ? null
      : `relationship ${diagnostic.relationship}`
  ].filter((value): value is string => value !== null);
  const suffix = locations.length === 0 ? "" : ` (${locations.join(", ")})`;
  return `${diagnostic.path} [${diagnostic.category}]${suffix}: ${diagnostic.message}`;
}
