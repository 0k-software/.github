# check-pr-diff-size

Reusable composite GitHub Action that enforces a configurable PR diff-size
limit by posting a status review on the PR — `REQUEST_CHANGES` when the limit
is exceeded, `COMMENT` otherwise.

## Usage

The action posts PR reviews and reads the PR's file list, so the calling job
needs an appropriately scoped `GITHUB_TOKEN` and a runner with the shell tools
the action calls out to.

**Job requirements:**

- Token permissions (set at workflow or job level):
  - `pull-requests: write` — to post the status review.
  - `contents: read` — to read the PR's file list.
- Runner tools: `bash`, `gh`, `jq`. GitHub-hosted Ubuntu runners ship with all
  three by default; self-hosted runners must install them before the step runs.

```yaml
permissions:
  pull-requests: write
  contents: read

jobs:
  check-pr-diff-size:
    runs-on: ubuntu-latest
    steps:
      - uses: 0k-software/.github/check-pr-diff-size@v1
        with:
          limit: 500
          ignored-paths: |
            priv/static/**
            deps/**
```

See [`action.yml`](./action.yml) for the full list of inputs and their
defaults.
