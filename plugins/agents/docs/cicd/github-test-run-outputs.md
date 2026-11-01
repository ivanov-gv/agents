---
summary: Why job outputs break in GitHub Actions test-run pairs, and the fix - a duplicated env block per twin.
rules: ../../skills/cicd-github/SKILL.md
updated: 2026-11-01
---

# Outputs in GitHub Actions test-run pairs

Background: [test-run model](test-run-model.md).

## Outputs don't work

```yaml
   - build:
       # ... 
       outputs: &push-outputs
         image:
           description: Docker image ID of the built image
           value: ${{ steps.build.outputs.image }}

   - build-test-run:
       # ...
       outputs: *push-outputs # same outputs

   - push:
       # ...
       needs: [ build ]
       env: &push-env
         - IMAGE_TAG: ${{ needs.build.outputs.image }}

   - push-test-run:
       # ...
       needs: [ build-test-run ]
       env: *push-env # gets IMAGE_TAG from 'build', not 'build-test-run' !!!

```

Take a look at the last line - `env:` block in `push-test-run` job references `needs.build.outputs.image`
but actually needs `needs.build-test-run.outputs.image`.

## Fix: duplicate the `env:` block

Fix it by duplicating the `env:` block. Pair each downstream job with its matching upstream
sibling directly, copy the `env:` section, and keep the steps anchor — the only line that differs
is the one that reads the upstream output:

```yaml
   - push:
       # ...
       needs: [ build ]
       env: &push-env
         - IMAGE_TAG: ${{ needs.build.outputs.image }}
       steps: &push-steps
       # ...     

   - push-test-run:
       # ...
       needs: [ build-test-run ]
       env:
         - IMAGE_TAG: ${{ needs.build-test-run.outputs.image }} # but be careful when editing 
       steps: *push-steps
```
