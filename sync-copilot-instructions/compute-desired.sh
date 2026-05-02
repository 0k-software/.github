#!/usr/bin/env bash
# Print the DESIRED contents of a target repo's .github/copilot-instructions.md
# given the CANONICAL body and the EXISTING file (possibly /dev/null for 404).
#
# Usage: compute-desired.sh <canonical> <existing>
#
# Behaviour:
#   - EXISTING missing/empty/-/dev/null -> markers wrapping CANONICAL.
#   - EXISTING present, no markers      -> markers + CANONICAL prepended above
#                                          EXISTING (a blank line separates).
#   - EXISTING present with markers     -> EXISTING with the marker-section
#                                          body replaced by CANONICAL. When the
#                                          existing body already equals CANONICAL,
#                                          the output is byte-identical to
#                                          EXISTING (caller compares to detect
#                                          drift).
#
# This script does NOT compare DESIRED to EXISTING — the caller does that.

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <canonical> <existing>" >&2
  exit 2
fi

CANONICAL="$1"
EXISTING="$2"

if [ ! -r "$CANONICAL" ]; then
  echo "compute-desired: cannot read canonical '$CANONICAL'" >&2
  exit 2
fi

BEGIN_MARK='<!-- 0k:org-instructions:begin -->'
END_MARK='<!-- 0k:org-instructions:end -->'

print_canonical() {
  awk '{ print }' "$CANONICAL"
}

# Wrap canonical with bare markers — used by the no-markers prepend so the
# repo's existing content stays the source of structural truth.
emit_wrapped() {
  printf '%s\n' "$BEGIN_MARK"
  print_canonical
  printf '%s\n' "$END_MARK"
}

# Wrap canonical with the full deployed scaffolding — a brief H1 intro,
# the org-wide markers wrapping the canonical body, and a "Repo-specific
# instructions" H2 below for repos to extend. Used only when creating a
# target file from scratch.
emit_scaffolded() {
  cat <<'PREFIX'
# GitHub Copilot instructions

Guidance for GitHub Copilot when working in this repository.

PREFIX
  emit_wrapped
  cat <<'SUFFIX'

## Repo-specific instructions

This section is owned by this repo. Anything written here is preserved
across syncs.
SUFFIX
}

existing_is_present=1
if [ "$EXISTING" = "/dev/null" ] || [ ! -e "$EXISTING" ] || [ ! -s "$EXISTING" ]; then
  existing_is_present=0
fi

if [ "$existing_is_present" -eq 0 ]; then
  emit_scaffolded
  exit 0
fi

begin_line=""
end_line=""
if grep -q '0k:org-instructions:begin' "$EXISTING"; then
  begin_line=$(grep -nE '^[[:space:]]*<!--[[:space:]]*0k:org-instructions:begin[[:space:]]*-->[[:space:]]*$' "$EXISTING" | head -1 | cut -d: -f1 || true)
  end_line=$(grep -nE '^[[:space:]]*<!--[[:space:]]*0k:org-instructions:end[[:space:]]*-->[[:space:]]*$' "$EXISTING" | head -1 | cut -d: -f1 || true)
fi

if [ -n "${begin_line:-}" ] && [ -n "${end_line:-}" ] && [ "$begin_line" -lt "$end_line" ]; then
  awk -v canonical="$CANONICAL" '
    BEGIN { inside = 0; replaced = 0 }
    /^[[:space:]]*<!--[[:space:]]*0k:org-instructions:begin[[:space:]]*-->[[:space:]]*$/ {
      if (replaced == 0) {
        print
        while ((getline cline < canonical) > 0) print cline
        close(canonical)
        inside = 1
        replaced = 1
        next
      }
      print
      next
    }
    /^[[:space:]]*<!--[[:space:]]*0k:org-instructions:end[[:space:]]*-->[[:space:]]*$/ {
      if (inside == 1) {
        inside = 0
        print
        next
      }
      print
      next
    }
    {
      if (inside == 0) print
    }
  ' "$EXISTING"
else
  # No markers, or markers are unbalanced/out of order — fall back to the
  # no-markers prepend so we never silently drop trailing content.
  emit_wrapped
  printf '\n'
  awk '{ print }' "$EXISTING"
fi
