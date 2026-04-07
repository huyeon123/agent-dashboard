#!/bin/bash
# Notification — macOS 데스크톱 알림
osascript -e 'display notification "Claude Code가 입력을 기다리고 있습니다" with title "Claude Code" sound name "Glass"' 2>/dev/null
exit 0
