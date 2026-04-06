#!/usr/bin/env bash
# =============================================================================
# scripts/ai-check.sh
# HealFlow DevSecOps — AI Suggestion Engine
# Advisory only — never exits with code 1 (never blocks pipeline)
# Uses only bash + node — no python3 dependency
# =============================================================================

# Intentionally NOT using set -e — this script is advisory, never blocking
set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

CREATE_ISSUE="${1:-false}"
REPORT_FILE="${TMPDIR:-/tmp}/healflow-ai-report.md"
ISSUES_FOUND=0

echo ""
echo -e "${PURPLE}============================================================${NC}"
echo -e "${PURPLE}  HealFlow — AI DevSecOps Suggestion Engine${NC}"
echo -e "${PURPLE}  Advisory mode: never blocks pipeline${NC}"
echo -e "${PURPLE}============================================================${NC}"
echo ""

# Init report
cat > "$REPORT_FILE" << HEADER
# HealFlow AI DevSecOps Report

**Generated:** $(date -u +'%Y-%m-%d %H:%M UTC')
**Branch:** ${GITHUB_REF_NAME:-local}
**Commit:** ${GITHUB_SHA:-local}

---

## Issues & Suggestions

HEADER

# =============================================================================
# HELPER: log_issue
# =============================================================================
log_issue() {
  local SEVERITY="$1"
  local CATEGORY="$2"
  local PROBLEM="$3"
  local SUGGESTION="$4"
  local FIX_CMD="${5:-}"

  ISSUES_FOUND=$((ISSUES_FOUND + 1))

  local ICON
  case "$SEVERITY" in
    critical) ICON="🔴" ;;
    high)     ICON="🟠" ;;
    medium)   ICON="🟡" ;;
    low)      ICON="🟢" ;;
    *)        ICON="🔵" ;;
  esac

  echo -e "  ${ICON} ${YELLOW}[${SEVERITY^^}]${NC} ${CATEGORY}"
  echo -e "     Problem    : ${PROBLEM}"
  echo -e "     Suggestion : ${CYAN}${SUGGESTION}${NC}"
  [[ -n "$FIX_CMD" ]] && echo -e "     Fix        : ${BLUE}${FIX_CMD}${NC}"
  echo ""

  cat >> "$REPORT_FILE" << ISSUE

### ${ICON} [${SEVERITY^^}] ${CATEGORY}

**Problem:** ${PROBLEM}

**Suggestion:** ${SUGGESTION}

$([ -n "$FIX_CMD" ] && printf '**Fix:**\n```bash\n%s\n```' "$FIX_CMD" || true)

---
ISSUE
}

# =============================================================================
# CHECK 1: npm audit using Node (no python3)
# =============================================================================
echo -e "${BLUE}-- Security Vulnerability Scan --${NC}"

