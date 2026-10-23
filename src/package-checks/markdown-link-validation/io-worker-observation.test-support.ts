/** Shared atomic layout for the parent test and its instrumented native Worker. */
export const IO_OBSERVATION = Object.freeze({
  entered: 0,
  released: 1,
  closeCount: 2,
  readCount: 3,
  openCount: 4,
  byteLength: 5 * Int32Array.BYTES_PER_ELEMENT
});

export const NATIVE_OPERATIONS = Object.freeze([
  "lstat",
  "readlink",
  "open",
  "fstat",
  "read",
  "close"
] as const);
export type NativeOperation = (typeof NATIVE_OPERATIONS)[number];

export function isNativeOperation(value: unknown): value is NativeOperation {
  return NATIVE_OPERATIONS.some((operation) => operation === value);
}
