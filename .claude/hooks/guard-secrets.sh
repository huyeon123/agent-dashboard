#!/bin/bash
# PreToolUse/Write|Edit — 시크릿 패턴 차단
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# .env 파일 보호
if echo "$FILE_PATH" | grep -qE '\.env($|\.)'; then
  echo "BLOCKED: .env 파일은 직접 수정하지 마세요. 사용자에게 안내하세요." >&2; exit 2
fi

# 시크릿 패턴 검사
if echo "$CONTENT" | grep -qE 'sk-ant-|sk-proj-|AKIA[A-Z0-9]{16}|AIza[0-9A-Za-z_-]{35}'; then
  echo "BLOCKED: API 키가 하드코딩되어 있습니다. 환경변수를 사용하세요." >&2; exit 2
fi
if echo "$CONTENT" | grep -qE 'Bearer\s+ey[A-Za-z0-9]'; then
  echo "BLOCKED: JWT 토큰이 하드코딩되어 있습니다." >&2; exit 2
fi
if echo "$CONTENT" | grep -qE '\-\-\-\-\-BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY\-\-\-\-\-'; then
  echo "BLOCKED: 프라이빗 키가 포함되어 있습니다." >&2; exit 2
fi
exit 0
