#!/usr/bin/env bash
# =============================================================================
# scripts/ai-check.sh
# HealFlow DevSecOps — AI Suggestion Engine
# Detects issues across env, deps, config and outputs a structured
# fix report. Optionally creates a GitHub issue/PR via gh CLI.
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

CREATE_ISSUE="${1:-false}"   # pass 'true' to auto-create GitHub issue
REPORT_FILE="/tmp/healflow-ai-report.md"
ISSUES_FOUND=0

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║     HealFlow — AI DevSecOps Suggestion Engine            ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Init report ───────────────────────────────────────────────────────────────
cat > "$REPORT_FILE" << 'EOF'
# HealFlow AI DevSecOps Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M UTC")
**Pipeline:** CI/CD Security Check
**Severity:** Auto-detected

---

## Issues Detected

EOF

# Replace the date placeholder
sed -i "s/\$(date -u +\"%Y-%m-%d %H:%M UTC\")/$(date -u +'%Y-%m-%d %H:%M UTC')/" "$REPORT_FILE" 2>/dev/null || true

# =============================================================================
# FUNCTION: log_issue
# =============================================================================
log_issue() {
  local SEVERITY="$1"   # critical | high | medium | low | info
  local CATEGORY="$2"
  local PROBLEM="$3"
  local SUGGESTION="$4"
  local FIX_CMD="${5:-}"

  ((ISSUES_FOUND++))

  local ICON
  case "$SEVERITY" in
    critical) ICON="🔴" ;;
    high)     ICON="🟠" ;;
    medium)   ICON="🟡" ;;
    low)      ICON="🟢" ;;
    info)     ICON="🔵" ;;
    *)        ICON="⚪" ;;
  esac

  echo -e "  ${ICON} ${YELLOW}[${SEVERITY^^}]${NC} ${CATEGORY}: ${PROBLEM}"
  echo -e "     ${CYAN}→ Suggestion: ${SUGGESTION}${NC}"
  [[ -n "$FIX_CMD" ]] && echo -e "     ${BLUE}→ Fix: ${FIX_CMD}${NC}"
  echo ""

  # Append to report
  cat >> "$REPORT_FILE" << EOF

### ${ICON} [${SEVERITY^^}] ${CATEGORY}

**Problem:** ${PROBLEM}

**Suggestion:** ${SUGGESTION}

