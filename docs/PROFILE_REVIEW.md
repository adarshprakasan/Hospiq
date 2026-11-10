# Profile requirements and security review — 2026-11-10

## Requirements

| Requirement | Result |
| --- | --- |
| Edit name, preferred name and phone | Present; signed-in account only, allowlisted updates |
| Profile photo | JPEG/PNG upload, browser resize, replace/remove, bounded payload and signature validation |
| Height, weight, automatic BMI | Present; validated on server, live calculation, save/remove |
| Apple Health | One-time XML export import with review before saving; **live connection not implemented** |
| Other health providers | Two-column CSV import; **no live provider connection** |
| Saved doctors/hospitals | Present; save/remove, availability links, bounded bookmarks, inactive facilities filtered |
| Personal demographics | Added optional private birth date and address, editable/removable; separate from guardian authorization data |
| Health information | Links to allergies, conditions, medications, emergency contact, records, labs, prescriptions and receipts |
| Preferences | Language and notification/reminder settings |
| Family and appointments | Existing links from profile |
| Privacy center | Profile export, sharing/access history, password change, session revocation, privacy support |
| Help/about | Existing support, user guide and project links |
| Proper logout | Server revokes current bearer token; confirmation and retry; all-session revocation retained; cross-tab cleanup retained |

## Changes and security findings

- Fixed reusable tokens after browser logout. Store SHA-256 token digests with expiry/TTL, check on authentication, issue unique JWT IDs for new logins. Existing tokens remain accepted until expiry/revocation; old identical tokens, if any, share revocation.
- Explicit HS256 verification and required expiry for login sessions.
- Permit logout even when a temporary password must be changed. The menu can sign out without loading the profile.
- Prevent caching authenticated responses; add API nosniff, frame and referrer headers.
- Removed raw database/server error messages from legacy controllers and profile routes.
- Hide removed doctors and inactive/unapproved facilities in public doctor endpoints; reject object-shaped search inputs.
- Keep personal birth dates separate from the authoritative date used by guardian access checks.
- Validate imported file types, size and measurement ranges. Partial imports clear absent fields so old values are not silently attributed to the imported provider.

## Provider integration boundary

This repository is a browser application. Apple HealthKit and Android Health Connect require native SDK access and user permission. File imports are available but are not a completed implementation of the requested live provider connection. A native companion or a selected provider's registered OAuth application is still needed; no fake Connect button or unsupported credential flow is provided.

- Apple: https://developer.apple.com/documentation/healthkit/setting-up-healthkit
- Android: https://developer.android.com/health-and-fitness/health-connect/get-started

## Verification and limits

Server regression tests, client lint/build, Playwright flows and npm dependency audits are run for this change. Browser tests use mocked API responses; server unit tests isolate database operations. Production deployment, live database persistence and native provider authorization are not verified by these tests. npm audit reported zero known vulnerabilities in both lockfiles on 2026-11-10.

This is a scoped code/security review, not a guarantee that all vulnerabilities are eliminated. Remaining architecture considerations include bearer-token storage in localStorage (exposed if an XSS vulnerability occurs), process-local rate limiting for multi-instance deployments, deployment-level TLS/CSP configuration, and server image decoding/re-encoding beyond file signature checks. Account deletion/clinical retention workflows and verified email changes require separate implementation and policy decisions; the current privacy page provides a support route rather than an automated deletion flow.

Deploy client and server together. The new RevokedSession model is loaded during startup so its TTL index is initialized with other models. No destructive migration is required.
