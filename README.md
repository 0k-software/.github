# 0k-software/.github

This is the [community health repository][gh-community-health] for the
0k-software GitHub organization. Its contents serve as org-wide defaults for
any repository that doesn't define its own.

It contains two main things: **GitHub Issue Templates** and **shared Composite
Actions**.

The org's Claude Code skills now live in a separate repository,
[`0k-software/kata`](https://github.com/0k-software/kata).

## Issue Templates

Templates live in `.github/ISSUE_TEMPLATE/` and appear in GitHub's issue picker
for every repo in the org. Blank issue creation is disabled (`config.yml`).
Templates are numbered to control display order.

| Template            | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `1-pitch.yml`       | Propose a new project                          |
| `2-feature.yml`     | New feature request                            |
| `3-task.yml`        | Infrastructure, migration, or setup work       |
| `4-bug.yml`         | Bug report with severity                       |
| `5-enhancement.yml` | Refactor, DevX, or performance improvement     |
| `6-kickoff.yml`     | Pre-flight checklist before starting a project |

Templates are tailored for an **Elixir/Phoenix** stack (Phoenix, Ecto, Oban,
Backpex, PhoenixTest).

## Composite Actions

Shared GitHub composite actions live in top-level subdirectories (one directory
per action, each containing an `action.yml` and a `README.md`). Consumers pin
to the moving major tag, e.g.
`uses: 0k-software/.github/hide-addressed-reviews@v1`.

| Action                                                               | `uses:` path                                    | Purpose                                                                        |
| -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------ |
| [`hide-addressed-reviews`](./hide-addressed-reviews/README.md)       | `0k-software/.github/hide-addressed-reviews`    | Minimize LGTM-style bot reviews and resolve the threads they opened.           |
| [`check-pr-size`](./check-pr-size/README.md)                         | `0k-software/.github/check-pr-size`             | Enforce a configurable PR size limit with a status review.                     |
| [`sync-copilot-instructions`](./sync-copilot-instructions/README.md) | `0k-software/.github/sync-copilot-instructions` | Sync the org-wide canonical Copilot instructions into every repo's `.github/`. |

See each action's own `README.md` for inputs, permissions, and examples.

## Git Hooks

Project hooks live in `.git-hooks/` and are not installed automatically by Git.
Run `make setup` to copy them into `.git/hooks/` after cloning.

### Available hooks

| Hook         | What it does                               |
| ------------ | ------------------------------------------ |
| `pre-commit` | Verifies that Markdown files are formatted |

#### `pre-commit`

Runs `npx prettier --check "**/*.md"` if `npx` is available; prints a warning
and continues if it isn't.

### Installation

```sh
make setup
```

This copies every file in `.git-hooks/` into `.git/hooks/` and makes them
executable. It is safe to re-run and will overwrite any existing hooks with the
same name.

### Fixing hook failures

**Markdown formatting issues:**

```sh
npx prettier --write "**/*.md"
git add -p
```

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
