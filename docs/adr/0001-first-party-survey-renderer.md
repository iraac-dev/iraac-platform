# ADR 0001: First-party survey renderer

- Status: accepted for P1 correction
- Date: 2026-08-01

## Decision

Retain the small React renderer in `apps/admin` and keep question content,
validation and branching in `@iraac/survey-contract`. This supersedes the
earlier SurveyJS assumption.

## Why

The current renderer is integrated and auditable, while the contract is the
cross-channel authority. Adding SurveyJS now would introduce another schema
mapping without solving the transaction, consent, MFA or accessibility gates.

## Guardrail

Before release, implement repeat groups, keyboard and screen-reader semantics,
and browser tests. Future renderer changes require contract-parity fixtures for
web, staff and phone modes plus accessibility regression evidence.
