# FDR Sentinel

**Trust every instrument. Track every decision.**

An interactive, browser-only prototype for security deposit (FDR) instrument integrity
and lifecycle oversight, built for **SIH26265 · AICTE · Smart Automation**.

FDR Sentinel treats an FDR as more than a scanned PDF. It separates four questions that are
usually collapsed into one status:

1. **What does the record claim?** — institution-submitted metadata.
2. **What does the document say?** — extracted values and provenance.
3. **What has actually been confirmed?** — field-level evidence, not record-level claims.
4. **What is the instrument allowed to do next?** — policy-enforced lifecycle transitions.

The prototype is deterministic, explainable, and honest about what it does not do. It does not
call bank systems, does not use an external AI service, and does not declare fraud. Potential
duplicates and OCR ambiguity are review prompts, not conclusions.

---

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The app starts with synthetic seed data and the AICTE
Administrator persona.

```bash
npm run lint     # ESLint, zero warnings
npm run test     # Vitest business-rule suite
npm run build    # production bundle in dist/
npm run preview  # serve the production build
```

---

## Five-minute demo path

The fastest route through the differentiators is also shown on the dashboard and the
Demo Scenarios page:

1. **Dashboard** — institutional scale, exposure, urgent actions, and audit heartbeat.
2. **Integrity Intelligence** — open `FND-2026-001`, the cross-institution reference conflict.
3. **Evidence Passport** — inspect `FDR-2026-004` and see which fields are confirmed versus pending.
4. **Lifecycle** — attempt release of `FDR-2026-017` without approving-authority sign-off.
5. **Deadlines** — open the overdue renewal queue for `FDR-2025-024`.
6. **Audit Trail** — confirm the blocked transition and every prior action are chained.

`Demo Scenarios` runs six deterministic business scenarios through the same service layer as
the UI and records each run in the audit trail.

---

## What is implemented

### Oversight

- **Dashboard** — exposure, lifecycle mix, verification coverage, integrity risk, priority queue,
  upcoming maturities, recent audit events.
- **FDR Registry** — filter by query, lifecycle, verification, integrity, institution, bank,
  maturity window and amount; sortable table; pagination; CSV export; officer scoping.
- **Register FDR** — four-step form, client-side document validation, image/PDF preview, maturity
  suggestion, field evidence generation, acknowledgement, permission gating.
- **Instrument detail** — overview, document, integrity, evidence passport, lifecycle and audit
  tabs; controlled metadata correction; CSV export.
- **Institutions** — institutional cards, derived exposure and attention index, linked FDRs,
  active findings, register/edit institution dialog.

### Intelligence

- **Integrity engine** — deterministic rules for required fields, format, date order, amount
  variance, submitted-vs-extracted mismatch, OCR-confusable references, cross-record reference
  reuse, fuzzy similarity, release policy violations and verification inactivity.
- **Explainable findings** — every finding names its rule, compared fields, match type,
  confidence, recommended reviewer action, and evidence gaps.
- **Review workflow** — confirm discrepancy, mark potential false positive, request more
  verification, or resolve after correction. History is retained.
- **Evidence passport** — submitted, extracted, and normalized values per field; status,
  provenance, confidence, notes, follow-ups, and simulated confirmation.
- **Verification Center** — queue and case workspace with checklist, blocking findings, and
  permission-aware decisions.

### Operations and governance

- **Lifecycle engine** — explicit transition table with role permissions, institution scoping,
  reason requirements, verification prerequisites, approval prerequisites, and material-finding
  blocks. Blocked attempts are audited.
- **Deadline intelligence** — 30/60/90-day configuration, maturity and renewal actions, overdue
  escalation, acknowledgement, assignment and completion rules. Finding and release actions
  cannot be closed from the queue.
- **Audit trail** — hash-chained local events, chain verification, entity filters, CSV export.
- **Reports** — exposure by institution, verification mix, lifecycle mix, finding severity,
  institution summary, period and institution filters, CSV export.
- **Settings** — lead times, thresholds, notification preferences, role preview, local JSON
  snapshot, and guarded demo reset.
- **Global search** — keyboard shortcut `Ctrl/Cmd+K`; jumps to instruments, institutions or findings.

---

## Seeded scenarios

| Scenario | Record | What to look for |
| --- | --- | --- |
| Cross-institution reference conflict | `FDR-2026-004` / `FDR-2026-011` | Same normalized reference `DNB847291`, different institutions and amounts. Finding `FND-2026-001`. |
| OCR ambiguity | `FDR-2026-006` | Submitted `SLB-54I902` vs extracted `SLB-541902`. OCR alignment is not authentication. Finding `FND-2026-003`. |
| Release without approval | `FDR-2026-017` | Release review with no approving-authority sign-off. Policy `REL-03` blocks the transition. |
| Renewal approaching | `FDR-2026-003` | Renewal due in 13 days inside the critical 30-day window. |
| Overdue renewal | `FDR-2025-024` | Renewal overdue by 40 days, escalated in the queue. |
| Correction retention | `FDR-2026-009` | Amount variance `FND-2026-004`; correction resolves the finding without deleting history. |

