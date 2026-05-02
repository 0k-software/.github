# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Repository Purpose

This is a [`.github` community health repository][gh-community-health] — its
contents apply as defaults across all repositories in the GitHub
account/organization that don't define their own.

Two kinds of artifact live here:

- GitHub Issue Templates under `.github/ISSUE_TEMPLATE/`.
- Shared **composite GitHub Actions**, one per top-level subdirectory (e.g.
  `hide-addressed-reviews/`). Each action directory contains its own
  `action.yml` and `README.md` and is consumed as
  `uses: 0k-software/.github/<action-name>@<tag>`.

The org's Claude Code skills used to live here as the `0k` plugin; they have
moved to [`0k-software/kata`](https://github.com/0k-software/kata).

## Issue Template System

Templates are numbered to control display order in GitHub's issue picker. Blank
issue creation is disabled (`config.yml`).

| Template            | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `1-pitch.yml`       | Propose a new project                          |
| `2-feature.yml`     | New feature request                            |
| `3-task.yml`        | Infrastructure, migration, or setup work       |
| `4-bug.yml`         | Bug report with severity                       |
| `5-enhancement.yml` | Refactor, DevX, or performance improvement     |
| `6-kickoff.yml`     | Pre-flight checklist before starting a project |

## Project-Specific Tech Stack (referenced in templates)

The templates are tailored for an **Elixir/Phoenix** stack:

- **Phoenix** — web framework and contexts (boundary architecture)
- **Ecto** — database migrations and schemas
- **Oban** — background jobs
- **Backpex** — admin pages
- **PhoenixTest** — integration testing
- **AGENTS.md** — AI assistant context files (referenced as a documentation)
- **CLAUDE.md** — A symlink to **AGENTS.md**

## Setup

After cloning, run:

```
make setup
```

`make setup` copies the project hooks from `.git-hooks/` into `.git/hooks/`
(pre-commit verifies Markdown formatting).

## Editing Guidelines

- Maintain the numeric prefix naming convention for templates to preserve
  display order.
- The pre-flight checklist in `2-feature.yml` reflects the team's standard
  development workflow — keep it in sync with actual practices.
- `6-kickoff.yml` is for project-level planning; `2-feature.yml`'s checklist is
  for individual feature implementation.

## Label Conventions

Two labels track the AI work lifecycle across issues and PRs:

| Label         | Color      | Meaning                                     |
| ------------- | ---------- | ------------------------------------------- |
| `in progress` | blue       | An AI assistant is actively working on this |
| `to review`   | orange-red | The AI has finished; human review is needed |

**Lifecycle:** `in progress` → `to review` → human clears `to review`

The kata plugin's skills manage these labels automatically:

- Add `in progress` when a skill starts working on an issue or PR.
- Swap to `to review` when the skill hands off (end of `refine`, `plan-init`,
  `plan-execute`, and `fix`).

Do not manually set `in progress` during an active AI session. If either label
is absent from a repo, skill operations on it are silently skipped — run
`scripts/one-time/2026-04-22-create-labels` to provision the labels.

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
