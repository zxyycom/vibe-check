import type { TestEvidenceDiagnosticOrigin } from "../../../../test-evidence/entities.ts";

export type DiagnosticFieldPolicy = Readonly<{
  readonly caseId?: boolean;
  readonly location?: boolean;
  readonly path?: boolean;
  readonly runner?: boolean;
}>;

const SAFE_DIAGNOSTIC_POLICIES: Readonly<
  Record<TestEvidenceDiagnosticOrigin, Readonly<Record<string, DiagnosticFieldPolicy>>>
> = Object.freeze({
  case: Object.freeze({
    "case.entities-empty": { caseId: true, location: true, path: true },
    "case.entities-missing": { caseId: true, location: true, path: true },
    "case.entity-duplicate": { caseId: true, location: true, path: true },
    "case.entity-invalid": { caseId: true, location: true, path: true },
    "case.entity-unknown": { caseId: true, location: true, path: true },
    "case.heading-invalid": { location: true, path: true },
    "case.id-duplicate": { caseId: true, location: true, path: true },
    "case.owner-heading-unknown": { caseId: true, location: true, path: true },
    "case.owner-invalid": { caseId: true, location: true, path: true },
    "case.owner-missing": { caseId: true, location: true, path: true },
    "case.owner-unknown": { caseId: true, location: true, path: true },
    "case.proves-empty": { caseId: true, location: true, path: true },
    "case.proves-invalid": { caseId: true, location: true, path: true },
    "case.proves-missing": { caseId: true, location: true, path: true },
    "cases.directory-invalid": { path: true },
    "cases.nested-directory": { path: true },
    "cases.symlink-unsupported": { path: true },
    "entity.case-missing": { location: true, path: true, runner: true },
    "topic.content-unexpected": { location: true, path: true },
    "topic.duplicate": { path: true },
    "topic.file-invalid": { path: true },
    "topic.file-missing": { path: true },
    "topic.heading-invalid": { location: true, path: true },
    "topic.heading-unexpected": { location: true, path: true },
    "topic.invalid": { path: true },
    "topic.unknown": { path: true },
    "topics.invalid": { path: true },
    "topics.missing": { path: true }
  }),
  profile: Object.freeze({
    "runner-profile-invalid": { runner: true }
  }),
  query: Object.freeze({}),
  runner: Object.freeze({
    "duplicate-entity": { runner: true },
    "runner-report-failed": { runner: true },
    "runner-report-invalid": { runner: true },
    "runtime-only": { runner: true }
  }),
  static: Object.freeze({
    "duplicate-entity": { location: true, path: true, runner: true },
    "static-only": { location: true, path: true, runner: true },
    "static-scan-failed": { location: true, path: true, runner: true },
    "unsupported-entity-shape": { location: true, path: true, runner: true }
  })
});

/** The semantic Case owner's closed diagnostic field allowlist. */
export function testEvidenceDiagnosticPolicy(
  origin: TestEvidenceDiagnosticOrigin,
  code: string
): DiagnosticFieldPolicy | undefined {
  return SAFE_DIAGNOSTIC_POLICIES[origin][code];
}
