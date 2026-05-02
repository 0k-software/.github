#!/usr/bin/env bats

setup() {
  SCRIPT="${BATS_TEST_DIRNAME}/../extract-org-section.sh"
  FIXTURES="${BATS_TEST_DIRNAME}/fixtures/extract-org-section"
}

@test "markers only: returns the canonical body" {
  run "$SCRIPT" "${FIXTURES}/markers-only.md"
  [ "$status" -eq 0 ]
  expected=$'canonical body line one\ncanonical body line two'
  [ "$output" = "$expected" ]
}

@test "markers + repo content: returns only the marker section" {
  run "$SCRIPT" "${FIXTURES}/markers-with-content.md"
  [ "$status" -eq 0 ]
  expected=$'canonical body\nspans multiple lines'
  [ "$output" = "$expected" ]
}

@test "no markers: exits 0 with empty output" {
  run "$SCRIPT" "${FIXTURES}/no-markers.md"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "empty file: exits 0 with empty output" {
  run "$SCRIPT" "${FIXTURES}/empty.md"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "unclosed begin marker: exits 3 with error" {
  run "$SCRIPT" "${FIXTURES}/unclosed-begin.md"
  [ "$status" -eq 3 ]
  [[ "$stderr$output" == *"begin marker without matching end"* ]] || \
    [[ "$output" == *"begin marker without matching end"* ]]
}

@test "end marker without preceding begin: exits 3 with error" {
  run "$SCRIPT" "${FIXTURES}/end-without-begin.md"
  [ "$status" -eq 3 ]
}

@test "markers at start of file: returns the canonical body" {
  run "$SCRIPT" "${FIXTURES}/at-start.md"
  [ "$status" -eq 0 ]
  [ "$output" = "canonical" ]
}

@test "markers at end of file: returns the canonical body" {
  run "$SCRIPT" "${FIXTURES}/at-end.md"
  [ "$status" -eq 0 ]
  [ "$output" = "canonical" ]
}

@test "adjacent markers: returns empty body" {
  run "$SCRIPT" "${FIXTURES}/adjacent-markers.md"
  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "duplicated markers: returns only the first body" {
  run "$SCRIPT" "${FIXTURES}/duplicated-markers.md"
  [ "$status" -eq 0 ]
  [ "$output" = "first body" ]
}

@test "missing file: exits 2 with error" {
  run "$SCRIPT" "${FIXTURES}/does-not-exist.md"
  [ "$status" -eq 2 ]
}