$([ -n "$FIX_CMD" ] && echo "**Fix command:**
\`\`\`bash
${FIX_CMD}
\`\`\`" || true)

---
EOF
}

# =============================================================================
# CHECK 1: Outdated Dependencies
# =============================================================================
echo -e "${BLUE}── Checking for Outdated Dependencies ───────────────────${NC}"

check_outdated() {
  local DIR="$1"
  local LABEL="$2"

  if [[ -f "${DIR}/package.json" ]]; then
    cd "$DIR"
    OUTDATED=$(npm outdated --json 2>/dev/null || echo "{}")
    OUTDATED_COUNT=$(echo "$OUTDATED" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")

    if [[ "$OUTDATED_COUNT" -gt 0 ]]; then
      PACKAGES=$(echo "$OUTDATED" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for k, v in list(d.items())[:5]:
    print(f'  - {k}: {v.get(\"current\",\"?\")} → {v.get(\"latest\",\"?\")}')
" 2>/dev/null || echo "  (could not parse)")

      log_issue "medium" "${LABEL} Dependencies" \
        "${OUTDATED_COUNT} outdated package(s) detected" \
        "Update dependencies to patch security vulnerabilities" \
        "cd ${DIR} && npm update && npm audit fix"
      echo "$PACKAGES"
    else
      echo -e "  ✅ ${GREEN}${LABEL}: All dependencies up to date${NC}"
    fi
    cd - > /dev/null
  fi
}

check_outdated "backend"  "Backend"
check_outdated "frontend" "Frontend"
echo ""

# =============================================================================
# CHECK 2: npm audit — high/critical vulnerabilities
# =============================================================================
echo -e "${BLUE}── Security Vulnerability Scan ──────────────────────────${NC}"

check_audit() {
  local DIR="$1"
  local LABEL="$2"

  if [[ -f "${DIR}/package.json" ]]; then
    cd "$DIR"
    AUDIT=$(npm audit --json 2>/dev/null || echo '{"metadata":{"vulnerabilities":{"high":0,"critical":0}}}')

    CRITICAL=$(echo "$AUDIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('critical',0))" 2>/dev/null || echo "0")
    HIGH=$(echo "$AUDIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('high',0))" 2>/dev/null || echo "0")
    MODERATE=$(echo "$AUDIT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('moderate',0))" 2>/dev/null || echo "0")

    if [[ "$CRITICAL" -gt 0 ]]; then
      log_issue "critical" "${LABEL} Security" \
        "${CRITICAL} CRITICAL vulnerabilities found" \
        "Run npm audit fix immediately. Do not deploy until resolved." \
        "cd ${DIR} && npm audit fix --force"
    elif [[ "$HIGH" -gt 0 ]]; then
      log_issue "high" "${LABEL} Security" \
        "${HIGH} HIGH severity vulnerabilities found" \
        "Run npm audit fix and review breaking changes." \
        "cd ${DIR} && npm audit fix"
    elif [[ "$MODERATE" -gt 0 ]]; then
      log_issue "medium" "${LABEL} Security" \
        "${MODERATE} moderate vulnerabilities found" \
        "Consider updating affected packages." \
        "cd ${DIR} && npm audit fix"
    else
      echo -e "  ✅ ${GREEN}${LABEL}: No known vulnerabilities${NC}"
    fi
    cd - > /dev/null
  fi
}

check_audit "backend"  "Backend"
check_audit "frontend" "Frontend"
echo ""

# =============================================================================
# CHECK 3: Missing .env files
# =============================================================================
echo -e "${BLUE}── Environment File Check ────────────────────────────────${NC}"

if [[ ! -f "backend/.env" ]]; then
  log_issue "high" "Environment" \
    "backend/.env is missing" \
    "Copy .env.example to .env and fill in values before local development" \
    "cp backend/.env.example backend/.env"
else
  echo -e "  ✅ ${GREEN}backend/.env exists${NC}"
fi

if [[ ! -f "frontend/.env.local" ]]; then
  log_issue "low" "Environment" \
    "frontend/.env.local is missing" \
    "Copy .env.example to .env.local for local development" \
    "cp frontend/.env.example frontend/.env.local"
else
  echo -e "  ✅ ${GREEN}frontend/.env.local exists${NC}"
fi
echo ""

# =============================================================================
# CHECK 4: Missing lint/test scripts
# =============================================================================
echo -e "${BLUE}── Package.json Script Check ─────────────────────────────${NC}"

check_scripts() {
  local DIR="$1"
  local LABEL="$2"
  local REQUIRED_SCRIPTS=("${@:3}")

  if [[ -f "${DIR}/package.json" ]]; then
    for SCRIPT in "${REQUIRED_SCRIPTS[@]}"; do
      if ! grep -q "\"${SCRIPT}\"" "${DIR}/package.json"; then
        log_issue "low" "${LABEL} package.json" \
          "Missing '${SCRIPT}' script" \
          "Add a '${SCRIPT}' script to ${DIR}/package.json for CI/CD integration" \
          ""
      else
        echo -e "  ✅ ${GREEN}${LABEL}: '${SCRIPT}' script present${NC}"
      fi
    done
  fi
}

check_scripts "backend"  "Backend"  "start" "dev" "lint" "test"
check_scripts "frontend" "Frontend" "dev"   "build" "lint" "preview"
echo ""

# =============================================================================
# CHECK 5: HIPAA compliance config
# =============================================================================
echo -e "${BLUE}── HIPAA Compliance Signals ──────────────────────────────${NC}"

# Check helmet is in backend dependencies
if [[ -f "backend/package.json" ]]; then
  if grep -q '"helmet"' "backend/package.json"; then
    echo -e "  ✅ ${GREEN}helmet (security headers) is installed${NC}"
  else
    log_issue "high" "HIPAA/Security" \
      "helmet package not found in backend" \
      "Install helmet to set HIPAA-required security headers" \
      "cd backend && npm install helmet"
  fi

  if grep -q '"cors"' "backend/package.json"; then
    echo -e "  ✅ ${GREEN}cors package is installed${NC}"
  else
    log_issue "medium" "HIPAA/Security" \
      "cors package not found" \
      "Install cors and configure allowed origins to restrict API access" \
      "cd backend && npm install cors"
  fi
fi
echo ""

# =============================================================================
# CHECK 6: .gitignore hygiene
# =============================================================================
echo -e "${BLUE}── .gitignore Hygiene ────────────────────────────────────${NC}"

if [[ -f ".gitignore" ]]; then
  MISSING_IGNORES=()
  for PATTERN in ".env" ".env.local" ".env.production" "*.log" "dist/" "node_modules/"; do
    if ! grep -q "$PATTERN" .gitignore; then
      MISSING_IGNORES+=("$PATTERN")
    fi
  done

  if [[ ${#MISSING_IGNORES[@]} -gt 0 ]]; then
    log_issue "high" ".gitignore" \
      "Missing entries: ${MISSING_IGNORES[*]}" \
      "Add these patterns to .gitignore to prevent accidental secret commits" \
      "echo '${MISSING_IGNORES[*]}' | tr ' ' '\n' >> .gitignore"
  else
    echo -e "  ✅ ${GREEN}.gitignore looks healthy${NC}"
  fi
else
  log_issue "critical" ".gitignore" \
    ".gitignore not found" \
    "Create a .gitignore immediately to prevent secrets from being committed" \
    "curl -o .gitignore https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore"
fi
echo ""

# =============================================================================
# FINALIZE REPORT
# =============================================================================
cat >> "$REPORT_FILE" << EOF

## Summary

- **Issues found:** ${ISSUES_FOUND}
- **Generated by:** HealFlow AI DevSecOps Pipeline
- **Timestamp:** $(date -u +'%Y-%m-%d %H:%M UTC')

## Next Steps

1. Address all CRITICAL and HIGH issues before deployment
2. Review MEDIUM issues for the current sprint
3. Track LOW issues as tech debt
4. Re-run pipeline after fixes: \`bash scripts/ai-check.sh\`
EOF

echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  AI Check Complete — ${ISSUES_FOUND} issue(s) detected${NC}"
echo -e "${CYAN}  Report saved to: ${REPORT_FILE}${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo ""

# ── Optionally create GitHub Issue ───────────────────────────────────────────
if [[ "$CREATE_ISSUE" == "true" ]] && command -v gh &>/dev/null; then
  if [[ $ISSUES_FOUND -gt 0 ]]; then
    echo -e "  📋 Creating GitHub issue with report..."
    gh issue create \
      --title "🔐 DevSecOps Report: ${ISSUES_FOUND} issue(s) detected [$(date +%Y-%m-%d)]" \
      --body-file "$REPORT_FILE" \
      --label "security,devsecops,automated" \
      && echo -e "  ✅ ${GREEN}GitHub issue created${NC}" \
      || echo -e "  ⚠️  ${YELLOW}Could not create GitHub issue (check gh auth)${NC}"
  fi
fi

# Output for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "issues_found=${ISSUES_FOUND}" >> "$GITHUB_OUTPUT"
  echo "report_path=${REPORT_FILE}" >> "$GITHUB_OUTPUT"
fi

exit 0