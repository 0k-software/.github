# 0k-software/.github

This is the [community health repository][gh-community-health] for the
0k-software GitHub organization. Its contents serve as org-wide defaults for
any repository that doesn't define its own.

It contains two main things: **GitHub Issue Templates** and the **0k Claude
Code Plugin**.

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

## 0k Plugin

The `0k` Claude Code plugin lives in `0k/`. Each skill is a subdirectory under
`0k/skills/` with a `SKILL.md` that defines its behavior. Skills are invoked as
`/0k:<skill-name>`.

| Skill            | Invocation           | Purpose                                              |
| ---------------- | -------------------- | ---------------------------------------------------- |
| `commit`         | `/0k:commit`         | Stage all changes and generate a Conventional Commit |
| `create-issue`   | `/0k:create-issue`   | Create a GitHub issue using the org issue templates  |
| `fix-pr`         | `/0k:fix-pr`         | Address unresolved PR review comments                |
| `plan-init`      | `/0k:plan-init`      | Create an implementation plan from a GitHub issue    |
| `plan-next`      | `/0k:plan-next`      | Implement the next unchecked step in PLAN.md         |
| `plan-add`       | `/0k:plan-add`       | Add a new step to an existing PLAN.md                |
| `plan-execute`   | `/0k:plan-execute`   | Run all remaining plan steps autonomously            |
| `rebase`         | `/0k:rebase`         | Rebase current branch onto another                   |
| `cleanup-branch` | `/0k:cleanup-branch` | Clean up a branch's commit history                   |
| `split-branch`   | `/0k:split-branch`   | Split a large branch into smaller stacked branches   |
| `refine-issue`   | `/0k:refine-issue`   | Refine a GitHub issue from comment feedback          |
| `kitty`          | `/0k:kitty`          | Open kitty terminal for the current directory        |

### Installing the plugin locally

To install the plugin to `~/.claude/plugins/0k/` so it's available in all local
Claude Code sessions:

```sh
make install-plugin
```

To uninstall:

```sh
make uninstall-plugin
```

### Installing the plugin in remote sessions (other 0k-software projects)

Remote Claude Code sessions (e.g. claude.ai/code) don't load
`~/.claude/plugins/`, so the plugin must be present in each project's own
`.claude/plugins/0k/`. Add this `SessionStart` hook to the project's
`.claude/settings.json` to keep the plugin automatically available:

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

- **Missing skills** are copied into `.claude/plugins/0k/` automatically.
  Commit the new files so they persist across sessions.
- **Outdated skills** (local copy differs from this repo) trigger a warning
  with update instructions — no silent overwrites.

**To manually update outdated skills:**

```sh
bash <(curl -fsSL https://raw.githubusercontent.com/0k-software/.github/main/bin/update-org-skills)
```

Review the diff (`git diff .claude/plugins/0k/`) and commit when satisfied.

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
   `0k/skills/create-issue/templates/` matches `.github/ISSUE_TEMPLATE/`. Fails
   if they differ, since the skill bundles copies of the issue templates.
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
git add 0k/skills/create-issue/templates/
```

**Markdown formatting issues:**

```sh
npx prettier --write "**/*.md"
git add -p
```

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
