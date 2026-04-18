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
templates).

## Plugin

The `0k` Claude Code plugin lives in `0k/`. It contains all org-shared skills.
For local development, install from the working copy:

```
make install-plugin
```

### Making the plugin available in other 0k-software projects

Add this to the project's `.claude/settings.json` to declare the marketplace
and auto-enable the plugin — the standard Claude Code mechanism, no scripts or
hooks required:

```json
{
  "extraKnownMarketplaces": {
    "0k-software": {
      "source": {
        "source": "github",
        "repo": "0k-software/.github"
      }
    }
  },
  "enabledPlugins": {
    "0k@0k-software": true
  }
}
```

Claude Code installs the plugin from the latest GitHub release on session start
and keeps it up to date automatically.

## Editing Guidelines

- Maintain the numeric prefix naming convention for templates to preserve
  display order.
- The pre-flight checklist in `2-feature.yml` reflects the team's standard
  development workflow — keep it in sync with actual practices.
- `6-kickoff.yml` is for project-level planning; `2-feature.yml`'s checklist is
  for individual feature implementation.

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
