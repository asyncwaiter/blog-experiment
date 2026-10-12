'use client'

import type { User } from '@/lib/user'

/**
 * 한 번의 페이지 로드에서 시간이 어디에 쓰였는지 기록한다.
 *
 *   요청 시작 ──(fetchDurationMs, 서버)──▶ 데이터 도착 ──(ageMs)──▶ 브라우저 마운트
 *   fetchStartedAt                         fetchedAt ≈ dataUpdatedAt     mountedAt
 *
 * 읽는 법
 * 1. fetchDurationMs: 서버에서 MockAPI가 걸린 시간 (300ms 지연).
 * 2. 데이터가 도착한 순간이 dataUpdatedAt. React Query의 시계는 여기서 켜진다.
 * 3. ageMs = mountedAt − dataUpdatedAt. React Query의 stale 판정은 이 값만 본다.
 * 4. 그래서 MockAPI 지연은 ageMs에 안 들어간다. 시계가 켜지기 전에 끝난다.
 *
 * 주의: 하드 로드(새로고침) 기준이다.
 * 같은 layout 안에서 Link로 다른 시나리오에서 넘어오면 ageMs가 몇 초로 찍힌다.
 * 두 페이지가 같은 layout 아래라 QueryClient가 그대로 살아 있고,
 * 이전 페이지의 ['user']를 기준으로 재기 때문이다.
 *
 * 스냅샷은 모듈 변수라 페이지를 옮겨도 지워지지 않고 쌓인다.
 */
export type MountDataAge = {
  readonly scenario: string
  /** 데이터 도착(dataUpdatedAt)부터 브라우저 마운트까지. stale 판정이 보는 값. */
  readonly ageMs: number
  /** 요청 시작부터 데이터 도착까지. MockAPI 지연이 여기 들어 있다. 서버 시계끼리 뺀 값. */
  readonly fetchDurationMs: number
  /** 요청 시작부터 브라우저 마운트까지. = fetchDurationMs + ageMs (시계 차이가 0일 때). */
  readonly sinceRequestStartMs: number
  /** dataUpdatedAt − fetchedAt. 0에 가까우면 dataUpdatedAt이 "도착 시각"임을 뜻한다. */
  readonly dataUpdatedAtDriftMs: number
  readonly dataUpdatedAt: number
  readonly mountedAt: number
  readonly staleTimeMs: number
  /** useSuspenseQuery는 1000이 바닥 (query-core suspense.ts). */
  readonly effectiveStaleTimeMs: number
  readonly staleAtMount: boolean
}

declare global {
  interface Window {
    __mountDataAge?: MountDataAge
    __mountDataAges?: readonly MountDataAge[]
  }
}

export const MIN_SUSPENSE_TIME_MS = 1000

export const effectiveStaleTime = (requested: number): number =>
  Math.max(requested, MIN_SUSPENSE_TIME_MS)

const listeners = new Set<() => void>()
let snapshot: readonly MountDataAge[] = []

export function logMountDataAge(
  scenario: string,
  dataUpdatedAt: number | undefined,
  user: User,
  staleTimeMs: number,
): void {
  if (dataUpdatedAt === undefined) return

  const mountedAt = Date.now()
  const ageMs = mountedAt - dataUpdatedAt
  const effective = effectiveStaleTime(staleTimeMs)

  const entry: MountDataAge = {
    scenario,
    ageMs,
    fetchDurationMs: user.fetchedAt - user.fetchStartedAt,
    sinceRequestStartMs: mountedAt - user.fetchStartedAt,
    dataUpdatedAtDriftMs: dataUpdatedAt - user.fetchedAt,
    dataUpdatedAt,
    mountedAt,
    staleTimeMs,
    effectiveStaleTimeMs: effective,
    staleAtMount: ageMs > effective,
  }

  snapshot = [...snapshot, entry]
  window.__mountDataAge = entry
  window.__mountDataAges = snapshot
  listeners.forEach((listener) => {
    listener()
  })
}

export const subscribeMountDataAge = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getMountDataAges = () => snapshot

const EMPTY: readonly MountDataAge[] = []
export const getServerMountDataAges = () => EMPTY
