# Visual Companion Guide

A browser-based tool for showing mockups, diagrams, and interactive visual
options during brainstorming sessions.

## When to Use the Browser vs Terminal

**Use the browser** for content that is inherently visual:

- UI mockups and wireframes
- Architecture diagrams
- Side-by-side layout comparisons
- Design polish and colour/style options
- Spatial relationships between components

**Use the terminal** for content that is text-based:

- Requirements clarification
- Conceptual choices and tradeoff lists
- A/B/C/D text options
- Technical decisions
- Scope and priority discussions

A topic being about UI does not make it a visual question. "What should this
screen's primary action be?" is conceptual — use the terminal. "Which of these
two layouts feels right?" is visual — use the browser.

## Starting a Session

```bash
scripts/start-server.sh --project-dir /path/to/project
```

The command outputs JSON with `url`, `screen_dir`, and `state_dir`. Share the
URL with the user and tell them what to expect.

Options:

- `--host <bind-host>` — network interface to bind (default: `127.0.0.1`; use
  `0.0.0.0` in remote/container environments)
- `--url-host <host>` — hostname shown in the returned URL
- `--foreground` — run in the current terminal (required in some CI/Codex
  environments)

## The Loop

1. Write an HTML fragment to `$SCREEN_DIR/<name>.html`
2. Tell the user what to expect in a short terminal message, then share the URL
3. On your next turn, read `$STATE_DIR/events` (JSON lines) to see what they
   clicked
4. Decide: iterate on the same screen, advance to the next question, or return
   to terminal-only discussion
5. When moving to a text-only question, push a waiting screen so the browser
   doesn't show stale content

## Writing Screens

Write **content fragments** by default — just the inner HTML, no `<html>` or
`<!DOCTYPE>` wrapper. The server automatically wraps fragments in the full
frame template (`scripts/frame-template.html`).

Only write a full document if you need to override the frame entirely.

**Important:** Never reuse filenames. Each new screen must have a unique name
(e.g., `layout-v2.html` instead of overwriting `layout.html`). The server
serves the newest file by modification time.

## Reading User Interactions

User clicks on `[data-choice]` elements are logged as JSON lines in
`$STATE_DIR/events`:

```json
{
  "type": "click",
  "text": "Option A",
  "choice": "option-a",
  "timestamp": 1234567890
}
```

Read this file on your next turn to see what the user selected. The file is
cleared automatically each time a new screen is pushed.

## Available CSS Classes

The frame template provides ready-to-use classes — no custom styling needed:

| Class                      | Use for                  |
| -------------------------- | ------------------------ |
| `.options` + `.option`     | A/B/C clickable choices  |
| `.cards` + `.card`         | Visual design options    |
| `.mockup` + `.mockup-body` | UI preview containers    |
| `.split`                   | Side-by-side comparisons |
| `.pros-cons`               | Pro/con comparisons      |
| `.placeholder`             | Dashed wireframe areas   |

Add `data-choice="value"` and `onclick="toggleSelect(this)"` to any element to
make it selectable.

## Stopping the Server

```bash
scripts/stop-server.sh <session_dir>
```

The server also stops automatically after 30 minutes of inactivity, or when the
owning process exits.
