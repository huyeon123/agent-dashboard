#!/bin/bash
# PostToolUse/Write|Edit — .ts/.tsx 파일 eslint --fix
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# .ts/.tsx 파일만 대상
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  exit 0
fi

# 파일 존재 확인
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# 프로젝트 루트에서 eslint 실행
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
RESULT=$(cd "$PROJECT_DIR" && npx eslint --fix "$FILE_PATH" 2>&1) || true
ERRORS=$(echo "$RESULT" | grep -cE "[0-9]+ error" || true)

if [ "$ERRORS" -gt 0 ]; then
  # JSON 안전하게 이스케이프
  ESCAPED=$(echo "$RESULT" | head -20 | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  echo "{\"additionalContext\": \"[LINT] eslint 에러 발견: ${ESCAPED}\"}"
fi
exit 0
