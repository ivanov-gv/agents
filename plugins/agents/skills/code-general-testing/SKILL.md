---
title: Testing guideline
description: Guildelines for writing tests. Read before any task related to testing, like editing, writing, updating, reviewing, etc.
---

# Testing

Tests must cover the functionality being implemented.

Workflow:

1. **Identify** functionality to be tested
2. **Describe** test cases for happy paths, unhappy paths, and edge cases
3. **Prepare** test data and fixtures, if needed
4. **Write** tests, keeping them well-structured — one test function per functionality with independently runnable cases
5. **Run** — ensure tests are runnable locally, in a container, and in CI/CD
6. **Review** results — failed tests must be easily identifiable with a clear reason for failure;
   there must be no false positives and no false negatives
7. **Clean up** — tests must leave no garbage: no leftover processes, temporary files, containers, images, or caches

# Test types

## Unit tests

Must be presented. Must ensure the associated package is implemented properly with no doubts.

Test a single unit of logic in isolation. Dependencies must be replaced with mocks or fakes.
Keep them fast — unit tests must never touch the network, filesystem, or a real database.

## Integration tests

Must be presented. Must ensure different units of the system work together with no issues.

Prefer real instances of dependencies over mocks — mocks hide real failure modes.
A debugger with breakpoints must be available during test runs.

## End-to-end tests

Must be presented.

Test the system as a whole from an external entry point. Use sparingly — they are slow, brittle,
and expensive to maintain. Cover only critical user-facing paths.
