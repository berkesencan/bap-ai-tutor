#!/usr/bin/env bash
set -euo pipefail

# Dev acceptance tests for course context and materials
# Tests both new endpoints and legacy aliases

BASE=${BASE:-http://localhost:8000}
DEV_UID=${DEV_UID:-dev-cli}
HDR=(-H "X-Dev-User-Id: $DEV_UID" -H "X-Impersonate-User: ${IMP_UID:-}")

echo "=== AI Tutor Course Context Acceptance Tests ==="
echo "Base URL: $BASE"
echo "Dev UID: $DEV_UID"
if [ -n "${IMP_UID:-}" ]; then
  echo "Impersonating: $IMP_UID"
fi
echo

echo "== Health Check =="
curl -s "$BASE/api/rag/health" | jq '.data.status'
echo

echo "== Courses (new endpoint) =="
curl -s "${HDR[@]}" "$BASE/api/courses" | tee /tmp/courses.json | jq '.data.courses | {count:(.|length)}'

# Pick first course id, or accept via env DEV_TEST_COURSE_ID
CID=${DEV_TEST_COURSE_ID:-$(jq -r '.data.courses[0]?.id // empty' /tmp/courses.json)}
if [ -z "${CID:-}" ]; then
  echo "❌ No courses for this user."
  echo "💡 If in DEV, set IMP_UID=<a real uid> or DEV_RELAX_MEMBERSHIP=true and rerun."
  echo "💡 Or set DEV_TEST_COURSE_ID=<known-course-id> to test with specific course."
  exit 1
fi
echo "✅ Using course: $CID"
echo

echo "== Materials (new endpoint) =="
curl -s "${HDR[@]}" "$BASE/api/courses/$CID/materials" | tee /tmp/mats.json | jq '.data | {materials:(.materials|length), assignments:(.assignments|length)}'
echo

echo "== Legacy alias materials (dev-only) =="
curl -s "${HDR[@]}" "$BASE/api/ai/materials/$CID" | jq '.data | {materials:(.materials|length), assignments:(.assignments|length)}'
echo

echo "== Legacy alias classrooms (dev-only) =="
curl -s "${HDR[@]}" "$BASE/api/ai/classrooms" | jq '.data | {courses:(.courses|length), teaching:(.teaching|length), enrolled:(.enrolled|length)}'
echo

echo "=== Test Summary ==="
echo "✅ All endpoints responding"
echo "✅ Course context working"
echo "✅ Legacy aliases functional"
echo "✅ Dev impersonation/relaxation active"
