/**
 * hydrated-stale / hydrated-fresh 시나리오를 dev / prod 에서 재는 도구.
 *
 *   pnpm measure                                  # dev + prod, hydrated-stale, CPU 1/4/6x
 *   pnpm measure --runs=30                        # 글과 같은 30회
 *   pnpm measure --mode=prod --cpu=1,4,6          # CPU throttling 표
 *   pnpm measure --scenario=hydrated-fresh
 *   pnpm measure --url=http://localhost:3100 --mode=dev   # 띄워둔 서버에 붙기 (--label= 로 이름)
 *
 * 재는 것
 * - JS 크기: 그 페이지가 받은 모든 JS 응답의 디코드 후 바이트와 전송 바이트
 * - 마운트 시 데이터 나이: window.__mountDataAge.ageMs
 *   (= Date.now() - dataUpdatedAt, ScenarioPage의 useEffect가 찍는다)
 * - refetch: 브라우저가 /api/bff/user 로 보낸 요청 수와 그 소요 시간.
 *   서버 prefetch는 ssr-direct 라 브라우저에 안 보인다. 따라서 이 요청이
 *   한 건이라도 있으면 queryFn이 두 번 돈 것이다.
 *
 * 원칙: 이 스크립트는 Date.now()를 빼지 않는다. 나이는 페이지 안 useEffect가
 * 마운트 순간에 찍고, 여기서는 그 값을 꺼내 올 뿐이다. goto/networkidle/대기 같은
 * 하네스 쪽 시간이 측정값에 섞이면 안 되기 때문이다.
 *
 * 포트(3100/3200)에 이미 다른 서버가 떠 있으면 시작하지 않고 멈춘다. 그 서버를
 * 재고 싶으면 --url 로 붙인다. 스크립트가 띄운 서버가 아니면 어떤 코드인지 알 수 없다.
 *
 * CPU throttling은 Chrome DevTools와 같은 CDP 명령(Emulation.setCPUThrottlingRate)이다.
 * 브라우저만 느려지고 Next 서버는 그대로라, 느려지는 건 JS 파싱과 hydration 쪽이다.
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { chromium } from 'playwright'

const DEV_PORT = 3100
const PROD_PORT = 3200
const BFF_PATH = '/api/bff/user'

const parseArgs = (argv) =>
  Object.fromEntries(
    argv
      .filter((arg) => arg.startsWith('--'))
      .map((arg) => {
        // 첫 '='에서만 나눈다. 값 안에 '='가 들어와도 자르지 않게.
        const body = arg.slice(2)
        const index = body.indexOf('=')
        return index === -1 ? [body, 'true'] : [body.slice(0, index), body.slice(index + 1)]
      }),
  )

const args = parseArgs(process.argv.slice(2))
const mode = args.mode ?? 'both'
const scenario = args.scenario ?? 'hydrated-stale'
const runs = Number(args.runs ?? '10')
const externalUrl = args.url ?? null
const cpuRates = (args.cpu ?? '1,4,6')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 1)

const pagePath = `/hydration/${scenario}`

const startedAtMs = Date.now()
/** 진행 상황은 stderr 로. 결과 표는 stdout 이라 `> result.md` 로 받아도 섞이지 않는다. */
const log = (message) => {
  const elapsed = ((Date.now() - startedAtMs) / 1000).toFixed(0).padStart(4)
  process.stderr.write(`[${elapsed}s] ${message}\n`)
}

const quantile = (values, q) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor(q * sorted.length))
  return Math.round(sorted[index])
}
const median = (values) => quantile(values, 0.5)

const isJs = (response) => {
  const type = response.headers()['content-type'] ?? ''
  return /\.js(\?|$)/.test(response.url()) || type.includes('javascript')
}

const run = (command, commandArgs) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${commandArgs.join(' ')} → exit ${code}`))
    })
  })

const isAnswering = async (baseUrl) => {
  try {
    await fetch(baseUrl, { signal: AbortSignal.timeout(1500) })
    return true
  } catch {
    return false
  }
}

const startServer = async (commandArgs, port) => {
  const baseUrl = `http://localhost:${port}`

  // 이미 뭔가 떠 있으면 시작하지 않는다. 그냥 진행하면 spawn은 EADDRINUSE로
  // 조용히 죽고, 아래 대기는 기존 서버가 응답하니 통과해서 엉뚱한 코드를 재게 된다.
  if (await isAnswering(baseUrl)) {
    throw new Error(
      `${baseUrl} 에 이미 서버가 떠 있습니다. 그 서버를 재려면 --url=${baseUrl} 을 쓰고, ` +
        `아니면 내리고 다시 실행하세요.`,
    )
  }

  log(`서버 시작: npx ${commandArgs.join(' ')}`)
  const child = spawn('npx', commandArgs, { stdio: 'ignore' })
  let exited = null
  child.once('exit', (code, signal) => {
    exited = { code, signal }
  })

  const startedAt = Date.now()
  while (Date.now() - startedAt < 180000) {
    if (exited !== null) {
      throw new Error(
        `서버 프로세스가 뜨기 전에 끝났습니다 (${commandArgs.join(' ')}, code=${exited.code}, signal=${exited.signal}).`,
      )
    }
    if (await isAnswering(baseUrl)) break
    await sleep(500)
  }
  if (!(await isAnswering(baseUrl))) {
    child.kill('SIGTERM')
    throw new Error(`서버가 180000ms 안에 뜨지 않았습니다: ${baseUrl}`)
  }
  log(`서버 응답 확인: ${baseUrl}`)

  return {
    baseUrl,
    stop: () => {
      if (exited === null) child.kill('SIGTERM')
    },
  }
}

