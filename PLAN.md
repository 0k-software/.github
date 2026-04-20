# Plan: fix-pr: include line number in reply links

**Issue:** https://github.com/0k-software/.github/issues/50

## Summary

When `fix-pr` posts a reply to a PR review comment, the commit link should
anchor directly to the commented line in the file, not just dump the reader at
the top of the commit. The GraphQL query already returns `path` and `line` for
every comment — those fields are simply unused when constructing the reply
link.

## Approach

Rewrite the reply-link construction in `0k/skills/fix-pr/SKILL.md` (Step 4c) to
produce a PR-scoped, line-anchored link:

1. **Base URL:** swap the bare commit URL for the PR-scoped **changes** view —
   `https://github.com/{owner}/{repo}/pull/{pr}/changes/{commit_sha}`. The
   `/changes/` path shows only that commit's diff (unlike `/files/`, which
   accumulates all changes from BASE up to the commit).
2. **File anchor:** SHA-256 the file `path` to get the `diff-{hash}` fragment
   GitHub uses in its diff view.
3. **Line anchor:** append `L{line}` for the commented line number.
4. **Final URL:** `{pr_changes_url}#diff-{hash}L{line}`.
5. **Markdown formatting:** in the reply body, format the link manually as
   ``[`{short_sha}`](full_link)`` so GitHub doesn't auto-replace the commit
   reference with its own rendering (which would strip the line anchor).

All inputs (`path`, `line`, commit SHA, owner/repo/pr) are already available in
the skill's existing flow — no new API calls are needed.

## Steps

- [ ] [Step 1: Update fix-pr reply link to anchor at the commented line](#step-1-update-fix-pr-reply-link-to-anchor-at-the-commented-line)

---

## Step 1: Update fix-pr reply link to anchor at the commented line

Edit `0k/skills/fix-pr/SKILL.md` — specifically Step 4c ("Reply to every
thread", around lines 123–138) — to construct a line-anchored, PR-scoped link
instead of the bare commit URL.

**What to change:**

Replace the current instruction:

> Include the commit URL in the reply. Derive it from the SHA:
>
> ```
> gh api "repos/{owner}/{repo}/commits/{sha}" --jq .html_url
> ```

with guidance to build the link as follows:

1. Build the base URL:
   `https://github.com/{owner}/{repo}/pull/{pr-number}/changes/{commit_sha}`
2. Compute the file anchor with SHA-256 of the comment's `path`:
   ```
   printf '%s' "{path}" | sha256sum | awk '{print $1}'
   ```
   Use the full hex digest as `{hash}` — GitHub's diff fragments use the full
   SHA-256, not a prefix.
3. Append the line anchor: `#diff-{hash}L{line}`, using the `line` field from
   the GraphQL response.
4. Use `{short_sha}` = first 7 characters of `{commit_sha}`.
5. In the reply body, format the link manually as
   ``[`{short_sha}`](full_link)``. Do **not** paste the bare URL — GitHub
   auto-detects commit-URL patterns and replaces them with its own rendering,
   which drops the line anchor.

**Notes for the implementer:**

- The `path` and `line` fields are already fetched by the GraphQL query at the
  top of Step 1 — no schema changes needed.
- Each comment in a thread may reference a different line, but in practice all
  comments in the same review thread share the same `path`/`line`. Use the
  first comment's `path`/`line` when constructing the link for the thread.
- If the comment is a file-level comment (`line` is `null`), fall back to
  omitting the `L{line}` suffix — the `#diff-{hash}` anchor alone still jumps
  to the right file.
- Keep the existing AI attribution footer intact.

**Acceptance:**

- A reply posted by `fix-pr` contains a markdown link of the form
  ``[`abc1234`](https://github.com/{owner}/{repo}/pull/{pr}/changes/{sha}#diff-{hash}L{line})``.
- Clicking the link lands on the exact commented line in the PR's changes view.
- GitHub does not auto-rewrite the link to a plain commit reference.
