#!/bin/bash
# PostToolUse/Write|Edit — API-UI 계약 리마인더
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -qE '/server/routes/'; then
  ROUTE_NAME=$(basename "$FILE_PATH" .ts)
  echo "{\"additionalContext\": \"[API-UI] server/routes/${ROUTE_NAME}.ts를 수정했습니다. API 응답 구조가 변경되었다면 src/types/의 대응 인터페이스도 업데이트하세요.\"}"
elif echo "$FILE_PATH" | grep -qE '/src/types/'; then
  TYPE_NAME=$(basename "$FILE_PATH" .ts)
  echo "{\"additionalContext\": \"[API-UI] src/types/${TYPE_NAME}.ts를 수정했습니다. 타입이 변경되었다면 server/routes/의 대응 API 핸들러도 확인하세요.\"}"
fi
exit 0
