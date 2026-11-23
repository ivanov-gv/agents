---
name: developer-subagents
description: Lead a developer subagent (opencode, Junie) that writes the code while you plan, review and verify. Use when the owner asks you to be the team lead and not write code, or when a coding task is big enough to delegate.
---

# Developer subagents

You are the team lead. The developer, another agent run from the shell, writes the code; you write the task, review the
result by evidence, run the heavy checks, and merge. Measurements and incidents behind these rules:
[developer subagents](../../docs/agents/developer-subagents.md).

## Which developer

Score a developer by the time from the first prompt to a result you would approve, including every review round. A
fast first pass that needs three rounds loses.

1. **opencode with `opencode/big-pickle`: the default.** Fewest rounds, thorough, and its sessions make review rounds
   cheap.
2. **Another opencode model as a second opinion** on a risky change. Free models come and go: check `opencode models`
   first.
3. **Junie (`junie-lite`): fallback only.** Every round starts cold, and it has silently dropped a required change.
4. Re-measure on real work and keep your own record of the results.

## How to run

The runners in [scripts/](scripts/) prepend [developer-rules.md](developer-rules.md) to the task, write the log to
`$AGENTS_LOG_DIR` (default `~/.agents/logs/<log-name>.log`) and print the exit status, duration and log tail.

- opencode: `scripts/run-opencode.sh <worktree> <model> <log-name> "<task>"` (`OPENCODE` overrides the binary path).
  - A review round continues the same session: find it with `opencode session list` in the worktree, then
    `opencode run --auto --session <id> --model <model> "<review notes>"`.
- Junie: `scripts/run-junie.sh <worktree> <log-name> "<task>"`. Every round is a new cold run, so say "one new commit on
  top; do not amend".
- One worktree per task. Several opencode runs can run in parallel; the models are remote, but the checks they run use
  local CPU and memory.
- Start runs with your harness's background mode, which notifies you on exit. Never use `&` (no notification) and
  never a shell `timeout` (it kills the run).

## Write the task

- Name the issue, the files and docs to read, the exact scope, and what is out of scope.
- Name the checks to run and the failure proofs you expect: each new test must fail without its change, shown on a
  scratch copy outside the worktree.
- Say "commit, do not push", and the commit message.
- Point to the project's AGENTS.md and guidelines; the developer follows them too.
- When a file has a line budget, say which lines the task may change; developers shorten other rules to make room.

## Review by evidence

- Read the diff, not the report. Break a scratch copy to confirm each new test fails without its change.
- Read the full output of failures, never a truncated line.
- Check the change against the project's rules and the request: green checks do not prove that a merge kept every
  change or that the design matches the owner's model.
- Check your own review notes against the same rules before you send them. A convenient fix you suggest can break a
  rule the task itself stated.
- Run a fresh compliance reviewer (`compliance-review`) before the PR. It finds real gaps the developer called done.
- After each run, check that nothing changed outside the worktree: `git status` in other checkouts, new files under
  `~/.local` and `~/.config`, replaced tools or extensions. Revert and report anything you find.

## Recurring faults to look for

- Failure proofs skipped or called "implicit".
- Inverted conditions; silent defaults pointing at production.
- Other rules shortened or deleted to fit a line budget.
- A test adapted to a bug, or app code changed to make a test pass.
- "Already correct" claims when a real run failed.
- Stopping early, after reading files only.
- Tools installed, patched or replaced on the machine to get past an error.
- Extra decision records for a follow-up: ask for an outcome note in the existing one.

## Keep runs healthy

- A run whose log has not grown for 30 minutes is stuck: kill it by its PID (never by pattern) and resume the session.
- Check CPU with `ps` for runs that loop on long scripts; time-box exploratory work in the task.
- Run heavy or real checks yourself (browser suites, workflow runs, dispatches on CI) when the developer or the
  machine cannot.
