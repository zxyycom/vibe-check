# Scanner dependencies

This document owns the private scanner-adapter boundary. A scanner adapter protocol remains an implementation
detail; its executable resolution is not a public operational-dependency API.

## Check-owned command options

Configuration owns the concrete initial default values in
[Defaults and native composition](configuration.md#defaults-and-native-composition). This document owns how a
private adapter consumes the validated `options.scanner` value; it does not define a second default-command
surface.

For each default Check, the adapter invokes:

1. scan: `options.scanner.executable` followed by `options.scanner.args`;
2. availability probe: `options.scanner.executable` followed by `options.scanner.availabilityArgs`.

The built-in duplicate Check is the sole exception to a literal executable lookup: its stable default marker is
recognized only by the private adapter, which resolves the installed `jscpd` package manifest's declared bin target
and invokes that target with the active Bun executable. This is package-owned adapter behavior, not a public scanner
configuration or discovery surface. A consumer-supplied complete `options.scanner` branch continues to execute
exactly its supplied command values.

Duplicate detection additionally uses its Check-owned `scanner.maxConcurrency`. A project may use normal object
spread to create a complete replacement options value. Definition validation fails closed for an omitted nested
field, unknown key, invalid command value, zero concurrency, or an unknown code-area threshold. There is no
Run Control, environment-variable, PATH, repository-tool, precedence, or operational map that replaces these
Configuration-owned default option fields.

## Adapter handoff and scope

A default callback receives its validated options, normalized project context, Check reporter, and signal. It
passes its Check-owned command data and Product-approved exact paths to the relevant private adapter. The adapter
owns availability probes, subprocess management, parser details, raw material, backend/cache mechanics, and
scanner-native protocol adaptation.

Every reported source path is slash-normalized and must belong to the approved exact input list. A batch containing
one out-of-scope source is rejected before any record conversion, so adapters cannot publish a partial result.
Current and named-reference measurements each use their own frozen scope. Scanner-private command data and raw
results never enter declarative fingerprints, Core facts, public output, or Run Controls.

## Cache and failures

Duplicate cache identity contains only consumer-owned measurement settings, the exact-input fingerprint, and
backend identity. The default marker maps to a Bun + installed-jscpd backend identity that omits its executable and
declared-bin path, so the same dependency version is not fragmented by consumer install directories; it remains
distinct from the old Node launcher identity. A cache hit revalidates source paths. Policy, acceptance, report
settings, project module path, and unrelated sibling options do not change the cache key. Consumer-supplied commands
keep their existing command identity behavior.

Availability, process, parse, cache, or exact-scope failures are converted by the Check callback/Product boundary
to an unavailable Check outcome. The outcome is safe for public consumption; raw command data and scanner output
are not exposed.

## Verification

Default callback tests prove Check-owned commands, direct context, exact scope, reference, and cache behavior.
Product execution tests prove that callback failure closes the same Core Check path used by custom callbacks.
