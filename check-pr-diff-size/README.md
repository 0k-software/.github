# check-pr-diff-size

Reusable composite GitHub Action that enforces a configurable PR diff-size
limit by posting a status review on the PR — `REQUEST_CHANGES` when the limit
is exceeded, `COMMENT` otherwise.

## Usage

```yaml
- uses: 0k-software/.github/check-pr-diff-size@v1
  with:
    limit: 500
    ignored-paths: |
      priv/static/**
      deps/**
```

See [`action.yml`](./action.yml) for the full list of inputs and their
defaults.
