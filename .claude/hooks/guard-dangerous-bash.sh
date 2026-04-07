#!/bin/bash
# PreToolUse/Bash — 위험 명령 차단
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if echo "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|--force\s+)*(\/|\.\.|\.\/|~)'; then
  echo "BLOCKED: 위험한 rm 명령. 삭제 대상을 구체적으로 지정하세요." >&2; exit 2
fi
if echo "$CMD" | grep -qiE 'git\s+push\s+.*--force|git\s+push\s+-f'; then
  echo "BLOCKED: force push는 금지됩니다. --force-with-lease를 사용하세요." >&2; exit 2
fi
if echo "$CMD" | grep -qiE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard는 위험합니다. 먼저 stash를 고려하세요." >&2; exit 2
fi
if echo "$CMD" | grep -qiE 'npm\s+publish|yarn\s+publish'; then
  echo "BLOCKED: 패키지 퍼블리시는 수동으로 수행하세요." >&2; exit 2
fi
if echo "$CMD" | grep -qiE '(DROP|TRUNCATE)\s+(TABLE|DATABASE)'; then
  echo "BLOCKED: 위험한 SQL 명령입니다." >&2; exit 2
fi
exit 0
