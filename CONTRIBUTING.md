# Contributing to Hospiq

Thank you for helping improve patient and care-team workflows. Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before making changes

Read the [setup guide](docs/SETUP.md), [architecture](docs/ARCHITECTURE.md), [API reference](docs/API.md), and [roadmap](docs/ROADMAP.md). Discuss substantial feature or data-model changes in a GitHub issue first. Use fictional patient information and a dedicated database. Never seed, migrate, or run destructive tests against someone else's data.

## Development workflow

1. Fork or clone the repository and install both packages with `npm ci` using the root README commands.
2. Preserve existing `.env` files; copy examples only for missing configuration.
3. Create a focused branch, for example `git switch -c codex/improve-queue-search`.
4. Keep changes related to one user problem. Update documentation and `.env.example` when configuration or behavior changes.
5. Add meaningful regression tests for authorization, state transitions, concurrency, or other changed behavior. Do not add tests that only mirror implementation details.
6. Run the checks below, then open a pull request with the problem, resulting behavior, evidence, and known limits.

```powershell
npm --prefix server test
npm --prefix client run build
git diff --check
```

Run relevant dependency audits when dependencies change. No working lint command is currently configured; do not claim lint passes. Provider delivery and real database concurrency need separate integration evidence.

## Code and API expectations

- Treat frontend role guards as navigation, and enforce permissions on the server.
- Keep clinical Doctor IDs distinct from login User IDs; use the explicit account link.
- Preserve the configured timezone consistently across queue dates and schedule checks.
- Avoid logging credentials, full connection strings, access tokens, OTPs, or patient data.
- Use conditional updates or transactions where concurrent state changes matter.
- Preserve historical bookings and records; include a reviewed migration plan for schema/index changes.
- Keep loading, error, empty, keyboard, and mobile states usable.
- Document breaking API changes and update request examples with the code.

## Issues and pull requests

Use the issue forms for bugs and feature requests. A useful bug report includes versions, role, route, sanitized reproduction steps, expected/actual behavior, and relevant errors. A useful PR includes its validation scope; mocked tests do not establish database concurrency or browser behavior.

Do not attach database exports, `.env` files, generated demo passwords, medical files, or screenshots with personal information. Report vulnerabilities using [SECURITY.md](SECURITY.md).

## License

Contributions are submitted under the repository's [ISC License](LICENSE). Preserve existing notices and include the applicable notices for any third-party material you add. There is no separate contributor license agreement configured.