check_audit_node() {
  local DIR="$1"
  local LABEL="$2"

  if [[ ! -f "${DIR}/package.json" ]]; then return; fi

  cd "$DIR"
  # Use node to parse npm audit JSON instead of python3
  AUDIT_JSON=$(npm audit --json 2>/dev/null || echo '{}')

  CRITICAL=$(node -e "
    try {
      const d = JSON.parse(process.argv[1]);
      const v = (d.metadata || {}).vulnerabilities || {};
      console.log(v.critical || 0);
    } catch(e) { console.log(0); }
  " "$AUDIT_JSON" 2>/dev/null || echo "0")

  HIGH=$(node -e "
    try {
      const d = JSON.parse(process.argv[1]);
      const v = (d.metadata || {}).vulnerabilities || {};
      console.log(v.high || 0);
    } catch(e) { console.log(0); }
  " "$AUDIT_JSON" 2>/dev/null || echo "0")

  MODERATE=$(node -e "
    try {
      const d = JSON.parse(process.argv[1]);
      const v = (d.metadata || {}).vulnerabilities || {};
      console.log(v.moderate || 0);
    } catch(e) { console.log(0); }
  " "$AUDIT_JSON" 2>/dev/null || echo "0")

  if [[ "${CRITICAL:-0}" -gt 0 ]]; then
    log_issue "critical" "${LABEL} Security" \
      "${CRITICAL} CRITICAL vulnerability(s) detected in npm audit" \
      "Run npm audit fix immediately — do not deploy until resolved" \
      "cd ${DIR} && npm audit fix --force"
  elif [[ "${HIGH:-0}" -gt 0 ]]; then
    log_issue "high" "${LABEL} Security" \
      "${HIGH} HIGH severity vulnerability(s) in npm audit" \
      "Run npm audit fix and test for breaking changes" \
      "cd ${DIR} && npm audit fix"
  elif [[ "${MODERATE:-0}" -gt 0 ]]; then
    log_issue "medium" "${LABEL} Dependencies" \
      "${MODERATE} moderate vulnerability(s) found" \
      "Plan to update affected packages in the next sprint" \
      "cd ${DIR} && npm audit fix"
  else
    echo -e "  ${GREEN}[PASS] ${LABEL}: No known vulnerabilities${NC}"
  fi

  cd - > /dev/null
}

check_audit_node "backend"  "Backend"
check_audit_node "frontend" "Frontend"
echo ""

# =============================================================================
# CHECK 2: Outdated dependencies using Node
# =============================================================================
echo -e "${BLUE}-- Outdated Dependencies --${NC}"

check_outdated_node() {
  local DIR="$1"
  local LABEL="$2"

  if [[ ! -f "${DIR}/package.json" ]]; then return; fi

  cd "$DIR"
  OUTDATED_JSON=$(npm outdated --json 2>/dev/null || echo '{}')

  COUNT=$(node -e "
    try {
      const d = JSON.parse(process.argv[1]);
      console.log(Object.keys(d).length);
    } catch(e) { console.log(0); }
  " "$OUTDATED_JSON" 2>/dev/null || echo "0")

  if [[ "${COUNT:-0}" -gt 0 ]]; then
    # List up to 5 outdated packages using node
    PACKAGES=$(node -e "
      try {
        const d = JSON.parse(process.argv[1]);
        const entries = Object.entries(d).slice(0, 5);
        entries.forEach(([name, info]) => {
          console.log('  - ' + name + ': ' + (info.current||'?') + ' → ' + (info.latest||'?'));
        });
      } catch(e) {}
    " "$OUTDATED_JSON" 2>/dev/null || echo "  (could not parse)")

    log_issue "low" "${LABEL} Dependencies" \
      "${COUNT} outdated package(s) detected" \
      "Update deps to get security patches and bug fixes" \
      "cd ${DIR} && npm update"

    echo "$PACKAGES"
    echo ""
  else
    echo -e "  ${GREEN}[PASS] ${LABEL}: All packages up to date${NC}"
  fi

  cd - > /dev/null
}

check_outdated_node "backend"  "Backend"
check_outdated_node "frontend" "Frontend"
echo ""

# =============================================================================
# CHECK 3: Missing .env files
# =============================================================================
echo -e "${BLUE}-- Environment Files --${NC}"

if [[ ! -f "backend/.env" && -z "${GITHUB_ACTIONS:-}" ]]; then
  log_issue "medium" "Environment" \
    "backend/.env is missing (local development only)" \
    "Copy the example file and fill in values" \
    "cp backend/.env.example backend/.env"
else
  echo -e "  ${GREEN}[PASS] backend env: OK${NC}"
fi

if [[ ! -f "frontend/.env.local" && -z "${GITHUB_ACTIONS:-}" ]]; then
  log_issue "low" "Environment" \
    "frontend/.env.local is missing (local development only)" \
    "Copy the example file" \
    "cp frontend/.env.example frontend/.env.local"
else
  echo -e "  ${GREEN}[PASS] frontend env: OK${NC}"
fi
echo ""

# =============================================================================
# CHECK 4: package.json scripts
# =============================================================================
echo -e "${BLUE}-- package.json Scripts --${NC}"

check_scripts() {
  local DIR="$1"
  local LABEL="$2"
  shift 2
  local SCRIPTS=("$@")

  if [[ ! -f "${DIR}/package.json" ]]; then return; fi

  for SCRIPT in "${SCRIPTS[@]}"; do
    if ! grep -q "\"${SCRIPT}\"" "${DIR}/package.json" 2>/dev/null; then
      log_issue "low" "${LABEL} package.json" \
        "Missing '${SCRIPT}' script" \
        "Add '${SCRIPT}' to ${DIR}/package.json scripts for CI/CD" \
        ""
    else
      echo -e "  ${GREEN}[PASS] ${LABEL}: '${SCRIPT}' script present${NC}"
    fi
  done
}

check_scripts "backend"  "Backend"  "start" "dev" "lint" "test"
check_scripts "frontend" "Frontend" "dev" "build" "lint" "preview"
echo ""

# =============================================================================
# CHECK 5: HIPAA/security packages
# =============================================================================
echo -e "${BLUE}-- HIPAA & Security Packages --${NC}"

if [[ -f "backend/package.json" ]]; then
  for PKG in "helmet" "cors" "express-validator"; do
    if grep -q "\"${PKG}\"" "backend/package.json" 2>/dev/null; then
      echo -e "  ${GREEN}[PASS] ${PKG} installed${NC}"
    else
      log_issue "high" "HIPAA/Security" \
        "'${PKG}' not found in backend dependencies" \
        "Install ${PKG} — required for HIPAA-grade security" \
        "cd backend && npm install ${PKG}"
    fi
  done
fi
echo ""

# =============================================================================
# CHECK 6: .gitignore
# =============================================================================
echo -e "${BLUE}-- .gitignore Hygiene --${NC}"

if [[ -f ".gitignore" ]]; then
  MISSING_PATTERNS=()
  for PATTERN in ".env" ".env.local" "node_modules" "dist"; do
    if ! grep -q "$PATTERN" .gitignore 2>/dev/null; then
      MISSING_PATTERNS+=("$PATTERN")
    fi
  done

  if [[ ${#MISSING_PATTERNS[@]} -gt 0 ]]; then
    log_issue "high" ".gitignore" \
      "Missing patterns: ${MISSING_PATTERNS[*]}" \
      "Add these to .gitignore to prevent secret commits" \
      "printf '%s\n' '${MISSING_PATTERNS[*]}' >> .gitignore"
  else
    echo -e "  ${GREEN}[PASS] .gitignore covers all critical patterns${NC}"
  fi
else
  log_issue "critical" ".gitignore" \
    ".gitignore missing" \
    "Create .gitignore immediately to prevent committing secrets" \
    "curl -o .gitignore https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore"
fi
echo ""

# =============================================================================
# FINALIZE REPORT
# =============================================================================
cat >> "$REPORT_FILE" << FOOTER

## Summary

| Metric | Value |
|--------|-------|
| Issues found | ${ISSUES_FOUND} |
| Branch | ${GITHUB_REF_NAME:-local} |
| Generated | $(date -u +'%Y-%m-%d %H:%M UTC') |

> This report is advisory only. All critical/high issues should be addressed before the next release.
FOOTER

# Write GitHub Actions outputs
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "issues_found=${ISSUES_FOUND}" >> "$GITHUB_OUTPUT"
  echo "report_path=${REPORT_FILE}" >> "$GITHUB_OUTPUT"
fi

echo -e "${PURPLE}============================================================${NC}"
echo -e "${PURPLE}  AI Check Complete — ${ISSUES_FOUND} issue(s) found${NC}"
echo -e "${PURPLE}  Report: ${REPORT_FILE}${NC}"
echo -e "${PURPLE}============================================================${NC}"
echo ""

# ALWAYS exit 0 — this job is advisory, never blocks the pipeline
exit 0