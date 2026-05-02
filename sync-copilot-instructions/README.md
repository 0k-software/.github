# sync-copilot-instructions

A reusable composite GitHub Action that propagates the org-wide canonical
[`copilot-instructions.md`](../copilot-instructions.md) (lives in the root of
this repo) into every target repo's `.github/copilot-instructions.md`, between
HTML-comment markers. When the marker section drifts from the canonical
content, the action opens or refreshes a PR on a stable branch
(`chore/sync-copilot-instructions`).

The cron + manual `workflow_dispatch:` workflow that calls this action lives in
[`0k-software/.github-private`](https://github.com/0k-software/.github-private)
so the App credentials it needs (`actions/create-github-app-token` against the
0K App) stay out of public surface.

## Usage

Pin to the major tag. Calling workflow mints an installation token from the 0K
App and passes it to the action:

```yaml
name: Sync Copilot instructions

on:
  schedule:
    - cron: "0 6 * * *"
  workflow_dispatch:
    inputs:
      target-repo:
        description: "Single owner/repo to sync (empty = all)"
        required: false
        default: ""

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/create-github-app-token@v1
        id: app-token
        with:
          app-id: ${{ secrets.OK_APP_ID }}
          private-key: ${{ secrets.OK_APP_PRIVATE_KEY }}
          owner: 0k-software
      - uses: 0k-software/.github/sync-copilot-instructions@v1
        with:
          github-token: ${{ steps.app-token.outputs.token }}
          target-repo: ${{ inputs.target-repo }}
```

## Inputs

| Name            | Description                                                                                                                                                  | Default                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `github-token`  | Token used for all API calls. For org-wide iteration, must be an App installation token. The default suits single-repo invocations against the calling repo. | _(empty — falls back to `github.token`)_ |
| `target-repo`   | `owner/repo`; if set, syncs only that one. Empty means iterate every repo the token can reach via `/installation/repositories`.                              | _(empty)_                                |
| `canonical-ref` | Ref of `0k-software/.github` to read the canonical file from. Allows pinning to a release tag.                                                               | `main`                                   |
| `branch-name`   | Stable branch name used in target repos. Force-pushed on every drift update so a single PR per repo is refreshed in place.                                   | `chore/sync-copilot-instructions`        |

## Permissions

The token passed via `github-token` must carry, on every target repo:

- `contents: write` — clone, create the branch, force-with-lease push.
- `pull-requests: write` — open or refresh the sync PR.
- `metadata: read` — read repo metadata (e.g. archived flag, default branch).

For org-wide iteration, the App also needs access to
`/installation/repositories`. For single-repo invocations (`target-repo` set),
only the listed permissions on the target are required.

## How it works

1. **Fetch canonical:** read `copilot-instructions.md` from
   `0k-software/.github` at `canonical-ref` via the GitHub Contents API.
   Hard-fails if the file is missing.
2. **Resolve targets:** if `target-repo` is set, that's the only target
   (hard-fails if unreachable). Otherwise, paginate
   `/installation/repositories` and filter out archived repos. Hard-fails if
   the listing call errors.
3. **Per-repo loop (sequential):** for each target, fetch existing
   `.github/copilot-instructions.md` (404 ⇒ empty), run `compute-desired.sh` to
   produce the DESIRED content, and byte-compare. If equal → log `in-sync` and
   continue. Otherwise shallow-clone, write DESIRED, commit,
   `git push --force-with-lease` to `branch-name`, and open a PR if none is
   open on that branch (otherwise the force-push refreshes the existing PR in
   place).
4. **Marker handling:** the canonical content is wrapped in
   `<!-- 0k:org-instructions:begin --> ... <!-- 0k:org-instructions:end -->`
   markers in each target's file. Repo-specific content outside the markers is
   preserved verbatim. Files without markers get markers + canonical prepended
   above existing content.
5. **Error aggregation:** per-repo failures (clone, push, PR-open, 4xx/5xx) are
   recorded and iteration continues; the run exits non-zero at the end if any
   repo errored.

## Helpers

The action is composed of two pure shell helpers under
`sync-copilot-instructions/`:

- [`extract-org-section.sh`](./extract-org-section.sh) — print the body between
  the markers.
- [`compute-desired.sh`](./compute-desired.sh) — given canonical and existing
  file paths, print the DESIRED contents of the target file.

Both are unit-tested with `bats` over fixtures under [`test/`](./test/) and
exercised by the `Test` workflow on every push and pull request.

## Versioning & releases

Consumers pin to the moving major tag (e.g. `@v1`). Releases are cut through
the [0k-software/.github release process][release] — GitHub's Release workflow
creates the tag; there is no manual `git tag` push.

[release]: https://github.com/0k-software/.github#releasing-a-new-version
