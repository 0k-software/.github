#!/usr/bin/env bats

setup() {
  SCRIPT="${BATS_TEST_DIRNAME}/../compute-desired.sh"
  FIXTURES="${BATS_TEST_DIRNAME}/fixtures/compute-desired"
}

assert_matches() {
  local case="$1"
  local existing="$2"
  local actual
  actual=$("$SCRIPT" "${FIXTURES}/${case}.canonical.md" "${existing}")
  local expected
  expected=$(cat "${FIXTURES}/${case}.desired.md")
  [ "$actual" = "$expected" ]
}

@test "missing existing (404 via /dev/null): full deployed scaffolding wraps canonical" {
  assert_matches "missing" "/dev/null"
}

@test "existing present, no markers: markers + canonical prepended above content" {
  assert_matches "no-markers" "${FIXTURES}/no-markers.existing.md"
}

@test "existing present, markers wrap identical canonical: output equals existing (no drift)" {
  assert_matches "identical" "${FIXTURES}/identical.existing.md"
  diff -u \
    "${FIXTURES}/identical.existing.md" \
    <("$SCRIPT" "${FIXTURES}/identical.canonical.md" "${FIXTURES}/identical.existing.md")
}

@test "existing has drift + repo content below: marker body replaced, content preserved" {
  assert_matches "drift-with-content-below" "${FIXTURES}/drift-with-content-below.existing.md"
}

@test "existing has repo content above and below markers: marker body replaced, surrounding content preserved" {
  assert_matches "content-above-and-below" "${FIXTURES}/content-above-and-below.existing.md"
}

@test "existing has begin marker without end: falls back to no-markers prepend (no truncation)" {
  assert_matches "unclosed-begin" "${FIXTURES}/unclosed-begin.existing.md"
}

@test "existing has end marker without preceding begin: falls back to no-markers prepend" {
  assert_matches "end-without-begin" "${FIXTURES}/end-without-begin.existing.md"
}

@test "missing canonical file: exits 2" {
  run "$SCRIPT" "${FIXTURES}/does-not-exist.md" "/dev/null"
  [ "$status" -eq 2 ]
}

@test "wrong number of arguments: exits 2" {
  run "$SCRIPT" "${FIXTURES}/missing.canonical.md"
  [ "$status" -eq 2 ]
}
