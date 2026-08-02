# ADR 0002: Temporary Next.js transitive security overrides

- Status: temporary, review on every Next.js upgrade
- Date: 2026-08-01

## Context and decision

`npm audit` reported high-severity advisories through Next.js 16.2.12's pinned
PostCSS 8.4.31 and Sharp 0.34.5. Until Next publishes a compatible release with
patched transitives, the root lockfile forces PostCSS 8.5.25 and Sharp 0.35.3.
Both the production build and full audit pass with these versions.

## Risk and expiry

Sharp crosses Next's declared minor range, so this is compatibility debt. CI
must run the production build and full audit. At each Next release, remove the
overrides in a branch, install normally, and retain removal once audit and all
tests pass. Do not use `npm audit fix --force` to downgrade Next.
