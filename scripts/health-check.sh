#!/usr/bin/env bash
# =============================================================================
# scripts/health-check.sh
# HealFlow DevSecOps — Backend Health & API Integration Check
# Starts the backend server, validates /health endpoint,
# and runs API integration checks against live endpoints
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m'

PORT="${1:-4000}"
BASE_URL="http://localhost:${PORT}"
SERVER_PID=""
ERRORS=0

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     HealFlow — Backend Health & API Check                ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    echo ""
    echo -e "  🛑 Stopping test server (PID: ${SERVER_PID})..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── Start server ──────────────────────────────────────────────────────────────
echo -e "${BLUE}── Starting Backend Server ───────────────────────────────${NC}"

cd backend
NODE_ENV=test node server.js &
SERVER_PID=$!
echo -e "  ℹ️  Server started with PID: ${SERVER_PID}"

# Wait for server to be ready (max 15 seconds)
echo -e "  ⏳ Waiting for server to become ready..."
RETRIES=0
MAX_RETRIES=15
until curl -sf "${BASE_URL}/health" > /dev/null 2>&1; do
  if [[ $RETRIES -ge $MAX_RETRIES ]]; then
    echo -e "  ❌ ${RED}Server did not start within ${MAX_RETRIES}s${NC}"
    exit 1
  fi
  sleep 1
  ((RETRIES++))
done

echo -e "  ✅ ${GREEN}Server is ready (took ${RETRIES}s)${NC}"
echo ""

# =============================================================================
# FUNCTION: check_endpoint
# Args: method, path, expected_status, description, [jq_check]
# =============================================================================
check_endpoint() {
  local METHOD="$1"
  local PATH="$2"
  local EXPECTED_STATUS="$3"
  local DESCRIPTION="$4"
  local JQ_CHECK="${5:-}"

  RESPONSE=$(curl -s -o /tmp/hf_response.json -w "%{http_code}" \
    -X "$METHOD" \
    -H "Content-Type: application/json" \
    "${BASE_URL}${PATH}" 2>/dev/null || echo "000")

  HTTP_CODE="$RESPONSE"

  if [[ "$HTTP_CODE" == "$EXPECTED_STATUS" ]]; then
    echo -e "  ✅ ${GREEN}[${HTTP_CODE}] ${DESCRIPTION}${NC}"

    # Optional: validate response body with jq
    if [[ -n "$JQ_CHECK" ]] && command -v jq &>/dev/null; then
      JQ_RESULT=$(jq -r "$JQ_CHECK" /tmp/hf_response.json 2>/dev/null || echo "PARSE_ERROR")
      if [[ "$JQ_RESULT" == "null" || "$JQ_RESULT" == "PARSE_ERROR" || -z "$JQ_RESULT" ]]; then
        echo -e "  ⚠️  ${YELLOW}Response shape check failed: ${JQ_CHECK}${NC}"
        ((ERRORS++))
      else
        echo -e "  ✅ ${GREEN}Response shape valid → ${JQ_CHECK} = ${JQ_RESULT}${NC}"
      fi
    fi
  else
    echo -e "  ❌ ${RED}[${HTTP_CODE}] ${DESCRIPTION} (expected ${EXPECTED_STATUS})${NC}"
    if [[ -f /tmp/hf_response.json ]]; then
      echo -e "  ${RED}Body: $(cat /tmp/hf_response.json | head -c 200)${NC}"
    fi
    ((ERRORS++))
  fi
}

# =============================================================================
# HEALTH CHECK
# =============================================================================
echo -e "${BLUE}── Health Endpoint ───────────────────────────────────────${NC}"
check_endpoint "GET" "/health"              "200" "/health returns 200"           ".status"
echo ""

# =============================================================================
# DASHBOARD API
# =============================================================================
echo -e "${BLUE}── Dashboard API ─────────────────────────────────────────${NC}"
check_endpoint "GET" "/api/dashboard/summary" "200" "Dashboard summary loads"     ".success"
echo ""

# =============================================================================
# PATIENTS API
# =============================================================================
echo -e "${BLUE}── Patients API ──────────────────────────────────────────${NC}"
check_endpoint "GET" "/api/patients"             "200" "GET /api/patients"            ".success"
check_endpoint "GET" "/api/patients?status=active" "200" "Filter by active status"   ".total"
check_endpoint "GET" "/api/patients?status=critical" "200" "Filter by critical status" ".total"
check_endpoint "GET" "/api/patients?search=chen" "200" "Search by last name"         ".total"
check_endpoint "GET" "/api/patients?search=MRN"  "200" "Search by MRN prefix"        ".total"
check_endpoint "GET" "/api/patients/p-001"        "200" "GET single patient"          ".data.mrn"
check_endpoint "GET" "/api/patients/nonexistent"  "404" "404 for unknown patient"     ".success"
echo ""

# =============================================================================
# APPOINTMENTS API
# =============================================================================
echo -e "${BLUE}── Appointments API ──────────────────────────────────────${NC}"
TODAY=$(date +%Y-%m-%d)
check_endpoint "GET" "/api/appointments?date=${TODAY}" "200" "Appointments for today"  ".total"
check_endpoint "GET" "/api/appointments"               "200" "All appointments"         ".success"
echo ""

# =============================================================================
# LABS API
# =============================================================================
echo -e "${BLUE}── Lab Results API ───────────────────────────────────────${NC}"
check_endpoint "GET" "/api/labs"               "200" "All lab results"               ".total"
check_endpoint "GET" "/api/labs?flagged=true"  "200" "Flagged lab results"           ".total"
check_endpoint "GET" "/api/labs?status=critical" "200" "Critical lab results"        ".total"
echo ""

# =============================================================================
# SECURITY HEADERS CHECK
# =============================================================================
echo -e "${BLUE}── Security Headers ──────────────────────────────────────${NC}"
HEADERS=$(curl -sI "${BASE_URL}/health" 2>/dev/null || echo "")

check_header() {
  local HEADER="$1"
  local DESC="$2"
  if echo "$HEADERS" | grep -qi "$HEADER"; then
    echo -e "  ✅ ${GREEN}${DESC}${NC}"
  else
    echo -e "  ⚠️  ${YELLOW}Missing header: ${DESC}${NC}"
    ((ERRORS++))
  fi
}

check_header "x-content-type-options" "X-Content-Type-Options (helmet)"
check_header "x-frame-options"        "X-Frame-Options (helmet)"
check_header "x-xss-protection"       "X-XSS-Protection (helmet)"
echo ""

# =============================================================================
# WRITE OUTPUTS FOR CI
# =============================================================================
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "backend_healthy=true" >> "$GITHUB_OUTPUT"
  echo "api_checks_passed=$([[ $ERRORS -eq 0 ]] && echo true || echo false)" >> "$GITHUB_OUTPUT"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
if [[ $ERRORS -gt 0 ]]; then
  echo -e "  ❌ ${RED}FAILED — ${ERRORS} check(s) failed${NC}"
  echo ""
  exit 1
else
  echo -e "  ✅ ${GREEN}ALL API CHECKS PASSED${NC}"
  echo ""
  exit 0
fi