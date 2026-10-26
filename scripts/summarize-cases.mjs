// results/<case>/ 를 읽어 results/SUMMARY.md 표를 만든다. run-cases.sh 끝에서 호출된다.
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ALL_CASES = [
  'headers-static',
  'headers-dynamic',
  'intl-static',
  'intl-dynamic',
  'serveronly-static',
  'serveronly-dynamic',
]
const MODULE_OF = { headers: 'next/headers', intl: 'next-intl/server', serveronly: 'server-only' }
// 실험 설계 때 적은 기대값. 검증 대상이지 정답이 아니다 — 실제와 다르면 그대로 기록한다.
const EXPECTED = {
  'headers-static': { build: 'error', note: 'Build Error (You\'re importing a component that needs ...)' },
  'headers-dynamic': { build: 'pass', note: '빌드 통과, SSR에서 cookies() 호출 에러 또는 값' },
  'intl-static': { build: 'pass', note: '빌드 통과, SSR에서 getLocale is not supported in Client Components' },
  'intl-dynamic': { build: 'pass', note: '빌드 통과, SSR에서 getLocale is not supported in Client Components' },
  'serveronly-static': { build: 'error', note: 'Build Error (server-only 메시지)' },
  'serveronly-dynamic': { build: 'pass', note: "빌드 통과, SSR에서 await import('server-only') 시점 throw" },
}
const cases = process.argv.length > 2 ? process.argv.slice(2) : ALL_CASES

const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
const lines = (p) => read(p).split('\n').filter(Boolean)
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '')
const decodeHtml = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')

const code = (s) => `<code>${s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`/g, '&#96;').replace(/\|/g, '&#124;')}</code>`

// "Turbopack build failed with N errors:" 아래의 Error: 줄을 전부 모은다(중복 제거).
const buildErrors = (log) => {
  const text = stripAnsi(log)
  const errors = [...text.matchAll(/^Error: (?!Turbopack build failed)([^\n]*)/gm)].map((m) => m[1].trim())
  const unique = [...new Set(errors)]
  return unique.length ? unique : ['(에러 메시지 추출 실패 — build.log 확인)']
}

const buildCell = (dir) => {
  const exit = read(join(dir, 'build-exit.txt')).trim()
  if (exit === '') return '미실행'
  if (exit === '0') return '통과'
  return `에러 (exit ${exit})<br>${buildErrors(read(join(dir, 'build.log'))).map(code).join('<br>')}`
}

// 빌드 로그의 라우트 표에서 /invalid-client-imports 가 ○(static) 인지 ƒ(dynamic) 인지.
const routeModeCell = (dir) => {
  const line = stripAnsi(read(join(dir, 'build.log')))
    .split('\n')
    .find((l) => / \/invalid-client-imports\s*$/.test(l))
  if (!line) return '—'
  if (line.includes('ƒ')) return 'ƒ dynamic'
  if (line.includes('○')) return '○ static'
  return code(line.trim())
}

const ssrCell = (dir) => {
  const html = read(join(dir, 'ssr.html'))
  if (!html) return '—'
  const m = html.match(/data-exp-result="true">([^<]*)</)
  if (!m) {
    const title = html.match(/<title>([^<]*)<\/title>/)
    return `결과 span 없음 (${title ? title[1] : 'HTML ' + html.length + 'B'})`
  }
  return code(decodeHtml(m[1]))
}

const chunkCell = (dir, kind) => {
  if (!existsSync(join(dir, 'ssr.html'))) return '—'
  const files = lines(join(dir, `ssr-chunks-${kind}.txt`))
  const js = files.filter((f) => f.endsWith('.js')).length
  const maps = files.filter((f) => f.endsWith('.js.map')).length
  const caseModule = lines(join(dir, 'ssr-case-module.txt')).length
  const moduleMark = js + maps === 0 ? '없음' : `있음 (js ${js}, map ${maps})`
  return `${moduleMark} / 케이스 파일 ${caseModule > 0 ? `있음 (map ${caseModule})` : '없음'}`
}

// console.log('[exp', 'ssr', ...) 가 어디서 찍혔는지: 빌드 중 prerender(build.log) vs 요청 시(server.log).
const expLog = (dir, file) => {
  const line = lines(join(dir, file))
    .map(stripAnsi)
    .find((l) => l.startsWith('[exp] ssr'))
  return line ? code(line.replace(/^\[exp\] ssr /, '')) : '—'
}

const rows = cases.map((c) => {
  const dir = join('results', c)
  const kind = c.split('-')[0]
  return `| ${c} | \`${MODULE_OF[kind]}\` | ${buildCell(dir)} | ${routeModeCell(dir)} | ${expLog(dir, 'build.log')} | ${ssrCell(dir)} | ${expLog(dir, 'server.log')} | ${chunkCell(dir, kind)} |`
})

