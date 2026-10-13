import { recordRemainingArrayCopy } from "./io-trace.mts";
// tmp/low-risk-optimization-20261013/markdown-path/node_modules/after/src/package-checks/markdown-link-validation/filesystem-probes.ts
import { constants } from "node:fs";
import { lstat, open, readlink } from "./io-trace.mts";
import path2 from "node:path";

// tmp/low-risk-optimization-20261013/markdown-path/node_modules/after/src/package-checks/markdown-link-validation/local-resolution.ts
import path from "node:path";
var NOT_LOCAL_FILE_URI = Symbol("not-local-file-uri");
function isWithinRoot(root, candidate) {
  const relativePath = path.relative(root, candidate);
  return relativePath === "" || !relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath);
}
function relativeSegments(root, candidate) {
  const relativePath = path.relative(root, candidate);
  return relativePath === "" ? [] : relativePath.split(path.sep).filter((segment) => segment !== "");
}
function isNotFound(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

// tmp/low-risk-optimization-20261013/markdown-path/node_modules/after/src/package-checks/markdown-link-validation/filesystem-probes.ts
async function probeRootContainedPath(canonicalProjectRoot, candidatePath) {
  if (!isWithinRoot(canonicalProjectRoot, candidatePath)) {
    return Object.freeze({ kind: "outside" });
  }
  let state = {
    currentPath: canonicalProjectRoot,
    pendingSegments: relativeSegments(canonicalProjectRoot, candidatePath),
    segmentIndex: 0,
    symlinkHops: 0
  };
  while (state.segmentIndex < state.pendingSegments.length) {
    const advance = await advanceRootContainedPathProbe(canonicalProjectRoot, state);
    if (!isRootContainedPathProbeState(advance))
      return advance;
    state = advance;
  }
  return Object.freeze({ kind: "contained", absolutePath: state.currentPath });
}
function isRootContainedPathProbeState(value) {
  return "currentPath" in value;
}
async function advanceRootContainedPathProbe(canonicalProjectRoot, state) {
  const segment = state.pendingSegments[state.segmentIndex];
  if (segment === undefined)
    return Object.freeze({ kind: "unavailable" });
  const nextPath = path2.join(state.currentPath, segment);
  const pathStatus = await rootContainedPathStatus(nextPath);
  if (pathStatus.kind !== "status")
    return pathStatus;
  if (!pathStatus.status.isSymbolicLink()) {
    return state.segmentIndex + 1 === state.pendingSegments.length ? Object.freeze({
      kind: "contained",
      absolutePath: nextPath,
      endpoint: endpointFromStatus(pathStatus.status)
    }) : Object.freeze({
      currentPath: nextPath,
      pendingSegments: state.pendingSegments,
      segmentIndex: state.segmentIndex + 1,
      symlinkHops: state.symlinkHops
    });
  }
  recordRemainingArrayCopy(state.pendingSegments.length - state.segmentIndex - 1);
  return advanceThroughContainedSymlink(canonicalProjectRoot, nextPath, state.pendingSegments.slice(state.segmentIndex + 1), state.symlinkHops);
}
async function rootContainedPathStatus(nextPath) {
  try {
    return Object.freeze({ kind: "status", status: await lstat(nextPath) });
  } catch (error) {
    return isNotFound(error) ? Object.freeze({ kind: "missing", absolutePath: nextPath }) : Object.freeze({ kind: "unavailable" });
  }
}
async function advanceThroughContainedSymlink(canonicalProjectRoot, linkPath, remainingSegments, symlinkHops) {
  if (symlinkHops >= 40)
    return Object.freeze({ kind: "unavailable" });
  let linkDestination;
  try {
    linkDestination = path2.resolve(path2.dirname(linkPath), await readlink(linkPath));
  } catch {
    return Object.freeze({ kind: "unavailable" });
  }
  if (!isWithinRoot(canonicalProjectRoot, linkDestination)) {
    return Object.freeze({ kind: "outside" });
  }
  return Object.freeze({
    currentPath: canonicalProjectRoot,
    pendingSegments: [
      ...relativeSegments(canonicalProjectRoot, linkDestination),
      ...remainingSegments
    ],
    segmentIndex: 0,
    symlinkHops: symlinkHops + 1
  });
}
async function probeEndpoint(targetPath) {
  let status;
  try {
    status = await lstat(targetPath);
  } catch (error) {
    return isNotFound(error) ? Object.freeze({ kind: "missing" }) : Object.freeze({ kind: "unavailable" });
  }
  return endpointFromStatus(status);
}
async function readRegularFile(filePath, maxBytes) {
  let handle;
  try {
    handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const status = await handle.stat();
    if (!status.isFile()) {
      return Object.freeze({ ok: false, reason: "unavailable" });
    }
    if (status.size > maxBytes) {
      return Object.freeze({ ok: false, reason: "too-large" });
    }
    const bytes = await readBoundedBytes(handle, maxBytes);
    return bytes === null ? Object.freeze({ ok: false, reason: "too-large" }) : Object.freeze({ ok: true, bytes });
  } catch {
    return Object.freeze({ ok: false, reason: "unavailable" });
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
}
async function readBoundedBytes(handle, maxBytes) {
  const bytes = new Uint8Array(maxBytes + 1);
  let offset = 0;
  while (offset < bytes.byteLength) {
    const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset);
    if (result.bytesRead === 0)
      break;
    offset += result.bytesRead;
  }
  return offset > maxBytes ? null : bytes.slice(0, offset);
}
function endpointFromStatus(status) {
  if (status.isSymbolicLink()) {
    return Object.freeze({ kind: "unavailable" });
  }
  if (status.isDirectory()) {
    return Object.freeze({ kind: "directory" });
  }
  if (status.isFile()) {
    return Object.freeze({ kind: "file" });
  }
  return Object.freeze({ kind: "unsupported" });
}
export {
  readRegularFile,
  probeRootContainedPath,
  probeEndpoint
};