/** 한 번 로드해서 재고 닫는다. 컨텍스트를 매번 새로 만들어 캐시를 비운다. */
const measureOnce = async (browser, baseUrl, cpuRate) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  if (cpuRate > 1) {
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate })
  }

  const jsResponses = []
  const bffDurations = []

  page.on('response', (response) => {
    if (isJs(response)) jsResponses.push(response)
  })
  page.on('requestfinished', (request) => {
    if (!request.url().includes(BFF_PATH)) return
    // timing.startTime만 절대 시각(epoch ms)이고 나머지 필드는 그 기준 상대값이다.
    // 받아오지 못한 구간은 -1로 온다.
    const { responseEnd } = request.timing()
    if (responseEnd >= 0) bffDurations.push(responseEnd)
  })

  await page.goto(`${baseUrl}${pagePath}`, {
    waitUntil: 'networkidle',
    timeout: 180000,
  })
  await page.waitForFunction(() => window.__mountDataAge !== undefined, {
    timeout: 120000,
  })
  // 늦게 나가는 refetch까지 잡는다.
  await page.waitForTimeout(2000)

  const atMount = await page.evaluate(() => window.__mountDataAge)

  let decoded = 0
  let transfer = 0
  for (const response of jsResponses) {
    try {
      decoded += (await response.body()).length
      transfer += (await response.request().sizes()).responseBodySize ?? 0
    } catch {
      // 리다이렉트·취소된 응답은 body를 못 읽는다. 집계에서 빠진다.
    }
  }

  await context.close()

  return {
    jsFileCount: jsResponses.length,
    jsDecodedKB: Number((decoded / 1024).toFixed(1)),
    jsTransferKB: Number((transfer / 1024).toFixed(1)),
    effectiveStaleTimeMs: atMount?.effectiveStaleTimeMs ?? null,
    ageMs: atMount?.ageMs ?? null,
    fetchDurationMs: atMount?.fetchDurationMs ?? null,
    sinceRequestStartMs: atMount?.sinceRequestStartMs ?? null,
    staleAtMount: atMount?.staleAtMount ?? null,
    bffRequests: bffDurations.length,
    bffDurations,
  }
}

const measureEnvironment = async (browser, label, baseUrl) => {
  // dev는 라우트를 첫 요청에 컴파일한다. 그 비용을 빼려면 한 번 버려야 한다.
  log(`[${label}] 워밍업 1회 (버림)`)
  const warm = await measureOnce(browser, baseUrl, 1)
  log(`[${label}] 워밍업 끝 → 나이 ${warm.ageMs}ms, JS ${warm.jsDecodedKB}KB`)

  const byCpu = []
  for (const cpuRate of cpuRates) {
    const samples = []
    for (let index = 0; index < runs; index += 1) {
      const sample = await measureOnce(browser, baseUrl, cpuRate)
      samples.push(sample)
      log(
        `[${label}] CPU ${cpuRate === 1 ? '없음' : `${cpuRate}x`} ${index + 1}/${runs} → 나이 ${sample.ageMs}ms` +
          (sample.bffRequests > 0 ? ` (refetch ${sample.bffRequests}회)` : ''),
      )
    }
    const ages = samples.map((s) => s.ageMs)
    const refetchDurations = samples.flatMap((s) => s.bffDurations)

    byCpu.push({
      cpuRate,
      runs: samples.length,
      jsFileCount: samples[0].jsFileCount,
      jsDecodedKB: samples[0].jsDecodedKB,
      jsTransferKB: samples[0].jsTransferKB,
      effectiveStaleTimeMs: samples[0].effectiveStaleTimeMs,
      ageMedianMs: median(ages),
      ageMinMs: Math.min(...ages),
      ageMaxMs: Math.max(...ages),
      fetchDurationMedianMs: median(samples.map((s) => s.fetchDurationMs)),
      sinceRequestStartMedianMs: median(samples.map((s) => s.sinceRequestStartMs)),
      refetchRuns: samples.filter((s) => s.bffRequests > 0).length,
      totalRequests: samples.length + refetchDurations.length,
      refetchMedianMs: median(refetchDurations),
      refetchP95Ms: quantile(refetchDurations, 0.95),
    })
  }

  return { label, baseUrl, byCpu }
}

