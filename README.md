# 0k-software/.github

This is the [community health repository][gh-community-health] for the
0k-software GitHub organization. Its contents serve as org-wide defaults for
any repository that doesn't define its own.

It contains two main things: **GitHub Issue Templates** and **Claude Code
Skills**.

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

## Claude Code Skills

Reusable Claude Code skills live in `.claude/skills/`. Each skill is a
subdirectory with a `SKILL.md` that defines its behavior.

| Skill             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `0k-commit`       | Stage all changes and generate a Conventional Commit |
| `0k-create-issue` | Create a GitHub issue using the org issue templates  |
| `0k-fix-pr`       | Address unresolved PR review comments                |
| `0k-plan`         | Manage a GH issue implementation plan                |
| `0k-rebase`       | Rebase current branch onto another                   |

### Installing skills locally

To install skills into `~/.claude/skills/` so they're available in all local
Claude Code sessions:

```sh
make install-skills
```

To uninstall:

```sh
make uninstall-skills
```

### Installing skills in remote sessions (other 0k-software projects)

Remote Claude Code sessions (e.g. claude.ai/code) don't load
`~/.claude/skills/`, so skills must be present in each project's own
`.claude/skills/`. Add this `SessionStart` hook to the project's
`.claude/settings.json` to keep org skills automatically available:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash <(curl -fsSL https://raw.githubusercontent.com/0k-software/.github/main/bin/ensure-org-skills)"
          }
        ]
      }
    ]
  }
}
```

**What it does:**

- **Missing skills** are copied into `.claude/skills/` automatically. Commit
  the new files so they persist across sessions.
- **Outdated skills** (local copy differs from this repo) trigger a warning
  with update instructions — no silent overwrites.

**To manually update outdated skills:**

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/0k-software/.github/main/bin/update-org-skills)
```

Review the diff (`git diff .claude/skills/`) and commit when satisfied.

## Git Hooks

Project hooks live in `.git-hooks/` and are not installed automatically by Git.
Run `make setup` to copy them into `.git/hooks/`.

### Available hooks

| Hook         | What it does                                                      |
| ------------ | ----------------------------------------------------------------- |
| `pre-commit` | Checks skill templates are in sync and that Markdown is formatted |

#### `pre-commit`

Runs two checks before every commit:

1. **Skill template sync** — calls `bin/check-skill-templates` to verify that
   `.claude/skills/0k-create-issue/templates/` matches
   `.github/ISSUE_TEMPLATE/`. Fails if they differ, since the skill bundles
   copies of the issue templates.
2. **Prettier formatting** — runs `npx prettier --check "**/*.md"` if `npx` is
   available; prints a warning and continues if it isn't.

### Installation

```sh
make setup
```

This copies every file in `.git-hooks/` into `.git/hooks/` and makes them
executable. It is safe to re-run and will overwrite any existing hooks with the
same name.

The `SessionStart` hook in `.claude/settings.json` runs `make setup`
automatically whenever a Claude Code session opens in this repo, so hooks stay
current without manual intervention.

### Fixing hook failures

**Skill templates out of sync:**

```sh
make sync-skill-templates
git add .claude/skills/0k-create-issue/templates/
```

**Markdown formatting issues:**

```sh
npx prettier --write "**/*.md"
git add -p
```

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
