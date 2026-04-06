#!/usr/bin/env bash
# =============================================================================
# scripts/env-check.sh
# HealFlow DevSecOps — Environment Validation
# CI-aware: skips .env file requirement when running in GitHub Actions
# Uses only bash builtins — no python3, no jq dependency
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Config ────────────────────────────────────────────────────────────────────
ENV_TARGET="${1:-development}"

# Detect CI environment automatically
IS_CI=false
if [[ -n "${CI:-}" || -n "${GITHUB_ACTIONS:-}" ]]; then
  IS_CI=true
fi

ERRORS=0
WARNINGS=0

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  HealFlow — Environment Validation${NC}"
echo -e "${CYAN}  Target  : ${ENV_TARGET}${NC}"
echo -e "${CYAN}  CI Mode : ${IS_CI}${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

# =============================================================================
# check_example_exists — ensures .env.example is present and has required keys
# =============================================================================
check_example_exists() {
  local DIR="$1"
  local EXAMPLE="$2"
  local LABEL="$3"
  shift 3
  local REQUIRED_KEYS=("$@")

  echo -e "${BLUE}-- ${LABEL} .env.example --${NC}"

  if [[ ! -f "${DIR}/${EXAMPLE}" ]]; then
    echo -e "  ${RED}[FAIL] ${DIR}/${EXAMPLE} not found${NC}"
    echo -e "  ${YELLOW}Create it: cp ${DIR}/.env.example.template ${DIR}/${EXAMPLE}${NC}"
    ((ERRORS++))
    return 1
  fi
  echo -e "  ${GREEN}[PASS] ${DIR}/${EXAMPLE} exists${NC}"

  # Check each required key exists in the example file
  local MISSING=0
  for KEY in "${REQUIRED_KEYS[@]}"; do
    if ! grep -q "^${KEY}=" "${DIR}/${EXAMPLE}" 2>/dev/null; then
      echo -e "  ${RED}[FAIL] Missing required key in example: ${KEY}${NC}"
      ((MISSING++))
      ((ERRORS++))
    fi
  done

  if [[ $MISSING -eq 0 ]]; then
    echo -e "  ${GREEN}[PASS] All required keys present in ${EXAMPLE}${NC}"
  fi

  echo ""
  return 0
}

# =============================================================================
# check_env_file — validates actual .env file
# In CI: skips if file missing (CI uses GitHub Secrets instead)
# In local: warns if missing
# =============================================================================
check_env_file() {
  local DIR="$1"
  local ENV_FILE="$2"
  local EXAMPLE_FILE="$3"
  local LABEL="$4"

  echo -e "${BLUE}-- ${LABEL} .env file --${NC}"

  # .env missing handling
  if [[ ! -f "${DIR}/${ENV_FILE}" ]]; then
    if [[ "$IS_CI" == "true" ]]; then
      # In CI, .env files are intentionally absent (secrets come from GitHub Secrets)
      echo -e "  ${YELLOW}[SKIP] ${DIR}/${ENV_FILE} not found — CI mode, using GitHub Secrets${NC}"
      echo ""
      return 0
    elif [[ "${ENV_TARGET}" == "production" ]]; then
      echo -e "  ${RED}[FAIL] ${DIR}/${ENV_FILE} missing — required for production${NC}"
      ((ERRORS++))
    else
      echo -e "  ${YELLOW}[WARN] ${DIR}/${ENV_FILE} not found — copy from ${EXAMPLE_FILE}${NC}"
      ((WARNINGS++))
    fi
    echo ""
    return 0
  fi

  echo -e "  ${GREEN}[PASS] ${DIR}/${ENV_FILE} found${NC}"

  # Check all keys from example exist in .env
  if [[ -f "${DIR}/${EXAMPLE_FILE}" ]]; then
    local MISSING=0
    while IFS= read -r line; do
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      KEY=$(echo "$line" | cut -d'=' -f1 | tr -d ' ')
      [[ -z "$KEY" ]] && continue

      if ! grep -q "^${KEY}=" "${DIR}/${ENV_FILE}" 2>/dev/null; then
        echo -e "  ${YELLOW}[WARN] Key missing in .env: ${KEY}${NC}"
        ((MISSING++))
        ((WARNINGS++))
      fi
    done < "${DIR}/${EXAMPLE_FILE}"

    if [[ $MISSING -eq 0 ]]; then
      echo -e "  ${GREEN}[PASS] All keys from ${EXAMPLE_FILE} present in .env${NC}"
    fi
  fi

  # Forbidden values — only enforce for production/staging
  if [[ "${ENV_TARGET}" == "production" || "${ENV_TARGET}" == "staging" ]]; then
    echo -e "  Checking for forbidden production values..."
    local FORBIDDEN_FOUND=0
    local FORBIDDEN_PATTERNS=("localhost" "127.0.0.1" "change-in-production"
      "your-super-secret" "your-32-byte" "your-db-password"
      "changeme" "password123" "secret123")

    while IFS= read -r line; do
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      KEY=$(echo "$line" | cut -d'=' -f1 | tr -d ' ')
      VAL=$(echo "$line" | cut -d'=' -f2-)
      [[ -z "$KEY" || -z "$VAL" ]] && continue

      for PATTERN in "${FORBIDDEN_PATTERNS[@]}"; do
        if echo "$VAL" | grep -qi "$PATTERN"; then
          echo -e "  ${RED}[FAIL] FORBIDDEN in ${ENV_TARGET}: ${KEY} contains '${PATTERN}'${NC}"
          ((FORBIDDEN_FOUND++))
          ((ERRORS++))
        fi
      done
    done < "${DIR}/${ENV_FILE}"

    if [[ $FORBIDDEN_FOUND -eq 0 ]]; then
      echo -e "  ${GREEN}[PASS] No forbidden values for ${ENV_TARGET}${NC}"
    fi
  fi

  echo ""
}

