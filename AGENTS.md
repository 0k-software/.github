# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Repository Purpose

This is a [`.github` community health repository][gh-community-health] — its
contents apply as defaults across all repositories in the GitHub
account/organization that don't define their own.

The only artifacts here are GitHub Issue Templates located in
`.github/ISSUE_TEMPLATE/`.

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

This copies the project hooks from `.git-hooks/` into `.git/hooks/` (pre-commit
checks that skill template copies stay in sync with the source issue
templates). This runs automatically on Claude Code session start via the
`SessionStart` hook in `.claude/settings.json`.

## Plugin

The `0k` Claude Code plugin lives in `0k/`. It contains all org-shared skills.
To install it locally so it's available across all projects:

```
make install-plugin
```

### Making the plugin available in remote sessions (other 0k-software projects)

Remote Claude Code sessions don't have access to `~/.claude/plugins/`, so the
plugin must be present in each project's own `.claude/plugins/0k/`. To share
the plugin across projects without silently stale copies, add this
`SessionStart` hook to the other project's `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash <(curl -fsSL https://raw.githubusercontent.com/0k-software/.github/main/bin/ensure-plugin)"
          }
        ]
      }
    ]
  }
}
```

**What it does:**

- **Missing skills** are installed automatically into `.claude/plugins/0k/`.
  Commit the new files so they persist across sessions.
- **Outdated skills** (local copy differs from this repo) trigger a warning
  with instructions — no silent overwrites.

**To manually update outdated skills:**

```
bash <(curl -fsSL https://raw.githubusercontent.com/0k-software/.github/main/bin/update-plugin)
```

Review the diff (`git diff .claude/plugins/0k/`) and commit when satisfied.

## Editing Guidelines

- Maintain the numeric prefix naming convention for templates to preserve
  display order.
- The pre-flight checklist in `2-feature.yml` reflects the team's standard
  development workflow — keep it in sync with actual practices.
- `6-kickoff.yml` is for project-level planning; `2-feature.yml`'s checklist is
  for individual feature implementation.

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
