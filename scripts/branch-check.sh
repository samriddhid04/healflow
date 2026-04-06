#!/usr/bin/env bash
# =============================================================================
# scripts/branch-check.sh
# HealFlow DevSecOps — Branch Policy Enforcement
# Only allows main, dev, release/*, hotfix/*, feature/* branches
# Blocks all other branches from triggering deployments
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BRANCH="${1:-${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')}}"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     HealFlow — Branch Policy Check                       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Branch detected: ${YELLOW}${BRANCH}${NC}"
echo ""

# ── Allowed branch patterns ───────────────────────────────────────────────────
ALLOWED_PATTERNS=(
  "^main$"
  "^dev$"
  "^develop$"
  "^release/[a-zA-Z0-9._-]+$"
  "^hotfix/[a-zA-Z0-9._-]+$"
  "^feature/[a-zA-Z0-9._-]+$"
  "^fix/[a-zA-Z0-9._-]+$"
  "^chore/[a-zA-Z0-9._-]+$"
  "^ci/[a-zA-Z0-9._-]+$"
)

# ── Deployment-allowed branches (only these trigger deploy) ───────────────────
DEPLOY_BRANCHES=(
  "^main$"
  "^release/[a-zA-Z0-9._-]+$"
)

# ── Check if branch is allowed ────────────────────────────────────────────────
IS_ALLOWED=false
for PATTERN in "${ALLOWED_PATTERNS[@]}"; do
  if echo "$BRANCH" | grep -qE "$PATTERN"; then
    IS_ALLOWED=true
    break
  fi
done

# ── Check if branch can deploy ────────────────────────────────────────────────
CAN_DEPLOY=false
for PATTERN in "${DEPLOY_BRANCHES[@]}"; do
  if echo "$BRANCH" | grep -qE "$PATTERN"; then
    CAN_DEPLOY=true
    break
  fi
done

# ── Validate branch name characters ──────────────────────────────────────────
if echo "$BRANCH" | grep -qE '[^a-zA-Z0-9/_.-]'; then
  echo -e "  ❌ ${RED}BLOCKED: Branch name contains invalid characters${NC}"
  echo -e "  ${RED}Only alphanumeric, /, _, ., - are allowed${NC}"
  echo ""
  exit 1
fi

# ── Enforce max branch name length ────────────────────────────────────────────
if [[ ${#BRANCH} -gt 80 ]]; then
  echo -e "  ❌ ${RED}BLOCKED: Branch name too long (${#BRANCH} chars, max 80)${NC}"
  echo ""
  exit 1
fi

# ── Output result ─────────────────────────────────────────────────────────────
if [[ "$IS_ALLOWED" == "false" ]]; then
  echo -e "  ❌ ${RED}BLOCKED: '${BRANCH}' does not match any allowed pattern${NC}"
  echo ""
  echo -e "  ${YELLOW}Allowed patterns:${NC}"
  echo -e "    main, dev, develop"
  echo -e "    feature/<name>"
  echo -e "    fix/<name>"
  echo -e "    release/<version>"
  echo -e "    hotfix/<name>"
  echo -e "    chore/<name>"
  echo -e "    ci/<name>"
  echo ""
  echo -e "  ${RED}Random branches (e.g. 'test123', 'my-branch') are not allowed.${NC}"
  echo ""
  exit 1
fi

echo -e "  ✅ ${GREEN}Branch '${BRANCH}' is ALLOWED${NC}"

if [[ "$CAN_DEPLOY" == "true" ]]; then
  echo -e "  🚀 ${GREEN}This branch is DEPLOYMENT-ELIGIBLE${NC}"
  # Set GitHub Actions output if running in CI
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "can_deploy=true" >> "$GITHUB_OUTPUT"
    echo "branch_name=${BRANCH}" >> "$GITHUB_OUTPUT"
  fi
else
  echo -e "  ⏸  ${YELLOW}This branch will run CI checks but will NOT trigger deployment${NC}"
  echo -e "  ${YELLOW}Only 'main' and 'release/*' branches can deploy${NC}"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "can_deploy=false" >> "$GITHUB_OUTPUT"
    echo "branch_name=${BRANCH}" >> "$GITHUB_OUTPUT"
  fi
fi

echo ""
exit 0