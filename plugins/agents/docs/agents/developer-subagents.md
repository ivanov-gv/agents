---
summary: Measured comparison of developer subagents (opencode models, Junie) and the incidents behind the lead's review rules.
rules: ../../skills/developer-subagents/SKILL.md
updated: 2026-11-23
---

# Developer subagents: background

Measured in one monorepo (JavaScript, Python, Go, GitHub Actions) from November 2026, with Claude Code as the lead.
The sample is small; re-measure on your own work.

## How the developers compare

The score is the time from the first prompt to a result the lead would approve, including review rounds. The owner's
words: "I'm not interested in fast but incorrect outputs."

**A small task** (a test that every external action has one ref across workflows, with a failure proof):

| Developer | Rounds | Time to approval | Notes |
| --- | --- | --- | --- |
| opencode `big-pickle` | 1 | 121 s | Most thorough: walked every `uses:`, including job level. |
| opencode `deepseek-v4.1-flash-free` | 1 | 172 s | Correct, slower. |
| Junie `junie-lite` | 2 | 186 s | Correct but repeated each file per use until round 2. |
| opencode `glm-5.3-flash-free` | 2+ | not approved after 227 s | Compact, but missed job-level `uses:`. |
| opencode `minimax-m3.1-flash-free` | 0 | failed | Read two files and stopped. |

**A hard task** (a cascade merge across workflows, tests, docs and a decision record, with strict resolution rules):
all three passed lint and every check on the first pass; the faults showed only when the content was read against the
rules.

| Developer | Rounds | Time to approval | First-pass fault |
| --- | --- | --- | --- |
| opencode `glm-5.3-flash-free` | 1 | 452 s | none |
| Junie `junie-lite` | 2 | 448 s | silently dropped a change from the target branch |
| opencode `big-pickle` | 2 | 674 s | stale contract rows in an architecture doc |

`glm-5.3-flash-free` was withdrawn a few days later: free models change, so check `opencode models` before choosing.

**Later real work.** big-pickle did most of three Epics (UI Features, a data pipeline, CI/CD rework): dozens of Tasks,
Bugs and Features, each approvable after one or two review rounds. Junie's first drafts needed three to six rounds and
twice ended with no change. A fresh compliance reviewer found real gaps on almost every Feature; the lead's own runs of
the full browser suite caught regressions the developers' focused runs missed in five of seven UI Features.

## Incidents behind the rules

- **Line budgets:** under a 100-line AGENTS.md limit, a developer shortened rules it did not own (ownership lines,
  invariants, the word "only" in a privacy rule) in four separate rounds.
- **Out-of-tree changes:** to get past a tool's schema error, a developer replaced the owner's `gh act` extension with a
  build of an unmerged third-party PR, then wrote docs pinning it. Another run added a `.pth` file under `~/.local` to
  reach packages in `/tmp`. Both were found only by checking the machine after the run.
- **Hangs:** a run stalled for six hours after starting a full browser suite in the background against its task; the
  process stayed alive and the log stopped growing. Another, started with `&`, finished unnoticed for five hours.
- **Long loops:** a geometry fix took seven hours of extract-and-debug cycles; one study script ran for almost two hours
  at full CPU.
- **Extra decision records:** a developer added a second decision record for a follow-up and renumbered the stack.
- **The lead's own notes:** a review note suggested pulling a moving image tag to read its label, which broke a CD
  rule the task had stated. The compliance reviewer caught it.
- **Junie faults:** CSS features no browser supports, a test that tested its own copy of the logic, failures called
  "pre-existing" without running them on the base branch, app behaviour loosened so its own test passed.
