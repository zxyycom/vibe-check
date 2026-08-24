/** Package-private static shape for Product's detached canonical JSON facts. */
export type CanonicalJsonPrimitive = boolean | null | number | string;

export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | CanonicalJsonObject;

export interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}