const expectationRows = cases.map((c) => {
  const dir = join('results', c)
  const exit = read(join(dir, 'build-exit.txt')).trim()
  const actual = exit === '' ? null : exit === '0' ? 'pass' : 'error'
  const expected = EXPECTED[c]
  const verdict = actual === null ? '미실행' : actual === expected.build ? '빌드 결과 일치' : `**빌드 결과 다름** (기대 ${expected.build}, 실제 ${actual})`
  return `- **${c}** — 기대: ${expected.note} → ${verdict}`
})

const md = `# 클라이언트 그래프에서 서버 전용 모듈 import — 결과 요약

생성: ${new Date().toISOString()} · \`scripts/run-cases.sh\`

| case | 모듈 | build | 라우트 | 빌드 중 prerender 결과 (build.log) | SSR 호출 결과 (ssr.html) | 요청 시 서버 콘솔 (server.log) | ssr 청크에 모듈 포함 / 케이스 파일 포함 |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## 기대값 대비

${expectationRows.join('\n')}

## 열 설명

- **build**: \`next build\` exit code. 에러면 build.log의 \`Error:\` 줄 전부(중복 제거).
- **라우트**: 빌드 로그 라우트 표에서 \`/invalid-client-imports\`가 ○(static, 빌드 때 prerender한 HTML을 그대로 서빙) 인지 ƒ(dynamic, 요청마다 SSR) 인지.
- **빌드 중 prerender 결과**: \`next build\`가 정적 생성을 시도하며 SSR 그래프에서 \`subject()\`를 호출한 결과. 여기서 throw가 나면 ○이 되고, dynamic API 사용이 감지되면 ƒ로 바뀐다.
- **SSR 호출 결과**: \`curl /invalid-client-imports\`의 HTML에서 \`subject()\` 반환값. \`ERR:\`로 시작하면 호출이 throw한 것. ○ 라우트는 빌드 때 만든 HTML이라 prerender 결과와 같다.
- **요청 시 서버 콘솔**: \`next start\` 프로세스의 stdout. ○ 라우트는 요청 시 렌더하지 않으므로 비어 있다.
- **ssr 청크에 모듈 포함**: \`.next/server/chunks/ssr/\`에서 모듈 문자열(\`next/headers\`·\`request/cookies\` / \`server.react-client\`·\`next-intl\` / \`server-only\`)이 잡힌 파일 수. js는 실제 청크, map은 소스맵.
- \`server-only\` 패턴은 Next 자체 청크의 소스맵(에러 메시지 문자열)에도 잡히므로 통과한 케이스의 ssr-chunks-serveronly.txt에 몇 건이 있는 건 노이즈다.
- **케이스 파일 포함**: 소스맵에 \`src/lib/cases/<case>.ts\` 경로가 있는지. 압축된 청크엔 \`subject\` 식별자가 남지 않아 \`ssr-subject.txt\`는 보통 비어 있다.
- 세부 로그: \`results/<case>/\` (build.log, ssr.html, server.log, ssr-chunks-*.txt, ssr-case-module.txt)
`
writeFileSync('results/SUMMARY.md', md)
console.log(md)
