# hide-addressed-reviews

A reusable composite GitHub Action that keeps a pull request's conversation
pane clean: it finds wrap-up reviews (bare `LGTM`/`LBTM`/`ACK`/`NACK`-style
bodies, plus Copilot PR reviews) whose every review thread has already been
resolved, and minimizes them so they collapse under the "hidden" fold.

The action never resolves threads for you — it only hides reviews whose threads
are **already** addressed. Reviews with outstanding asks stay visible.

## Usage

Pin to the major tag:

```yaml
name: Check

on:
  pull_request:

permissions:
  pull-requests: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: 0k-software/.github/hide-addressed-reviews@v1
```

Any event running in the context of a PR works — just make sure
`github.event.pull_request.number` is populated, or pass `pr-number`
explicitly.

## Inputs

| Name                 | Description                                                                                                                                                                                                 | Default                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `body-match-pattern` | Case-insensitive PCRE regex (evaluated via `jq test()`) matched against each review body after `ascii_downcase`. A review is a candidate if it matches OR if its author is `copilot-pull-request-reviewer`. | `^\s*(lgtm\|lbtm\|ack\|nack)?\s*$`        |
| `classifier`         | `minimizeComment` classifier applied to hidden reviews. One of `RESOLVED`, `OUTDATED`, `OFF_TOPIC`, `DUPLICATE`, `SPAM`, `ABUSE`.                                                                           | `RESOLVED`                                |
| `pr-number`          | Pull request number to operate on. Falls back to `github.event.pull_request.number` when empty.                                                                                                             | _(empty — auto-infers from the PR event)_ |
| `github-token`       | Token used to call the GraphQL API. Needs `pull-requests: write`. Composite actions do not inherit `secrets` from the calling workflow, so pass a PAT explicitly if the default token is insufficient.      | _(empty — falls back to `github.token`)_  |

## Permissions

The calling workflow needs at least:

```yaml
permissions:
  pull-requests: write
```

## Requirements

The action shells out to `gh` (for `gh api graphql`) and `jq`. Both are
pre-installed on GitHub-hosted Ubuntu runners, so no extra setup is required
there. On self-hosted or custom runners, make sure both are on `PATH` before
this step runs — otherwise install them first, e.g.:

```yaml
- run: sudo apt-get update && sudo apt-get install -y gh jq
```

## How it works

In a single GraphQL round-trip, the action fetches every review on the PR (with
its body, author, `isMinimized` flag, and the `databaseId`s of the review
comments it opened) plus every `reviewThread` (with `isResolved` and the
`databaseId`s of its comments). Then, in jq:

1. Drop already-minimized reviews.
2. Keep reviews whose body matches `body-match-pattern` **or** whose author is
   `copilot-pull-request-reviewer`.
3. For each remaining review, find the review threads it opened by intersecting
   its review-comment `databaseId`s with each thread's comment `databaseId`s.
4. Keep only reviews where **every** opened thread is resolved.
5. Call `minimizeComment` with the configured `classifier` for each surviving
   review.

The internal step is wrapped in `continue-on-error: true`, so a transient
GraphQL failure won't fail the calling workflow.

## Versioning & releases

Consumers pin to the moving major tag (e.g. `@v1`). Releases are cut through
the [0k-software/.github release process][release] — GitHub's Release workflow
creates the tag; there is no manual `git tag` push.

[release]: https://github.com/0k-software/.github#releasing-a-new-version
