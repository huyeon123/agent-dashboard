#!/bin/bash

# Agent Dashboard Launcher
# 이 파일을 더블클릭하면 Agent Dashboard가 브라우저에서 실행됩니다.

# 심볼릭 링크 해석 (macOS는 readlink -f 미지원)
SCRIPT_PATH="$0"
while [ -L "$SCRIPT_PATH" ]; do
  SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
done
PROJECT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"

cd "$PROJECT_DIR" || { echo "오류: 프로젝트 디렉토리를 찾을 수 없습니다: $PROJECT_DIR"; exit 1; }

PORT=51730
URL="http://127.0.0.1:$PORT"

# 이미 실행 중인지 확인
if curl -s --connect-timeout 1 "$URL" > /dev/null 2>&1; then
  echo "이미 실행 중입니다. 브라우저를 열고 있습니다..."
  open "$URL"
  sleep 1
  exit 0
fi

# 빌드 파일 확인
if [ ! -f "dist-standalone/server.cjs" ]; then
  echo "오류: 빌드가 필요합니다."
  echo ""
  echo "터미널에서 아래 명령어를 실행하세요:"
  echo "  cd $PROJECT_DIR"
  echo "  npm run build:web"
  echo ""
  read -p "엔터를 눌러 닫으세요..."
  exit 1
fi

if [ ! -f "dist/index.html" ]; then
  echo "오류: 프론트엔드 빌드 파일이 없습니다."
  echo "  cd $PROJECT_DIR && npm run build:web"
  read -p "엔터를 눌러 닫으세요..."
  exit 1
fi

echo "Agent Dashboard 시작 중..."
echo "URL: $URL"
echo "종료: Ctrl+C"
echo ""

exec node dist-standalone/server.cjs
