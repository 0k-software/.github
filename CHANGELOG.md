# Changelog

All notable changes to the 0k Claude Code plugin are documented here.

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** — incompatible skill interface changes
- **MINOR** — new skills added in a backwards-compatible manner
- **PATCH** — backwards-compatible bug fixes and refinements to existing skills

Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added

- `make release VERSION=<semver>` — packages the plugin, tags the commit, and
  publishes a GitHub release with the plugin zip

### Changed

- Distribution switched to the standard Claude Code plugin mechanism. Projects
  declare the marketplace and enable the plugin via `extraKnownMarketplaces`
  and `enabledPlugins` in their `.claude/settings.json`. Claude Code handles
  installation and updates automatically — no SessionStart hook needed.

### Removed

- `bin/install-plugin`, `bin/ensure-plugin`, `bin/update-plugin` — superseded
  by Claude Code's built-in marketplace and plugin commands
  (`/plugin marketplace add`, `/plugin install`, `/plugin update`).
- `SessionStart` hook in `.claude/settings.json` that ran `make setup` and
  `make install-plugin`. Run `make setup` manually after cloning.

---

## [1.0.0] - 2026-04-15

### Added

- `commit` skill — stage all changes and generate a Conventional Commit
- `create-issue` skill — create a GitHub issue using the org issue templates
- `create-pr` skill — create a pull request from the current branch
- `fix-pr` skill — address unresolved PR review comments
- `plan-init` skill — create an implementation plan from a GitHub issue
- `plan-next` skill — implement the next unchecked step in PLAN.md
- `plan-add` skill — add a new step to an existing PLAN.md
- `plan-execute` skill — run all remaining plan steps autonomously
- `rebase` skill — rebase current branch onto another
- `cleanup-branch` skill — clean up a branch's commit history
- `split-branch` skill — split a large branch into smaller stacked branches
- `refine-issue` skill — refine a GitHub issue from comment feedback
- `kitty` skill — open kitty terminal for the current directory
- `ensure-org-skills` / `update-org-skills` bin scripts for remote plugin
  distribution
- MIT license