The dataset contains 10 institutions, 25 FDR instruments, 12 findings, field-level evidence,
notifications, and a seeded audit chain.

---

## Roles

Role switching is a **frontend-only demonstration control**, not authentication or
authorization. The services still enforce the demo permission matrix so behavior is consistent.

| Role | Main capabilities |
| --- | --- |
| AICTE Administrator | Full oversight, configuration, institution management, lifecycle authority, demo reset. |
| Institution Officer | Create and correct their own institution's instruments; request lifecycle actions. |
| Verification Reviewer | Review findings, evidence, verification cases and lifecycle reviews. |
| Approving Authority | Approve eligible releases and sensitive lifecycle decisions; no record editing. |
| Auditor | Read-only access to records, evidence, reports, exports and audit history. |

---

## Business invariants

- Lifecycle, verification and integrity are separate dimensions. No single “verified” badge hides
  unresolved findings.
- A potential duplicate is never automatically merged, invalidated or labelled fraud.
- OCR normalization aligns values but never promotes extracted data to confirmed status.
- Evidence confirmation is field-level and explicitly marked as simulated in the UI.
- Corrections preserve prior values, reasons, linked findings and evidence history in the audit trail.
- Release requires a recorded approving-authority sign-off, confirmed verification, and no
  unresolved material findings.
- Sensitive actions require a written reason and are appended to the audit chain.
- Exports are generated locally; nothing is uploaded or transmitted.

---

## Data and persistence

- **Metadata / workflow state:** `localStorage` under `fdr-sentinel:demo:v1`.
- **Uploaded documents:** IndexedDB when available, with an in-memory fallback. Seeded documents
  are generated SVG previews, not real PDFs.
- **Reset:** `Settings → Reset demo data`, or clear the key above. Resetting preserves the current
  demo role and restores the deterministic dataset.
- **Snapshot:** `Settings → Download JSON` exports the current browser state for backup.
- No secret keys, credentials, or live integrations are present.

Audit hashes are FNV-1a checksums chained locally. This demonstrates tamper evidence; it is **not**
production cryptography and does not replace an append-only server-side audit store.

---

## Architecture

```text
src/
  app/            App, router, navigation configuration
  components/     Shared UI, layout, dashboard, instruments, integrity,
                  lifecycle, audit and institution components
  data/           Synthetic seed data, status labels, tones, scenarios
  hooks/          Demo state, current user, document preview
  pages/          Route-level screens
  services/       Deterministic business logic and persistence
  styles/         Tailwind layers and design tokens
  tests/          Vitest business-rule tests
  utils/          Formatting, validation, normalization, hashing, selectors, CSV
```

Business logic lives in `src/services/`. Pages call services rather than mutating the store
directly, so permissions, auditing, and invariants stay consistent across the UI and the demo
scenario runner.

---

## Testing

The suite covers:

- reference normalization, strong and OCR matches, similarity bounds;
- currency, reference, date and file validation;
- deterministic integrity rules, idempotence and duplicate-finding prevention;
- lifecycle role enforcement, approval prerequisites, reason requirements and blocked audits;
- deadline urgency, renewal/overdue generation, acknowledgement and queue restrictions;
- audit-chain validity and tamper detection;
- correction retention and audit history;
- role permissions, settings validation, guarded reset and settings auditing.

```bash
npm run test
```

---

## Deployment

The project is Vercel-ready. `vercel.json` rewrites all paths to `index.html` so client-side
routes work on refresh.

```bash
npm run build
npx vercel
```

Or import the repository in Vercel and use the detected Vite preset:
build command `npm run build`, output directory `dist`.

Any static host with an SPA fallback works equally well.

---

## Limitations and production boundary

This is a prototype, not a production system. It does **not** include:

- authentication, authorization, SSO or server-side sessions;
- a server, database, file storage or background jobs;
- live AICTE, bank, payment, SMS or email integrations;
- cryptographic signing, encryption at rest, retention policy or legal hold;
- real OCR or document authentication;
- production audit storage or multi-user concurrency.

A production build would require server-side authorization, encrypted storage, independent bank
advice integration, retention and access policy, real document verification, and operational
monitoring. The permission selector and “demo confirmation” controls must be removed or replaced.

**All data in this prototype is synthetic. It is not government data and does not represent any
real institution, bank or financial instrument.**
