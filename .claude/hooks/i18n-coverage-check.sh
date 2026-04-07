#!/bin/bash
# PostToolUse/Write|Edit — i18n 키 커버리지 검사
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"

# i18n 파일 편집 시: ko/en 키 비교
if echo "$FILE_PATH" | grep -qE '/i18n/(ko|en)\.json$'; then
  KO="$PROJECT_DIR/src/i18n/ko.json"
  EN="$PROJECT_DIR/src/i18n/en.json"

  if [ -f "$KO" ] && [ -f "$EN" ]; then
    KO_KEYS=$(jq -r '[paths(scalars)] | map(join(".")) | sort[]' "$KO" 2>/dev/null) || exit 0
    EN_KEYS=$(jq -r '[paths(scalars)] | map(join(".")) | sort[]' "$EN" 2>/dev/null) || exit 0

    MISSING_EN=$(comm -23 <(echo "$KO_KEYS") <(echo "$EN_KEYS"))
    MISSING_KO=$(comm -13 <(echo "$KO_KEYS") <(echo "$EN_KEYS"))

    MSG=""
    if [ -n "$MISSING_EN" ]; then
      KEYS=$(echo "$MISSING_EN" | head -10 | tr '\n' ', ' | sed 's/,$//')
      MSG="en.json에 누락된 키: ${KEYS}"
    fi
    if [ -n "$MISSING_KO" ]; then
      KEYS=$(echo "$MISSING_KO" | head -10 | tr '\n' ', ' | sed 's/,$//')
      if [ -n "$MSG" ]; then
        MSG="$MSG | "
      fi
      MSG="${MSG}ko.json에 누락된 키: ${KEYS}"
    fi

    if [ -n "$MSG" ]; then
      echo "{\"additionalContext\": \"[i18n] ${MSG}\"}"
    fi
  fi
  exit 0
fi

# 피처 컴포넌트 편집 시: t() 리마인더
if echo "$FILE_PATH" | grep -qE '/src/features/.*\.(tsx|ts)$'; then
  echo "{\"additionalContext\": \"[i18n] 새 UI 텍스트 추가 시 하드코딩하지 말고 src/i18n/ko.json, en.json 양쪽에 번역 키를 추가하세요.\"}"
fi
exit 0