# =============================================================================
# check_gitignore
# =============================================================================
check_gitignore() {
  echo -e "${BLUE}-- .gitignore Check --${NC}"

  local REQUIRED=(
    "\.env$"
    "\.env\.local"
    "node_modules"
    "dist"
  )

  if [[ ! -f ".gitignore" ]]; then
    echo -e "  ${RED}[FAIL] .gitignore not found${NC}"
    ((ERRORS++))
    echo ""
    return
  fi

  local MISSING=0
  for PATTERN in "${REQUIRED[@]}"; do
    if ! grep -qE "$PATTERN" .gitignore; then
      echo -e "  ${YELLOW}[WARN] .gitignore may be missing: ${PATTERN}${NC}"
      ((MISSING++))
      ((WARNINGS++))
    fi
  done

  if [[ $MISSING -eq 0 ]]; then
    echo -e "  ${GREEN}[PASS] .gitignore looks good${NC}"
  fi

  # Check .env is not git-tracked (skip if not a git repo)
  if git rev-parse --git-dir > /dev/null 2>&1; then
    if git ls-files --error-unmatch backend/.env > /dev/null 2>&1; then
      echo -e "  ${RED}[FAIL] CRITICAL: backend/.env is git-tracked — remove it!${NC}"
      ((ERRORS++))
    else
      echo -e "  ${GREEN}[PASS] .env files not git-tracked${NC}"
    fi
  fi

  echo ""
}

# =============================================================================
# check_secret_scan — scan source for accidentally committed secrets
# =============================================================================
check_secret_scan() {
  echo -e "${BLUE}-- Secret / PHI Pattern Scan --${NC}"

  local FOUND=0
  local PATTERNS=(
    "BEGIN RSA PRIVATE KEY"
    "BEGIN OPENSSH PRIVATE KEY"
    "AKIA[0-9A-Z]{16}"
  )

  for PATTERN in "${PATTERNS[@]}"; do
    MATCHES=$(grep -rniE "$PATTERN" \
      --include="*.js" --include="*.jsx" \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
      . 2>/dev/null || true)

    if [[ -n "$MATCHES" ]]; then
      echo -e "  ${RED}[FAIL] Pattern found: ${PATTERN}${NC}"
      echo "$MATCHES" | head -2
      ((FOUND++))
      ((ERRORS++))
    fi
  done

  if [[ $FOUND -eq 0 ]]; then
    echo -e "  ${GREEN}[PASS] No secret patterns in source code${NC}"
  fi

  echo ""
}

# =============================================================================
# RUN ALL CHECKS
# =============================================================================

# 1. Verify .env.example files have required keys
check_example_exists "backend" ".env.example" "Backend" \
  "NODE_ENV" "PORT" "JWT_SECRET" "HIPAA_MODE" "ALLOWED_ORIGINS" \
  "JWT_EXPIRES_IN" "PHI_ENCRYPTION_KEY"

check_example_exists "frontend" ".env.example" "Frontend" \
  "VITE_API_URL" "VITE_APP_NAME" "VITE_APP_ENV"

# 2. Validate actual .env files (skipped silently in CI)
check_env_file "backend"  ".env"       ".env.example"  "Backend"
check_env_file "frontend" ".env.local" ".env.example"  "Frontend"

# 3. .gitignore hygiene
check_gitignore

# 4. Secret scan
check_secret_scan

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  Summary — ENV_TARGET=${ENV_TARGET} | CI=${IS_CI}${NC}"
echo -e "${CYAN}============================================================${NC}"

if [[ $ERRORS -gt 0 ]]; then
  echo -e "  ${RED}[FAILED] ${ERRORS} error(s), ${WARNINGS} warning(s)${NC}"
  echo -e "  ${RED}Fix errors before proceeding.${NC}"
  echo ""
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "  ${YELLOW}[PASSED WITH WARNINGS] 0 errors, ${WARNINGS} warning(s)${NC}"
  echo ""
  exit 0
else
  echo -e "  ${GREEN}[ALL PASSED] 0 errors, 0 warnings${NC}"
  echo ""
  exit 0
fi