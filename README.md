# blog-experiment

Next 16 + Turbopack + pnpm 워크스페이스 실험 모음. 라우트별 실험은 `/` 홈의 링크에서 들어간다.

## 클라이언트 그래프에서 서버 전용 모듈 import — 정적 vs 동적

`use client` 컴포넌트가 가져오는 파일에서 `next/headers` · `next-intl/server` · `server-only`를 정적/동적으로 import할 때 `next build`가 막는지, 통과하면 SSR 중 호출 결과가 뭔지, ssr 청크에 모듈이 들어갔는지를 6케이스로 기록한 실험 (`src/lib/cases/*`, `/invalid-client-imports`).
실행: `scripts/run-cases.sh` (케이스마다 `.next`를 지우고 `EXP_CASE=<case> pnpm build` → `pnpm start -p 3123` → curl → 청크 grep; 특정 케이스만 돌리려면 인자로 넘긴다).
결과 표: [results/SUMMARY.md](results/SUMMARY.md) · 케이스별 원본 로그는 `results/<case>/`.
