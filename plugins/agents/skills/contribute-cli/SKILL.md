---
description: Must use whenever you need to interact with GitHub. Get authenticated in GitHub, read issues, PRs, comments, leave comments, reactions, and more with `contribute` CLI.
---

# contribute CLI

You are authenticated on GitHub with CLI `github.com/ivanov-gv/contribute`.
Use command `contribute` to interact with github and authenticate `gh`. Call `contribute --help` for reading its
capabilities.

All gh commands should be prefixed with GH_TOKEN=$(contribute token):

```
GH_TOKEN=$(contribute token) gh pr list                                                                                                                                                                        
GH_TOKEN=$(contribute token) gh repo view ivanov-gv/contribute
```

# Working with a PR

You are working with GitHub repositories using `contribute` CLI.

## Full Workflow for working with a PR - follow it whenever you're contributing to a PR

### 1. Pick and read the issue or get task context from the user's prompt

1. Authenticate using `contribute`, if needed.
2. `contribute issue <number>`, if issue number is provided.
3. Understand the task from the context, the issue body, comments, and labels.
4. Update the current branch. It might be stale.
5. Create a branch for your work: `git checkout -b issue/<issue-number>-<short-description>`

### 2. Implement

1. Try to understand the root causes of the issue. Write tests to cover this issue, if not already.
2. Write code, run tests (`make test`), lint (`make lint`)
3. Review your changes. Also, make sure everything meets the guidelines and skills you have.
4. Commit: `git commit -m "Fix #<number>: <description>"`
5. Push: `git push -u origin <branch>`

### 3. Create a PR

Use `GH_TOKEN=$(contribute token) gh pr create` with `Fixes #<number>` in the body, then notify:

`contribute comment "Ready for review @ivanov-gv" --pr <N>`

Check CI status. If any fix is needed - go to step 2. Proceed only if you're 100% sure about your PR.

### 4. Enter the review loop

Once everything is ready for the review - enter the review loop.

## Review Loop (for new or existing PRs)

### 1. Read the current PR state

`contribute comments --pr <N>`

Look for new reviews (CHANGES_REQUESTED or COMMENTED) that have not been addressed.

### 2. For each unaddressed review

`contribute review <review-id> --pr <N>`

Read all comments, subcomments in all threads. Make sure you have the full picture. Understand the overall feedback
before making changes.

### 3. For each thread in the review

1. **Acknowledge** — react with eyes to signal you've seen it. React with eyes to the review top comment itself, all its
   comment and subcomments in all threads:
   ```bash  
   contribute react review <review-id> eyes
   contribute react comment <comment-id> eyes
   ```  
2. **Understand** — read the comment body and the file/line context.

3. **Fix** — make the requested code change. Follow '2. Implement the fix' part

4. **Reply** — tell the reviewer what you did:
   ```bash  
   contribute reply <comment-id> "Fixed in <short-sha> — <what you changed>"   
   ```  
5. **React** — signal completion. React with rocket to the review top comment itself, all its comment and subcomments in
   all threads:
   ```bash  
   contribute react comment <comment-id> rocket   
   ```  

### 4. Push and notify

```bash  
git push
contribute comment "All feedback addressed, PTAL. cc @ivanov-gv" --pr <N>
```  

Then go to the next step - pool for updates.

### 5. Pool for updates

Check updates on the PR periodically. Run /loop command every 30 seconds. Run 'contribute comments' and if a
new review or comment arrives - proceed to step 6.

### 6. When update arrives, check for approval

```bash  
contribute comments --pr <N>
```  

If the latest review is APPROVED, the cycle is complete. Otherwise, go to 1. Read the current PR state.

### 7. Merge after approval

If approved, ci checks are green - merge it. Always use squash.

## Commands

See `contribute --help`

## Important Notes

- Always read the full review before making changes — understand the overall feedback first.
- A comment made to particular lines of code may be applicable to other changes too. It is important to address feedback
  entirely and apply changes to the other lines too. Address comment in general, not only to particular lines.
- Group related fixes into a single commit when possible.
- If a comment is unclear, reply asking for clarification instead of guessing.
- Never force-push during a review cycle — it breaks the review context.
- Use `contribute thread <thread-id>` to see the full conversation history of a specific thread.
