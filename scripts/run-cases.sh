#!/usr/bin/env bash
# 클라이언트 그래프에서 서버 전용 모듈 import 실험 — 6케이스를 순서대로 빌드·SSR·청크 검사한다.
# 사용법: scripts/run-cases.sh [case ...]   (인자 없으면 6케이스 전부)
# 결과: results/<case>/{build.log,build-exit.txt,ssr.html,server.log,ssr-*.txt}, results/SUMMARY.md
set -u
cd "$(dirname "$0")/.."

ALL_CASES=(headers-static headers-dynamic intl-static intl-dynamic serveronly-static serveronly-dynamic)
CASES=("${@:-${ALL_CASES[@]}}")
PORT=3123
URL="http://localhost:$PORT/invalid-client-imports"
SSR_DIR=.next/server/chunks/ssr

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "포트 $PORT 를 이미 쓰는 프로세스가 있다. 먼저 내리고 다시 실행할 것." >&2
  exit 1
fi

build_case() {
  local case=$1 dir=$2 code
  rm -rf .next
  EXP_CASE=$case pnpm build 2>&1 | tee "$dir/build.log"
  code=${PIPESTATUS[0]}
  # 에이전트 환경에서는 Next가 보안 업그레이드 안내를 띄우며 빌드를 한 번 멈춘다.
  # 안내문이 시키는 대로 같은 명령을 다시 실행하고, 멈춘 쪽 로그는 따로 남긴다.
  if grep -q "SecurityFatalError" "$dir/build.log"; then
    mv "$dir/build.log" "$dir/build-upgrade-notice.log"
    EXP_CASE=$case pnpm build 2>&1 | tee "$dir/build.log"
    code=${PIPESTATUS[0]}
  fi
  echo "$code" > "$dir/build-exit.txt"
  return "$code"
}

serve_and_curl() {
  local case=$1 dir=$2 pid i
  EXP_CASE=$case pnpm start -p "$PORT" > "$dir/server.log" 2>&1 &
  pid=$!
  sleep 2
  for i in $(seq 1 20); do
    curl -s -o /dev/null "http://localhost:$PORT/" && break
    sleep 0.5
  done
  curl -s "$URL" > "$dir/ssr.html"
  sleep 0.5
  lsof -ti:"$PORT" | xargs kill 2>/dev/null
  kill "$pid" 2>/dev/null
  wait "$pid" 2>/dev/null
}

inspect_chunks() {
  local case=$1 dir=$2
  grep -rl "server.react-client\|next-intl" "$SSR_DIR/" > "$dir/ssr-chunks-intl.txt"
  grep -rl "next/dist/compiled/server-only\|server-only" "$SSR_DIR/" > "$dir/ssr-chunks-serveronly.txt"
  grep -rl "next/headers\|request/cookies" "$SSR_DIR/" > "$dir/ssr-chunks-headers.txt"
  grep -rn "subject" "$SSR_DIR"/*.js | head -5 > "$dir/ssr-subject.txt"
  # 압축된 청크에서는 식별자가 사라지므로 소스맵에서 케이스 파일 경로로도 찾는다.
  grep -l "lib/cases/$case" "$SSR_DIR"/*.js.map > "$dir/ssr-case-module.txt"
  return 0
}

for case in "${CASES[@]}"; do
  dir="results/$case"
  rm -rf "$dir"
  mkdir -p "$dir"
  echo "===== [$case] build ====="
  if build_case "$case" "$dir"; then
    echo "===== [$case] start + curl ====="
    serve_and_curl "$case" "$dir"
    echo "===== [$case] ssr chunks ====="
    inspect_chunks "$case" "$dir"
  else
    echo "===== [$case] build failed (exit $(cat "$dir/build-exit.txt")) ====="
  fi
done

node scripts/summarize-cases.mjs "${CASES[@]}"
