#!/bin/bash
# PreToolUse/Write|Edit — data/*.json 백업 리마인더 (비차단)
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if echo "$FILE_PATH" | grep -qE '/data/[^/]+\.json$'; then
  FILENAME=$(basename "$FILE_PATH")
  echo "{\"additionalContext\": \"[DATA GUARD] ${FILENAME}은 에이전트/프로젝트 레지스트리 파일입니다. 수정 전 server/backup.ts의 createBackup() 유틸리티로 백업을 생성하세요.\"}"
fi
exit 0
