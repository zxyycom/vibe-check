declare const HANDOFF_PROVIDER_IDENTITY_BRAND: unique symbol;

/** Opaque same-package identity retained only by Definition and invocation execution. */
export type HandoffProviderIdentity = Readonly<{
  readonly [HANDOFF_PROVIDER_IDENTITY_BRAND]: true;
}>;

const handoffProviderIdentities = new WeakMap<object, HandoffProviderIdentity>();

class HandoffProviderIdentityValue implements HandoffProviderIdentity {
  declare readonly [HANDOFF_PROVIDER_IDENTITY_BRAND]: true;
}

/** Registers the identity that makes a `handoff: true` Check authentic to this package runtime. */
export function registerHandoffProviderIdentity(value: object): void {
  handoffProviderIdentities.set(value, Object.freeze(new HandoffProviderIdentityValue()));
}

/** Returns the same-package identity registered by `defineCheck`. */
export function getDefinedHandoffProviderIdentity(
  value: unknown
): HandoffProviderIdentity | undefined {
  return typeof value === "object" && value !== null
    ? handoffProviderIdentities.get(value)
    : undefined;
}

/** Preserves a Definition-validated provider identity during materialization. */
export function bindHandoffProviderIdentity(
  value: object,
  identity: HandoffProviderIdentity
): void {
  handoffProviderIdentities.set(value, identity);
}
