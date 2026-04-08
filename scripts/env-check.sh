#!/bin/bash
# =============================================================
# scripts/env-check.sh
# HealFlow DevSecOps - Environment Validation
# Uses bash (not sh) - called with 'bash scripts/env-check.sh'
# CI-aware: skips missing .env files in GitHub Actions
# =============================================================

set -euo pipefail

ENV_TARGET="${1:-development}"
ERRORS=0
WARNINGS=0

# Detect CI
IS_CI=false
if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  IS_CI=true
fi

echo ""
echo "============================================================"
echo "  HealFlow - Environment Validation"
echo "  Target  : ${ENV_TARGET}"
echo "  CI Mode : ${IS_CI}"
echo "============================================================"
echo ""

# =============================================================
# check_example_keys
# Verifies all required keys exist in .env.example
# =============================================================
check_example_keys() {
  local DIR="$1"
  local EXAMPLE="${DIR}/.env.example"

  echo "-- ${DIR}/.env.example --"

  if [ ! -f "$EXAMPLE" ]; then
    echo "  [FAIL] ${EXAMPLE} not found"
    ERRORS=$((ERRORS + 1))
    echo ""
    return
  fi

  echo "  [PASS] ${EXAMPLE} exists"

  # Parse only KEY=value lines (skip blank lines and comments)
  while IFS='=' read -r KEY REST; do
    # Skip empty lines
    [ -z "$KEY" ] && continue
    # Skip comment lines (start with #)
    case "$KEY" in
      \#*) continue ;;
    esac
    # Strip any leading/trailing spaces
    KEY=$(echo "$KEY" | tr -d ' \t\r')
    [ -z "$KEY" ] && continue
    echo "  [PASS] Key present: ${KEY}"
  done < "$EXAMPLE"

  echo ""
}

# =============================================================
# check_env_file
# In CI: skip if .env missing (GitHub Secrets used instead)
# Locally: warn if .env missing
# =============================================================
check_env_file() {
  local DIR="$1"
  local ENV_FILE="$2"
  local FULL_PATH="${DIR}/${ENV_FILE}"

  echo "-- ${FULL_PATH} --"

  if [ ! -f "$FULL_PATH" ]; then
    if [ "$IS_CI" = "true" ]; then
      echo "  [SKIP] Not found - CI mode uses GitHub Secrets (expected)"
      echo ""
      return
    elif [ "$ENV_TARGET" = "production" ]; then
      echo "  [FAIL] ${FULL_PATH} missing - required for production"
      ERRORS=$((ERRORS + 1))
    else
      echo "  [WARN] ${FULL_PATH} not found - copy from .env.example"
      WARNINGS=$((WARNINGS + 1))
    fi
    echo ""
    return
  fi

  echo "  [PASS] ${FULL_PATH} found"
  echo ""
}

# =============================================================
# check_gitignore
# =============================================================
check_gitignore() {
  echo "-- .gitignore --"

  if [ ! -f ".gitignore" ]; then
    echo "  [FAIL] .gitignore not found"
    ERRORS=$((ERRORS + 1))
    echo ""
    return
  fi

  for PATTERN in ".env" ".env.local" "node_modules" "dist"; do
    if grep -q "$PATTERN" .gitignore 2>/dev/null; then
      echo "  [PASS] .gitignore covers: ${PATTERN}"
    else
      echo "  [WARN] .gitignore may be missing: ${PATTERN}"
      WARNINGS=$((WARNINGS + 1))
    fi
  done

  # Check .env not tracked by git
  if git rev-parse --git-dir > /dev/null 2>&1; then
    if git ls-files --error-unmatch backend/.env > /dev/null 2>&1; then
      echo "  [FAIL] CRITICAL: backend/.env is git-tracked - remove immediately"
      ERRORS=$((ERRORS + 1))
    else
      echo "  [PASS] .env files not git-tracked"
    fi
  fi

  echo ""
}

# =============================================================
# check_secret_scan
# =============================================================
check_secret_scan() {
  echo "-- Secret Scan --"

  FOUND=0
  for PATTERN in "BEGIN RSA PRIVATE KEY" "BEGIN OPENSSH PRIVATE KEY"; do
    MATCHES=$(grep -rnF "$PATTERN" \
      --include="*.js" --include="*.jsx" \
      --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
      . 2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
      echo "  [FAIL] Secret pattern found: ${PATTERN}"
      ERRORS=$((ERRORS + 1))
      FOUND=$((FOUND + 1))
    fi
  done

  if [ "$FOUND" -eq 0 ]; then
    echo "  [PASS] No secret patterns in source code"
  fi

  echo ""
}

# =============================================================
# RUN ALL CHECKS
# =============================================================
check_example_keys "backend"
check_example_keys "frontend"
check_env_file "backend"  ".env"
check_env_file "frontend" ".env.local"
check_gitignore
check_secret_scan

# =============================================================
# SUMMARY
# =============================================================
echo "============================================================"
echo "  Summary - Target=${ENV_TARGET} | CI=${IS_CI}"
echo "  Errors  : ${ERRORS}"
echo "  Warnings: ${WARNINGS}"
echo "============================================================"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  echo "  [FAILED] ${ERRORS} error(s) found - fix before proceeding"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo "  [PASSED WITH WARNINGS] ${WARNINGS} warning(s)"
  exit 0
else
  echo "  [ALL PASSED]"
  exit 0
fi