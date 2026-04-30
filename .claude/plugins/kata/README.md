# kata — Claude Code Plugin

The kata Claude Code plugin: a curated set of skills and references that encode
the 0k-software development workflow — issue creation, PR review, plan-driven
implementation, branch hygiene, and a few quality-of-life helpers.

This repository **is** the plugin. Its root is the plugin root, with
`.claude-plugin/plugin.json` declaring the manifest. The plugin is published
through the [`0k-software/0k-plugins`][0k-plugins] marketplace (see
[Installing](#installing-the-plugin) below).

[0k-plugins]: https://github.com/0k-software/0k-plugins

## Installing the plugin

From any Claude Code session, register the marketplace and install:

```
/plugin marketplace add 0k-software/0k-plugins
/plugin install kata@0k-plugins
```

Once installed, every skill is available as `/kata:<skill-name>`.

| Action      | Command                             |
| ----------- | ----------------------------------- |
| Update      | `/plugin update kata@0k-plugins`    |
| Uninstall   | `/plugin uninstall kata@0k-plugins` |
| List skills | `/plugin info kata@0k-plugins`      |

### Enabling across an org's projects

Add this to a project's `.claude/settings.json` to register the marketplace and
auto-enable the plugin for everyone who opens the project:

```json
{
  "extraKnownMarketplaces": {
    "0k-plugins": {
      "source": {
        "source": "github",
        "repo": "0k-software/0k-plugins"
      }
    }
  },
  "enabledPlugins": {
    "kata@0k-plugins": true
  }
}
```

This is the standard Claude Code mechanism for distributing plugins to a team —
no custom scripts or hooks required. Claude Code handles installation and
updates automatically. See the [plugin marketplaces
docs][cc-plugin-marketplaces] for details.

[cc-plugin-marketplaces]:
  https://docs.claude.com/en/docs/claude-code/plugin-marketplaces

## Skills

Every skill is a directory under `skills/` with a `SKILL.md` defining its
frontmatter (name, description, argument hint) and behavior. Each skill is
invoked from a Claude Code session as `/kata:<skill-name>`.

### Workflow

| Skill            | Invocation             | Purpose                                                                                                                                    |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `commit`         | `/kata:commit`         | Stage all changes (staged, unstaged, untracked) and generate a Conventional Commit. Use `!` prefix to auto-fix errors instead of aborting. |
| `create-issue`   | `/kata:create-issue`   | Create a GitHub issue in an 0k-software repo using the standardized templates (pitch, feature, task, bug, enhancement, kickoff).           |
| `create-pr`      | `/kata:create-pr`      | Open a pull request for the current branch with consistent formatting and automatic issue linking. Pass `draft` to open as a draft.        |
| `rebase`         | `/kata:rebase`         | Rebase current branch onto another, handling pre-commit hook failures. `/kata:rebase!` auto-resolves conflicts where safe.                 |
| `cleanup-branch` | `/kata:cleanup-branch` | Squash back-and-forth, WIP, and fixup commits into a clean, reviewable history — without changing the final diff.                          |
| `split-branch`   | `/kata:split-branch`   | Split a large branch into smaller stacked branches (≤500 changed lines each) so PRs are easier to review.                                  |
| `kitty`          | `/kata:kitty`          | Open or activate a [kitty](https://sw.kovidgoyal.net/kitty/) terminal in the current directory.                                            |

### Plan-driven implementation

These skills cooperate around a `PLAN.md` file at the repo root. The canonical
schema lives in [`references/PLAN_FORMAT.md`](references/PLAN_FORMAT.md) —
every plan-\* skill reads it before acting.

| Skill          | Invocation           | Purpose                                                                                                 |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `plan-init`    | `/kata:plan-init`    | Fetch a GitHub issue, design step-by-step implementation, write `PLAN.md`, commit, and open a draft PR. |
| `plan-add`     | `/kata:plan-add`     | Add a new step to an existing `PLAN.md` while preserving the format.                                    |
| `plan-execute` | `/kata:plan-execute` | Autonomously run all remaining plan steps — implement, commit, repeat — until the plan is complete.     |

### Refinement & feedback

| Skill           | Invocation            | Purpose                                                                                                                                             |
| --------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refine`        | `/kata:refine`        | Brainstorm and refine a GitHub issue into a concrete spec before any code is written. Use this before any creative work.                            |
| `fix`           | `/kata:fix`           | Address unresolved feedback on a PR **or** an issue — routes to `fix-pr` or `fix-issue`.                                                            |
| `fix-pr`        | `/kata:fix-pr`        | Address unresolved review comments on a pull request — verify before implementing, push back when technically wrong, commit through `/kata:commit`. |
| `fix-issue`     | `/kata:fix-issue`     | Address unresolved comments on a GitHub issue — update description, reply to feedback, mark addressed with 👀.                                      |
| `address`       | `/kata:address`       | Alias for `/kata:fix`.                                                                                                                              |
| `address-pr`    | `/kata:address-pr`    | Alias for `/kata:fix-pr`.                                                                                                                           |
| `address-issue` | `/kata:address-issue` | Alias for `/kata:fix-issue`.                                                                                                                        |

## References

Static reference material consumed by skills lives under `references/`:

- **`references/PLAN_FORMAT.md`** — canonical structure for `PLAN.md` files,
  shared by every `plan-*` skill.
- **`references/templates/`** — GitHub issue templates used by
  `/kata:create-issue`:

  | File                | Purpose                                        |
  | ------------------- | ---------------------------------------------- |
  | `1-pitch.yml`       | Propose a new project                          |
  | `2-feature.yml`     | New feature request                            |
  | `3-task.yml`        | Infrastructure, migration, or setup work       |
  | `4-bug.yml`         | Bug report with severity                       |
  | `5-enhancement.yml` | Refactor, DevX, or performance improvement     |
  | `6-kickoff.yml`     | Pre-flight checklist before starting a project |

  Templates are tailored for an **Elixir/Phoenix** stack (Phoenix, Ecto, Oban,
  Backpex, PhoenixTest).

## Repository layout

```
.
├── .claude-plugin/
│   └── plugin.json          plugin manifest (name, version, author, license)
├── .github/workflows/
│   └── check.yml            CI: prettier markdown check
├── .prettierrc.yml          markdown formatting rules
├── Makefile                 setup / release targets
├── .git-hooks/
│   └── pre-commit           runs the same checks as CI; installed by `make setup`
├── bin/
│   └── sync-plugin          stages plugin content under .claude/plugins/kata/
├── .claude/
│   ├── settings.json        SessionStart hook → `make setup`
│   ├── hooks/session-start.sh
│   └── plugins/kata/        staged plugin copy (committed; plugin content only)
├── references/
│   ├── PLAN_FORMAT.md       PLAN.md schema used by plan-* skills
│   └── templates/           1-pitch.yml … 6-kickoff.yml
└── skills/
    ├── commit/              SKILL.md
    ├── create-issue/        SKILL.md
    ├── create-pr/           SKILL.md
    ├── fix/                 SKILL.md
    ├── fix-pr/              SKILL.md + README.md
    ├── fix-issue/           SKILL.md
    ├── address/             SKILL.md (alias → fix)
    ├── address-pr/          SKILL.md (alias → fix-pr)
    ├── address-issue/       SKILL.md (alias → fix-issue)
    ├── refine/              SKILL.md, README.md, scripts/, companion docs
    ├── plan-init/           SKILL.md
    ├── plan-add/            SKILL.md
    ├── plan-execute/        SKILL.md
    ├── rebase/              SKILL.md
    ├── cleanup-branch/      SKILL.md
    ├── split-branch/        SKILL.md
    └── kitty/               SKILL.md
```

## Contributing

Skills are plain Markdown — open the relevant `skills/<name>/SKILL.md`, edit
the frontmatter and body, and submit a PR. The frontmatter `description` is
what Claude Code uses to decide when a skill is relevant, so keep it sharp and
trigger-rich.

### Local install for development

Local install lives in the [`0k-software/0k-plugins`][0k-plugins] marketplace
repo — clone it alongside this one and follow its instructions to install a
`kata-dev` variant from your working copy.

### Staged plugin copy

A committed copy of the plugin lives at `.claude/plugins/kata/` so Claude Code
running inside this repo can discover the kata skills without a build step.
Whenever you change anything in the plugin source, regenerate the staged copy:

```sh
bin/sync-plugin
```

CI runs `bin/sync-plugin --check` to keep the two in sync — a drift fails the
build.

### Pre-commit hook

After cloning, install the repo-managed git hooks once:

```sh
make setup
```

This copies `.git-hooks/pre-commit` into `.git/hooks/`, so every commit runs
the same checks as CI (prettier + `bin/sync-plugin --check`). Claude Code
sessions in this repo run `make setup` automatically on start.

### Local checks

```sh
npx prettier --check "**/*.md"   # Markdown formatting (matches CI)
npx prettier --write "**/*.md"   # auto-fix
```

CI runs the same prettier check on every PR via
[`.github/workflows/check.yml`](.github/workflows/check.yml).

To iterate interactively, open a Claude Code session in this repo and invoke
the skill — edits to `SKILL.md` are picked up on the next call.

## Releasing a new version

1. Bump `version` in [`.claude-plugin/plugin.json`](.claude-plugin/plugin.json)
   and commit.
2. Run `make release`. This validates the working tree is clean, creates and
   pushes the `v$VERSION` tag, and publishes a GitHub release with
   auto-generated notes. Claude Code picks up the new version on its next
   `/plugin update` check.

## Attribution

Several skills in this plugin are heavily inspired by — and in parts directly
copied from — [obra/superpowers](https://github.com/obra/superpowers). Used
with gratitude and in compliance with their license.

## License

MIT — see the `license` field in
[`.claude-plugin/plugin.json`](.claude-plugin/plugin.json).