const printReport = (environments) => {
  const base = (env) => env.byCpu.find((e) => e.cpuRate === 1) ?? env.byCpu[0]

  console.log(`\n시나리오: ${scenario} · 배율마다 ${runs}회 · 워밍업 1회 버림`)
  console.log(`적용 staleTime: ${base(environments[0]).effectiveStaleTimeMs}ms`)

  console.log('\n## 같은 페이지의 JS 크기\n')
  console.log(`| | ${environments.map((e) => e.label).join(' | ')} |`)
  console.log(`|---|${environments.map(() => '---:|').join('')}`)
  const row = (name, pick) =>
    console.log(`| ${name} | ${environments.map((e) => pick(base(e))).join(' | ')} |`)
  row('JS 파일 수', (b) => b.jsFileCount)
  row('디코드 후 KB (파싱량)', (b) => b.jsDecodedKB)
  row('전송 KB (gzip)', (b) => b.jsTransferKB)

  for (const env of environments) {
    console.log(`\n## ${env.label} · CPU throttling 별\n`)
    console.log(
      '| CPU throttling | 요청 시작→도착 (서버, MockAPI 지연) | 마운트 시 데이터 나이 중앙값 | 범위 | 요청 시작→마운트 | refetch | 총 요청 | refetch 중앙값 | refetch p95 |',
    )
    console.log('| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |')
    for (const entry of env.byCpu) {
      const name = entry.cpuRate === 1 ? '없음' : `${entry.cpuRate}x`
      const refetch =
        entry.refetchRuns === 0
          ? 'refetch 없음'
          : `${entry.refetchRuns}/${entry.runs}`
      console.log(
        `| ${name} | ${entry.fetchDurationMedianMs}ms | ${entry.ageMedianMs}ms | ${entry.ageMinMs}–${entry.ageMaxMs}ms | ${entry.sinceRequestStartMedianMs}ms | ${refetch} | ${entry.totalRequests}회 (${entry.runs}런) | ${entry.refetchMedianMs === null ? '—' : `${entry.refetchMedianMs}ms`} | ${entry.refetchP95Ms === null ? '—' : `${entry.refetchP95Ms}ms`} |`,
      )
    }
  }
  console.log('')
}

const main = async () => {
  const environments = []
  const servers = []
  let browser = null

  const envCount = externalUrl !== null ? 1 : mode === 'both' ? 2 : 1
  const loadsPerEnv = 1 + runs * cpuRates.length
  log(
    `계획: ${externalUrl ?? mode} · ${scenario} · 배율 ${cpuRates.join('/')}x · 배율마다 ${runs}회 ` +
      `→ 환경당 ${loadsPerEnv}번 로드, 총 ${loadsPerEnv * envCount}번` +
      (mode !== 'dev' && externalUrl === null ? ' + next build' : '') +
      `. 끝나면 표가 stdout 으로 나온다.`,
  )

  try {
    browser = await chromium.launch()
    if (externalUrl !== null) {
      environments.push(
        await measureEnvironment(browser, args.label ?? (mode === 'both' ? 'server' : mode), externalUrl),
      )
    } else {
      if (mode === 'dev' || mode === 'both') {
        const server = await startServer(['next', 'dev', '-p', String(DEV_PORT)], DEV_PORT)
        servers.push(server)
        environments.push(await measureEnvironment(browser, 'dev', server.baseUrl))
        server.stop()
        // dev와 prod가 .next를 같이 쓴다. 내려간 뒤에 빌드한다.
        await sleep(2000)
      }

      if (mode === 'prod' || mode === 'both') {
        log('next build 시작 (출력은 그대로 보인다)')
        await run('npx', ['next', 'build'])
        const server = await startServer(['next', 'start', '-p', String(PROD_PORT)], PROD_PORT)
        servers.push(server)
        environments.push(await measureEnvironment(browser, 'prod', server.baseUrl))
        server.stop()
      }
    }

    log('측정 끝. 아래가 결과 표.')
    printReport(environments)
  } catch (error) {
    console.error('측정에 실패했습니다:', error)
    console.error(
      '빠르게 점검하려면: pnpm measure --mode=dev --runs=2 --cpu=1  (1분 안팎). ' +
        '브라우저 문제면: npx playwright install chromium',
    )
    process.exitCode = 1
  } finally {
    for (const server of servers) server.stop()
    if (browser !== null) await browser.close()
  }
}

await main()
// next dev/start가 자식 프로세스를 남길 수 있어 명시적으로 끝낸다.
process.exit(process.exitCode ?? 0)
