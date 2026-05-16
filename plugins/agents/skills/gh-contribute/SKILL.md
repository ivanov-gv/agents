---
name: gh-contribute
description: Use when creating branches, writing commit messages, opening pull requests, doing code review, or cutting releases in this repo (or any repo that follows the same conventions). Defines branch naming, Conventional Commits, PR body template, review etiquette, and release flow.
---

# gh-contribute

GitHub contribution workflow for this repo: branching strategy, PR creation, review, and merge.

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/add-reviewer-agent` |
| Bug fix | `fix/<short-description>` | `fix/skill-loading-panic` |
| Chore / docs | `chore/<short-description>` | `chore/update-readme` |
| Release | `release/v<semver>` | `release/v1.2.0` |

Always branch from `main`. Keep branches short-lived (< 1 week).

## Commit messages

Follow Conventional Commits:

```
<type>(<scope>): <imperative summary under 72 chars>

[optional body — wrap at 80 chars]

[optional footer: Closes #123, Co-Authored-By: ...]
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`.

## Pull requests

1. Push branch: `git push -u origin <branch>`.
2. Create PR via `gh pr create --fill` — fill title/body from commits.
3. PR title mirrors the commit summary (Conventional Commits format).
4. Body must include:
   - **What**: one-paragraph summary of the change.
   - **Why**: motivation / linked issue.
   - **Test plan**: steps to verify.
5. Request at least one review before merging.
6. Squash-merge into `main`; delete branch after merge.

## Code review etiquette

- Comment on the code, not the author.
- Prefix non-blocking comments with `nit:` or `optional:`.
- Resolve all threads before merging.
- Approve only when you would be comfortable shipping the change yourself.

## Release flow

1. Create `release/vX.Y.Z` branch from `main`.
2. Bump version in `plugin.json` files.
3. Tag after merge: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. GitHub Actions (or `gh release create`) publishes the release.
