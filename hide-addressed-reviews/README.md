# hide-addressed-reviews

A reusable composite GitHub Action that keeps a pull request's conversation
pane clean: it finds LGTM-style bot reviews, resolves every review thread each
one opened, and then minimizes the review itself so it collapses under the
"hidden" fold.

Use it in any 0k-software repo that has a checker/bot which signs off with an
`lgtm` review — the action removes the repeated "LGTM" noise once sign-off is
no longer interesting.

## Usage

Pin to the major tag:

```yaml
name: PR hygiene

on:
  pull_request_review:
    types: [submitted, edited, dismissed]

permissions:
  pull-requests: write

jobs:
  hide-addressed-reviews:
    runs-on: ubuntu-latest
    steps:
      - uses: 0k-software/.github/hide-addressed-reviews@v1
```

`pull_request_review` is a natural trigger, but any event that runs in the
context of a PR works — just make sure `github.event.pull_request.number` is
populated, or pass `pr-number` explicitly.

## Inputs

| Name                 | Description                                                                                                                                                                                            | Default                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `body-match-pattern` | Case-insensitive extended regex (`grep -iE`) matched against each review body. Only matching reviews are hidden.                                                                                       | `^[[:space:]]*(lgtm\|lbtm\|ack\|nack)[[:space:]]*$` |
| `classifier`         | `minimizeComment` classifier applied to hidden reviews. One of `RESOLVED`, `OUTDATED`, `OFF_TOPIC`, `DUPLICATE`, `SPAM`, `ABUSE`.                                                                      | `RESOLVED`                                          |
| `pr-number`          | Pull request number to operate on. Falls back to `github.event.pull_request.number` when empty.                                                                                                        | _(empty — auto-infers from the PR event)_           |
| `github-token`       | Token used to call the GraphQL API. Needs `pull-requests: write`. Composite actions do not inherit `secrets` from the calling workflow, so pass a PAT explicitly if the default token is insufficient. | _(empty — falls back to `github.token`)_            |

## Permissions

The calling workflow needs at least:

```yaml
permissions:
  pull-requests: write
```

`contents: read` is also required if the workflow does anything else that reads
the repo, but the action itself only talks to the GraphQL API.

## How it works

For each review on the PR:

1. Match `body-match-pattern` against the review body.
2. Find every review thread whose first comment belongs to that review.
3. Resolve any of those threads that aren't already resolved.
4. Minimize the review with the configured `classifier`.

## Versioning & releases

Consumers pin to the moving major tag (e.g. `@v1`). Releases are cut through
the [0k-software/.github release process][release] — GitHub's Release workflow
creates the tag; there is no manual `git tag` push.

[release]: https://github.com/0k-software/.github#releasing-a-new-version
