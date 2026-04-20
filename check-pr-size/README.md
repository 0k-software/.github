# check-pr-size

Reusable composite GitHub Action that enforces a configurable PR size limit.
The action counts added lines with `git diff origin/<base>...HEAD`, renders a
shields.io status badge, and posts a review on the PR — `REQUEST_CHANGES` when
the limit is exceeded, `COMMENT` otherwise. Previous pr-size reviews from
`github-actions[bot]` are dismissed (to clear any merge block) and minimised as
OUTDATED on each run.

## Usage

The action counts added lines with `git diff origin/<base>...HEAD`, then posts
a status review on the PR. The calling job therefore needs the full git history
checked out, an appropriately scoped `GITHUB_TOKEN`, and a runner with the
shell tools the action calls out to.

**Job requirements:**

- Token permissions (set at workflow or job level):
  - `pull-requests: write` — to post (and dismiss stale) status reviews.
  - `contents: read` — for the checkout.
- Runner tools: `bash`, `git`, `gh`, `jq`. GitHub-hosted Ubuntu runners ship
  with all four by default; self-hosted runners must install them before the
  step runs.
- Checkout must fetch enough history for `git diff origin/<base>...HEAD` to
  resolve. `actions/checkout@v5` with `fetch-depth: 0` is the simplest
  guarantee.

```yaml
permissions:
  pull-requests: write
  contents: read

jobs:
  check-pr-size:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: 0k-software/.github/check-pr-size@v1
        with:
          limit: 500
          ignored-paths: |
            priv/static/**
            deps/**
```

`ignored-paths` entries are passed to `git diff` as pathspec excludes, so you
can use any glob that `git diff -- :!<pattern>` accepts. The optional `:!`
prefix is added automatically if you omit it.

See [`action.yml`](./action.yml) for the full list of inputs and their
defaults.
