'use client'

import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { getUser } from '@/lib/user'
import {
  getMountDataAges,
  getServerMountDataAges,
  logMountDataAge,
  subscribeMountDataAge,
} from './mount-data-age'

export type ScenarioName = 'hydrated-stale' | 'hydrated-fresh'

export const USER_QUERY_KEY = ['user'] as const

function UserCard({
  scenario,
  staleTime,
}: {
  readonly scenario: ScenarioName
  readonly staleTime: number
}) {
  const { data: user } = useSuspenseQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => getUser(),
    staleTime,
  })

  const queryClient = useQueryClient()

  useEffect(() => {
    const state = queryClient.getQueryState(USER_QUERY_KEY)
    logMountDataAge(scenario, state?.dataUpdatedAt, user, staleTime)
    // 마운트 직후 한 번만 잰다. 구독(onSubscribe)과 같은 커밋 직후라
    // React Query의 stale 판정과 같은 시점의 값을 읽게 된다.
  }, [])

  return (
    <article>
      <strong>{user.name}</strong>
      <small> {user.id}</small>
      <div style={{ fontSize: '0.8rem', color: '#666' }}>
        fetchSeq <strong data-testid="fetch-seq">{user.fetchSeq}</strong>
      </div>
    </article>
  )
}

function MountDataAgeTable() {
  const entries = useSyncExternalStore(
    subscribeMountDataAge,
    getMountDataAges,
    getServerMountDataAges,
  )

  if (entries.length === 0) return <p style={small}>아직 마운트 측정 없음</p>

  return (
    <div>
      <div style={small}>
        <p style={{ margin: '0 0 0.3rem', fontWeight: 600 }}>표 읽는 법</p>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8 }}>
          <li>
            <strong>요청 시작→도착</strong>: 서버에서 MockAPI가 걸린 시간. 300ms짜리
            지연이다.
          </li>
          <li>
            데이터가 도착한 순간이 <code>dataUpdatedAt</code>이다. React Query의
            시계는 여기서 켜진다.
          </li>
          <li>
            <strong>마운트 시 나이</strong> = 마운트 시각 − <code>dataUpdatedAt</code>.
            stale 판정은 이 값만 본다.
          </li>
          <li>
            그래서 MockAPI 지연은 나이에 안 들어간다. 시계가 켜지기 전에 끝나기
            때문이다.
          </li>
        </ol>

        <p style={{ margin: '0.8rem 0 0.3rem', fontWeight: 600 }}>
          주의: 이 페이지는 새로고침해서 봐야 한다
        </p>
        <p style={{ margin: 0 }}>
          다른 시나리오에서 Link로 넘어오면 나이가 몇 초로 찍힌다. 두 시나리오가 같은
          layout 아래라 QueryClient가 그대로 살아 있고, 이전 페이지의{' '}
          <code>['user']</code>를 기준으로 재기 때문이다.
        </p>
        <p style={{ margin: '0.5rem 0 0' }}>
          표는 페이지를 옮겨 다녀도 지워지지 않고 쌓인다.
        </p>
      </div>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            {[
              '시나리오',
              '요청 시작→도착 (서버)',
              '마운트 시 나이',
              '요청 시작→마운트',
              'dataUpdatedAt − 도착',
              '넘긴 staleTime',
              '적용값',
              '판정',
            ].map((head) => (
              <th key={head} style={cell}>
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.mountedAt}>
              <td style={cell}>{entry.scenario}</td>
              <td style={cell} data-testid="fetch-duration">
                {entry.fetchDurationMs}ms
              </td>
              <td style={cell} data-testid="data-age">
                <strong>{entry.ageMs}ms</strong>
              </td>
              <td style={cell}>{entry.sinceRequestStartMs}ms</td>
              <td style={cell}>{entry.dataUpdatedAtDriftMs}ms</td>
              <td style={cell}>{entry.staleTimeMs}ms</td>
              <td style={cell}>{entry.effectiveStaleTimeMs}ms</td>
              <td
                style={{
                  ...cell,
                  color: entry.staleAtMount ? '#b35309' : '#1a7f37',
                }}
              >
                {entry.staleAtMount ? 'stale → refetch' : 'fresh'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ScenarioPage({
  scenario,
  staleTime,
}: {
  readonly scenario: ScenarioName
  readonly staleTime: number
}) {
  return (
    <main>
      <p style={small}>시나리오 페이지</p>
      <h1 style={{ fontSize: '1.1rem' }}>{scenario}</h1>
      <Suspense fallback={<p data-suspense-fallback>로딩중</p>}>
        <UserCard scenario={scenario} staleTime={staleTime} />
      </Suspense>
      <hr />
      <MountDataAgeTable />
    </main>
  )
}

const small = { color: '#666', fontSize: '0.8rem' }
const cell = {
  border: '1px solid #ddd',
  padding: '0.2rem 0.5rem',
  textAlign: 'left' as const,
}
