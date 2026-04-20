# 0k-software/.github

This is the [community health repository][gh-community-health] for the
0k-software GitHub organization. Its contents serve as org-wide defaults for
any repository that doesn't define its own.

It contains three main things: **GitHub Issue Templates**, **shared Composite
Actions**, and the **0k Claude Code Plugin**.

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

| Action                                                         | `uses:` path                                 | Purpose                                                              |
| -------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------- |
| [`hide-addressed-reviews`](./hide-addressed-reviews/README.md) | `0k-software/.github/hide-addressed-reviews` | Minimize LGTM-style bot reviews and resolve the threads they opened. |

See each action's own `README.md` for inputs, permissions, and examples.

## 0k Plugin

The `0k` Claude Code plugin lives in `0k/`. Each skill is a subdirectory under
`0k/skills/` with a `SKILL.md` that defines its behavior. Skills are invoked as
`/0k:<skill-name>`.

| Skill            | Invocation           | Purpose                                              |
| ---------------- | -------------------- | ---------------------------------------------------- |
| `commit`         | `/0k:commit`         | Stage all changes and generate a Conventional Commit |
| `create-issue`   | `/0k:create-issue`   | Create a GitHub issue using the org issue templates  |
| `create-pr`      | `/0k:create-pr`      | Create a pull request for the current branch         |
| `fix`            | `/0k:fix`            | Address unresolved PR review or issue comments       |
| `refine`         | `/0k:refine`         | Brainstorm and refine a GitHub issue into a spec     |
| `plan-init`      | `/0k:plan-init`      | Create an implementation plan from a GitHub issue    |
| `plan-add`       | `/0k:plan-add`       | Add a new step to an existing PLAN.md                |
| `plan-execute`   | `/0k:plan-execute`   | Run all remaining plan steps autonomously            |
| `rebase`         | `/0k:rebase`         | Rebase current branch onto another                   |
| `cleanup-branch` | `/0k:cleanup-branch` | Clean up a branch's commit history                   |
| `split-branch`   | `/0k:split-branch`   | Split a large branch into smaller stacked branches   |
| `kitty`          | `/0k:kitty`          | Open kitty terminal for the current directory        |

### Installing the plugin

From any Claude Code session, register the marketplace and install the plugin:

```
/plugin marketplace add 0k-software/.github
/plugin install 0k@0k-software
```

To update later: `/plugin update 0k@0k-software`. To uninstall:
`/plugin uninstall 0k@0k-software`.

> **Contributors** working inside this repo can use `make install-plugin`
> instead, which installs from the local working copy.

### Enabling the plugin across an org's projects

Add this to a project's `.claude/settings.json` to register the marketplace and
auto-enable the plugin for everyone who opens the project:

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

This is the standard Claude Code mechanism for distributing plugins to a team —
no custom scripts or hooks required. Claude Code handles installation and
updates automatically. See the [plugin marketplaces
docs][cc-plugin-marketplaces] for details.

[cc-plugin-marketplaces]:
  https://docs.claude.com/en/docs/claude-code/plugin-marketplaces

### Releasing a new version

1. Update `version` in `0k/.claude-plugin/plugin.json` and add an entry to
   `CHANGELOG.md`.
2. Commit and push those changes.
3. Run:

```sh
make release
```

The version is read automatically from `plugin.json`. This creates and pushes
the git tag and publishes a GitHub release. Claude Code picks up the new
version on its next plugin update check.

## Git Hooks

Project hooks live in `.git-hooks/` and are not installed automatically by Git.
Run `make setup` to copy them into `.git/hooks/` after cloning.

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

## Attributions

The `/0k:refine` skill — including its visual companion server, browser client,
and frame template — is heavily inspired by and in parts directly copied from
[obra/superpowers](https://github.com/obra/superpowers). Used with gratitude
and in compliance with its license.

[gh-community-health]:
  https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file
