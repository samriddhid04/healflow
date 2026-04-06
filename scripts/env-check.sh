#!/usr/bin/env bash
# =============================================================================
# scripts/env-check.sh
# HealFlow DevSecOps — Environment Validation Script
# Checks .env structure, compares against .env.example, and blocks
# forbidden values (e.g. localhost URLs in production)
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS="✅"
FAIL="❌"
WARN="⚠️ "
INFO="ℹ️ "

# ── Args ──────────────────────────────────────────────────────────────────────
ENV_TARGET="${1:-development}"   # development | staging | production
ERRORS=0
WARNINGS=0

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     HealFlow — Environment Validation Check              ║${NC}"
echo -e "${CYAN}║     Target: ${ENV_TARGET}$(printf '%*s' $((42 - ${#ENV_TARGET})) '')║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# FUNCTION: check_env_file
# Args: $1 = directory, $2 = env file name, $3 = example file name
# =============================================================================
check_env_file() {
  local DIR="$1"
  local ENV_FILE="$2"
  local EXAMPLE_FILE="$3"
  local LABEL="$4"

  echo -e "${BLUE}── ${LABEL} ──────────────────────────────────────────${NC}"

  # 1. Check example file exists
  if [[ ! -f "${DIR}/${EXAMPLE_FILE}" ]]; then
    echo -e "  ${FAIL} ${RED}Missing ${EXAMPLE_FILE} in ${DIR}/${NC}"
    ((ERRORS++))
    return
  fi
  echo -e "  ${PASS} ${EXAMPLE_FILE} found"

  # 2. Check .env file exists (warn in dev, fail in prod)
  if [[ ! -f "${DIR}/${ENV_FILE}" ]]; then
    if [[ "${ENV_TARGET}" == "production" ]]; then
      echo -e "  ${FAIL} ${RED}${ENV_FILE} is MISSING — required for production${NC}"
      ((ERRORS++))
    else
      echo -e "  ${WARN} ${YELLOW}${ENV_FILE} not found — using defaults (OK for CI)${NC}"
      ((WARNINGS++))
    fi
    return
  fi
  echo -e "  ${PASS} ${ENV_FILE} found"

  # 3. Compare keys: every key in .example must exist in .env
  echo -e "  ${INFO} Checking required keys..."
  local MISSING_KEYS=0
  while IFS= read -r line; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    KEY=$(echo "$line" | cut -d'=' -f1 | xargs)
    [[ -z "$KEY" ]] && continue

    if ! grep -q "^${KEY}=" "${DIR}/${ENV_FILE}" 2>/dev/null; then
      echo -e "    ${FAIL} ${RED}Missing key: ${KEY}${NC}"
      ((MISSING_KEYS++))
      ((ERRORS++))
    fi
  done < "${DIR}/${EXAMPLE_FILE}"

  if [[ $MISSING_KEYS -eq 0 ]]; then
    echo -e "  ${PASS} All required keys present"
  fi

  # 4. Check for empty required values
  echo -e "  ${INFO} Checking for empty values..."
  local EMPTY_VALS=0
  while IFS= read -r line; do
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
    KEY=$(echo "$line" | cut -d'=' -f1 | xargs)
    VAL=$(echo "$line" | cut -d'=' -f2- | xargs)
    [[ -z "$KEY" ]] && continue

    if [[ -z "$VAL" ]]; then
      echo -e "    ${WARN} ${YELLOW}Empty value for: ${KEY}${NC}"
      ((EMPTY_VALS++))
      ((WARNINGS++))
    fi
  done < "${DIR}/${ENV_FILE}"

  if [[ $EMPTY_VALS -eq 0 ]]; then
    echo -e "  ${PASS} No empty values detected"
  fi

  # 5. Forbidden values in production
  if [[ "${ENV_TARGET}" == "production" || "${ENV_TARGET}" == "staging" ]]; then
    echo -e "  ${INFO} Checking for forbidden production values..."
    local FORBIDDEN=0

    FORBIDDEN_PATTERNS=(
      "localhost"
      "127.0.0.1"
      "0.0.0.0"
      "change-in-production"
      "your-super-secret"
      "your-32-byte"
      "your-db-password"
      "your-sentry-dsn"
      "example.com"
      "changeme"
      "password123"
      "secret123"
      "development"
    )

    while IFS= read -r line; do
      [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
      KEY=$(echo "$line" | cut -d'=' -f1 | xargs)
      VAL=$(echo "$line" | cut -d'=' -f2- | xargs)
      [[ -z "$KEY" || -z "$VAL" ]] && continue

      for PATTERN in "${FORBIDDEN_PATTERNS[@]}"; do
        if echo "$VAL" | grep -qi "$PATTERN"; then
          echo -e "    ${FAIL} ${RED}FORBIDDEN: ${KEY} contains '${PATTERN}' — not allowed in ${ENV_TARGET}${NC}"
          ((FORBIDDEN++))
          ((ERRORS++))
        fi
      done
    done < "${DIR}/${ENV_FILE}"

    if [[ $FORBIDDEN -eq 0 ]]; then
      echo -e "  ${PASS} No forbidden values in ${ENV_TARGET} env"
    fi

    # 6. Secret strength check (production only)
    if [[ "${ENV_TARGET}" == "production" ]]; then
      echo -e "  ${INFO} Checking secret strength..."
      local WEAK_SECRETS=0

      SECRET_KEYS=("JWT_SECRET" "PHI_ENCRYPTION_KEY" "DB_PASSWORD")
      for SECRET_KEY in "${SECRET_KEYS[@]}"; do
        SECRET_VAL=$(grep "^${SECRET_KEY}=" "${DIR}/${ENV_FILE}" 2>/dev/null | cut -d'=' -f2- | xargs || true)
        if [[ -n "$SECRET_VAL" && ${#SECRET_VAL} -lt 32 ]]; then
          echo -e "    ${FAIL} ${RED}WEAK SECRET: ${SECRET_KEY} is only ${#SECRET_VAL} chars (min: 32)${NC}"
          ((WEAK_SECRETS++))
          ((ERRORS++))
        fi
      done

      if [[ $WEAK_SECRETS -eq 0 ]]; then
        echo -e "  ${PASS} All secrets meet minimum length requirements"
      fi
    fi
  fi

  # 7. Check NODE_ENV matches target
  if grep -q "^NODE_ENV=" "${DIR}/${ENV_FILE}" 2>/dev/null; then
    ACTUAL_ENV=$(grep "^NODE_ENV=" "${DIR}/${ENV_FILE}" | cut -d'=' -f2 | xargs)
    if [[ "${ENV_TARGET}" == "production" && "${ACTUAL_ENV}" != "production" ]]; then
      echo -e "  ${FAIL} ${RED}NODE_ENV=${ACTUAL_ENV} but deploying to production${NC}"
      ((ERRORS++))
    else
      echo -e "  ${PASS} NODE_ENV=${ACTUAL_ENV} matches target"
    fi
  fi

  echo ""
}

# =============================================================================
# FUNCTION: check_gitignore
# =============================================================================
check_gitignore() {
  echo -e "${BLUE}── .gitignore Validation ─────────────────────────────────${NC}"

  local REQUIRED_IGNORES=(
    ".env"
    ".env.local"
    ".env.production"
    ".env.staging"
    "node_modules"
    "dist"
    "*.log"
  )

  if [[ ! -f ".gitignore" ]]; then
    echo -e "  ${FAIL} ${RED}.gitignore not found in repo root${NC}"
    ((ERRORS++))
    return
  fi

  local MISSING=0
  for PATTERN in "${REQUIRED_IGNORES[@]}"; do
    if ! grep -q "$PATTERN" .gitignore; then
      echo -e "  ${WARN} ${YELLOW}.gitignore missing: ${PATTERN}${NC}"
      ((MISSING++))
      ((WARNINGS++))
    fi
  done

  if [[ $MISSING -eq 0 ]]; then
    echo -e "  ${PASS} All critical patterns present in .gitignore"
  fi

  # Check no .env files are tracked
  if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "  ${FAIL} ${RED}CRITICAL: .env is tracked by git! Remove it immediately.${NC}"
    ((ERRORS++))
  elif git ls-files --error-unmatch backend/.env 2>/dev/null; then
    echo -e "  ${FAIL} ${RED}CRITICAL: backend/.env is tracked by git!${NC}"
    ((ERRORS++))
  elif git ls-files --error-unmatch frontend/.env.local 2>/dev/null; then
    echo -e "  ${FAIL} ${RED}CRITICAL: frontend/.env.local is tracked by git!${NC}"
    ((ERRORS++))
  else
    echo -e "  ${PASS} No .env files are git-tracked"
  fi

  echo ""
}

# =============================================================================
# FUNCTION: check_sensitive_patterns
# Scans source code for accidentally committed secrets / PHI
# =============================================================================
check_sensitive_patterns() {
  echo -e "${BLUE}── PHI & Secret Pattern Scan ─────────────────────────────${NC}"

  local FOUND=0

  # Patterns that should NEVER appear in source code
  SENSITIVE_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{4,}"
    "secret\s*=\s*['\"][^'\"]{8,}"
    "api_key\s*=\s*['\"][^'\"]{8,}"
    "BEGIN RSA PRIVATE KEY"
    "BEGIN OPENSSH PRIVATE KEY"
    "-----BEGIN CERTIFICATE-----"
    "Authorization: Bearer [A-Za-z0-9]"
    "ssn\s*[=:]\s*[0-9]{3}-[0-9]{2}"
    "dob\s*[=:]\s*['\"][0-9]{4}"
    "credit.card\s*[=:]\s*[0-9]{4}"
  )

  for PATTERN in "${SENSITIVE_PATTERNS[@]}"; do
    MATCHES=$(grep -rniE "$PATTERN" \
      --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
      . 2>/dev/null || true)

    if [[ -n "$MATCHES" ]]; then
      echo -e "  ${FAIL} ${RED}Potential secret/PHI found matching: ${PATTERN}${NC}"
      echo "$MATCHES" | head -3 | while read -r m; do
        echo -e "      ${RED}→ $m${NC}"
      done
      ((FOUND++))
      ((ERRORS++))
    fi
  done

  if [[ $FOUND -eq 0 ]]; then
    echo -e "  ${PASS} No sensitive patterns detected in source code"
  fi

  echo ""
}

# =============================================================================
# RUN ALL CHECKS
# =============================================================================
check_env_file "backend"  ".env"       ".env.example"  "Backend Environment"
check_env_file "frontend" ".env.local" ".env.example"  "Frontend Environment"
check_gitignore
check_sensitive_patterns

# =============================================================================
# SUMMARY
# =============================================================================
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Environment Check Summary${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════${NC}"

if [[ $ERRORS -gt 0 ]]; then
  echo -e "  ${FAIL} ${RED}FAILED — ${ERRORS} error(s), ${WARNINGS} warning(s)${NC}"
  echo -e "  ${RED}Pipeline will be blocked.${NC}"
  echo ""
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "  ${WARN} ${YELLOW}PASSED WITH WARNINGS — 0 errors, ${WARNINGS} warning(s)${NC}"
  echo -e "  ${YELLOW}Review warnings before deploying to production.${NC}"
  echo ""
  exit 0
else
  echo -e "  ${PASS} ${GREEN}ALL CHECKS PASSED — 0 errors, 0 warnings${NC}"
  echo ""
  exit 0
fi