# 클라이언트 그래프에서 서버 전용 모듈 import — 결과 요약

생성: 2026-10-26T12:09:37.156Z · `scripts/run-cases.sh`

| case | 모듈 | build | 라우트 | 빌드 중 prerender 결과 (build.log) | SSR 호출 결과 (ssr.html) | 요청 시 서버 콘솔 (server.log) | ssr 청크에 모듈 포함 / 케이스 파일 포함 |
|---|---|---|---|---|---|---|---|
| headers-static | `next/headers` | 에러 (exit 1)<br><code>You're importing a module that depends on "next/headers". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.</code> | — | — | — | — | — |
| headers-dynamic | `next/headers` | 통과 | ƒ dynamic | <code>ERR: Dynamic server usage: Route /invalid-client-imports couldn't be rendered statically because it used &#96;cookies&#96;. See more info here: https://nextjs.org/docs/messages/dynamic-server-error</code> | <code>no-cookie</code> | <code>no-cookie</code> | 있음 (js 0, map 2) / 케이스 파일 있음 (map 1) |
| intl-static | `next-intl/server` | 통과 | ○ static | <code>ERR: &#96;getLocale&#96; is not supported in Client Components.</code> | <code>ERR: &#96;getLocale&#96; is not supported in Client Components.</code> | — | 있음 (js 0, map 1) / 케이스 파일 있음 (map 1) |
| intl-dynamic | `next-intl/server` | 통과 | ○ static | <code>ERR: &#96;getLocale&#96; is not supported in Client Components.</code> | <code>ERR: &#96;getLocale&#96; is not supported in Client Components.</code> | — | 있음 (js 2, map 2) / 케이스 파일 있음 (map 1) |
| serveronly-static | `server-only` | 에러 (exit 1)<br><code>You're importing a module that depends on "server-only". This API is only available in Server Components in the App Router, but you are using it in the Pages Router.</code><br><code>'server-only' cannot be imported from a Client Component module</code> | — | — | — | — | — |
| serveronly-dynamic | `server-only` | 에러 (exit 1)<br><code>'server-only' cannot be imported from a Client Component module</code> | — | — | — | — | — |

## 기대값 대비

- **headers-static** — 기대: Build Error (You're importing a component that needs ...) → 빌드 결과 일치
- **headers-dynamic** — 기대: 빌드 통과, SSR에서 cookies() 호출 에러 또는 값 → 빌드 결과 일치
- **intl-static** — 기대: 빌드 통과, SSR에서 getLocale is not supported in Client Components → 빌드 결과 일치
- **intl-dynamic** — 기대: 빌드 통과, SSR에서 getLocale is not supported in Client Components → 빌드 결과 일치
- **serveronly-static** — 기대: Build Error (server-only 메시지) → 빌드 결과 일치
- **serveronly-dynamic** — 기대: 빌드 통과, SSR에서 await import('server-only') 시점 throw → **빌드 결과 다름** (기대 pass, 실제 error)

## 열 설명

- **build**: `next build` exit code. 에러면 build.log의 `Error:` 줄 전부(중복 제거).
- **라우트**: 빌드 로그 라우트 표에서 `/invalid-client-imports`가 ○(static, 빌드 때 prerender한 HTML을 그대로 서빙) 인지 ƒ(dynamic, 요청마다 SSR) 인지.
- **빌드 중 prerender 결과**: `next build`가 정적 생성을 시도하며 SSR 그래프에서 `subject()`를 호출한 결과. 여기서 throw가 나면 ○이 되고, dynamic API 사용이 감지되면 ƒ로 바뀐다.
- **SSR 호출 결과**: `curl /invalid-client-imports`의 HTML에서 `subject()` 반환값. `ERR:`로 시작하면 호출이 throw한 것. ○ 라우트는 빌드 때 만든 HTML이라 prerender 결과와 같다.
- **요청 시 서버 콘솔**: `next start` 프로세스의 stdout. ○ 라우트는 요청 시 렌더하지 않으므로 비어 있다.
- **ssr 청크에 모듈 포함**: `.next/server/chunks/ssr/`에서 모듈 문자열(`next/headers`·`request/cookies` / `server.react-client`·`next-intl` / `server-only`)이 잡힌 파일 수. js는 실제 청크, map은 소스맵.
- `server-only` 패턴은 Next 자체 청크의 소스맵(에러 메시지 문자열)에도 잡히므로 통과한 케이스의 ssr-chunks-serveronly.txt에 몇 건이 있는 건 노이즈다.
- **케이스 파일 포함**: 소스맵에 `src/lib/cases/<case>.ts` 경로가 있는지. 압축된 청크엔 `subject` 식별자가 남지 않아 `ssr-subject.txt`는 보통 비어 있다.
- 세부 로그: `results/<case>/` (build.log, ssr.html, server.log, ssr-chunks-*.txt, ssr-case-module.txt)
