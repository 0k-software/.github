#!/usr/bin/env bash
# Print the content between the org-instructions markers in a markdown file.
#
# Usage: extract-org-section.sh <path>
#
# Behaviour:
#   - File missing/unreadable      -> exit 2 (error to stderr).
#   - No markers                   -> exit 0 with empty output.
#   - Begin without matching end   -> exit 3 (error to stderr).
#   - End without preceding begin  -> exit 3 (error to stderr).
#   - Markers nested or repeated   -> use the first begin and the next end
#                                     after it; ignore later occurrences.
#
# Markers are matched on lines that contain only the marker (optionally
# surrounded by whitespace) so they can sit cleanly on their own line.

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <path>" >&2
  exit 2
fi

path="$1"

if [ ! -r "$path" ]; then
  echo "extract-org-section: cannot read '$path'" >&2
  exit 2
fi

awk '
  BEGIN {
    inside = 0
    captured = 0
    saw_begin = 0
  }
  /^[[:space:]]*<!--[[:space:]]*0k:org-instructions:begin[[:space:]]*-->[[:space:]]*$/ {
    if (captured == 0 && inside == 0) {
      inside = 1
      saw_begin = 1
      next
    }
    next
  }
  /^[[:space:]]*<!--[[:space:]]*0k:org-instructions:end[[:space:]]*-->[[:space:]]*$/ {
    if (inside == 1) {
      inside = 0
      captured = 1
      next
    }
    if (captured == 0 && saw_begin == 0) {
      print "extract-org-section: end marker without preceding begin marker" > "/dev/stderr"
      exit 3
    }
    next
  }
  {
    if (inside == 1) {
      print
    }
  }
  END {
    if (inside == 1) {
      print "extract-org-section: begin marker without matching end marker" > "/dev/stderr"
      exit 3
    }
  }
' "$path"
