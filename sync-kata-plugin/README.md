# sync-kata-plugin

Reusable composite GitHub Action that vendors the
[`kata`](https://github.com/0k-software/kata) Claude Code plugin into a target
repository. The action resolves the latest released tag of `0k-software/kata`,
compares its `plugin.json` version against the snapshot already vendored at
`.claude/plugins/kata/`, and — if they differ — replaces the snapshot and opens
(or updates) a PR.

The action operates on whatever repo is currently checked out in the workspace.
It is designed to be driven by an org-wide orchestrator workflow (typically
hosted in a private repo like `.github-private`) that enumerates target repos
and calls this action against each one.

## Behaviour

1. Resolve the kata ref. With the default `kata-ref: latest`, the action
   queries `0k-software/kata` releases via `gh release view` and picks the most
   recent tag. A specific tag, branch, or SHA can be passed instead.
2. Shallow-clone `0k-software/kata@<ref>` into the runner's temp dir and read
   `.claude/plugins/kata/.claude-plugin/plugin.json` for the upstream version.
3. Read the same manifest in the target repo. If the file is missing, the
   target is treated as version `(missing)`.
4. If the two versions match, exit cleanly with `needs-sync=false`.
5. Otherwise, replace the target's `.claude/plugins/kata/` directory wholesale
   with the upstream snapshot.
6. Open (or update) a PR via
   [`peter-evans/create-pull-request`](https://github.com/peter-evans/create-pull-request)
   on a deterministic branch (`<prefix>-<version>`), so re-runs against the
   same upstream version refresh the existing PR rather than spawning new ones.

## Prerequisites

- `0k-software/kata` must have at least one published release for
  `kata-ref: latest` to resolve. Pin to a specific tag/branch/SHA via
  `kata-ref:` if you need to bootstrap before a release exists.
- The token passed via `inputs.token` must have `contents: write` and
  `pull-requests: write` on the **target** repository (the default
  `GITHUB_TOKEN` is sufficient when the action runs inside that target).
- Runner tools: `bash`, `git`, `gh`, `jq`. GitHub-hosted Ubuntu runners ship
  with all four.

## Inputs

| Input              | Required | Default                  | Description                                                                     |
| ------------------ | -------- | ------------------------ | ------------------------------------------------------------------------------- |
| `token`            | yes      | —                        | PAT or App token with `contents: write` + `pull-requests: write` on the target. |
| `kata-ref`         | no       | `latest`                 | Tag, branch, or SHA of `0k-software/kata`. `latest` resolves the newest tag.    |
| `path`             | no       | `.claude/plugins/kata`   | Target path for the vendored plugin.                                            |
| `pr-branch-prefix` | no       | `chore/sync-kata-plugin` | Branch name prefix; the resolved version is appended.                           |

## Outputs

| Output                | Description                                                       |
| --------------------- | ----------------------------------------------------------------- |
| `needs-sync`          | `true` if the target was out of date and a PR was opened/updated. |
| `current-version`     | Version found in the target before sync (`(missing)` if absent).  |
| `upstream-version`    | Version of kata at the resolved ref.                              |
| `pull-request-number` | PR number opened/updated by this run (empty when no sync needed). |

## Usage

### Single-repo (run inside the target repo)

```yaml
name: Sync kata plugin
on:
  schedule:
    - cron: "0 12 * * 1"
  workflow_dispatch: {}

permissions:
  contents: write
  pull-requests: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: 0k-software/.github/sync-kata-plugin@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
```

### Org-wide orchestrator (recommended pattern, lives in `.github-private`)

Keeps the org repo list out of public history. The orchestrator enumerates
repos, then fans out via a matrix; each matrix job checks out one target repo
and invokes this action against it.

```yaml
name: Sync kata plugin org-wide
on:
  schedule:
    - cron: "0 12 * * 1"
  workflow_dispatch: {}

jobs:
  enumerate:
    runs-on: ubuntu-latest
    outputs:
      repos: ${{ steps.list.outputs.repos }}
    steps:
      - id: list
        env:
          GH_TOKEN: ${{ secrets.ORG_REPO_TOKEN }}
        run: |
          # Active repos in the org, excluding kata itself.
          repos=$(gh repo list 0k-software \
            --no-archived --limit 200 \
            --json nameWithOwner \
            --jq '[.[].nameWithOwner | select(. != "0k-software/kata")]')
          echo "repos=$(echo "$repos" | jq -c)" >> "$GITHUB_OUTPUT"

  sync:
    needs: enumerate
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        repo: ${{ fromJson(needs.enumerate.outputs.repos) }}
    steps:
      - uses: actions/checkout@v5
        with:
          repository: ${{ matrix.repo }}
          token: ${{ secrets.ORG_REPO_TOKEN }}
      - uses: 0k-software/.github/sync-kata-plugin@v1
        with:
          token: ${{ secrets.ORG_REPO_TOKEN }}
```

`ORG_REPO_TOKEN` should be a PAT or GitHub App installation token scoped to the
org with `contents: write` and `pull-requests: write` on every repo you want
syncing.

See [`action.yml`](./action.yml) for the full input/output reference.
