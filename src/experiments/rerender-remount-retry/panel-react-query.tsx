'use client'

import { Suspense, useEffect, useState } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { reactQueryBench } from './benches'
import { SUSPEND_MS, delayedValue } from './delay'
import { PanelShell } from './panel-shell'
import { Button } from './ui'

const bench = reactQueryBench

/**
 * 가짜 observer 대신 진짜 QueryObserver를 관찰한다.
 * observerAdded / observerRemoved는 QueryObserver가 구독/해제된 순간에만 오므로,
 * "만들어졌지만 구독된 적 없는 observer"는 이벤트에 나타나지 않는다.
 * 그래서 observerAdded 횟수와 init 횟수를 대조하는 것이 이 패널의 핵심이다.
 */
function CacheLogger() {
  const client = useQueryClient()

  useEffect(() => {
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type !== 'observerAdded' && event.type !== 'observerRemoved') {
        return
      }
      bench.log(
        event.type === 'observerAdded' ? 'effect' : 'cleanup',
        `${event.type} → key=${JSON.stringify(event.query.queryKey)}, 현재 observers=${event.query.observers.length}`,
      )
    })

    return unsubscribe
  }, [client])

  return null
}

/** Probe와 같은 리트머스. init이 다시 돌면 새 fiber다. */
function useFiberMark(tag: string): number {
  const [id] = useState(() => {
    const next = bench.nextInstanceId()
    bench.log('render', `${tag}: init 실행 → instance #${next}`)
    return next
  })

  bench.log('render', `${tag}: render body (instance #${id})`)

  useEffect(() => {
    bench.log('effect', `${tag}: mounted with instance #${id}`)
    return () => {
      bench.log('cleanup', `${tag}: cleanup(mount) instance #${id}`)
    }
  }, [tag, id])

  return id
}

function RemountProbe() {
  const id = useFiberMark('remount')
  // queryKey는 고정. key만 바뀌므로 같은 query에 observer가 갈아끼워진다.
  const { data } = useQuery({
    queryKey: ['rq-remount'],
    queryFn: () => delayedValue('remount-data', 0),
  })

  return (
    <span style={{ fontSize: '0.8rem' }}>
      instance #{id} · data={String(data)}
    </span>
  )
}

function RetryProbe({ runId }: { readonly runId: number }) {
  const id = useFiberMark('retry')
  // run마다 새 key → 캐시가 비어 있으므로 첫 render에서 suspend 한다.
  const { data } = useSuspenseQuery({
    queryKey: ['rq-retry', runId],
    queryFn: () => delayedValue(`retry-${runId}`, SUSPEND_MS),
  })

  return (
    <span style={{ fontSize: '0.8rem' }}>
      instance #{id} · data={data}
    </span>
  )
}

function Body() {
  const [remountMounted, setRemountMounted] = useState(false)
  const [remountKey, setRemountKey] = useState(1)
  const [retryRunId, setRetryRunId] = useState<number | null>(null)
  const [retrySeq, setRetrySeq] = useState(0)

  return (
    <PanelShell
      bench={bench}
      title="④ 진짜 React Query observer로 확인"
      trigger="useQuery를 쓰는 컴포넌트의 key 변경 / useSuspenseQuery의 첫 마운트 suspend"
      expect={
        <>
          리마운트에서는 observerRemoved → observerAdded가 한 쌍 찍힌다. 재시도에서는
          init이 두 번 찍히는데 observerAdded는 <strong>한 번만</strong> 찍힌다 — 첫
          observer가 구독된 적이 없다는 뜻.
        </>
      }
      controls={
        <>
          <Button
            tone="primary"
            onClick={() => setRemountMounted(true)}
            disabled={remountMounted}
          >
            useQuery 마운트
          </Button>
          <Button
            onClick={() => setRemountKey((current) => current + 1)}
            disabled={!remountMounted}
          >
            key 바꾸기 (리마운트)
          </Button>
          <Button
            onClick={() => setRemountMounted(false)}
            disabled={!remountMounted}
          >
            useQuery 언마운트
          </Button>
          <Button
            tone="primary"
            onClick={() => {
              const next = retrySeq + 1
              setRetrySeq(next)
              setRetryRunId(next)
            }}
            disabled={retryRunId !== null}
          >
            useSuspenseQuery 마운트 (suspend)
          </Button>
          <Button
            onClick={() => setRetryRunId(null)}
            disabled={retryRunId === null}
          >
            useSuspenseQuery 언마운트
          </Button>
        </>
      }
    >
      <CacheLogger />
      <div style={{ marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#777' }}>
          useQuery (key: {remountKey}):{' '}
        </span>
        {remountMounted ? <RemountProbe key={remountKey} /> : '언마운트 상태'}
      </div>
      <div>
        <span style={{ fontSize: '0.75rem', color: '#777' }}>
          useSuspenseQuery:{' '}
        </span>
        <Suspense
          fallback={<span style={{ color: '#b35309' }}>fallback 표시 중…</span>}
        >
          {retryRunId === null ? (
            '언마운트 상태'
          ) : (
            <RetryProbe key={retryRunId} runId={retryRunId} />
          )}
        </Suspense>
      </div>
    </PanelShell>
  )
}

export function ReactQueryPanel() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // RQ의 retry(실패 재시도)는 표의 "재시도"와 다른 개념이다. 섞이지 않게 끈다.
            retry: false,
            staleTime: Infinity,
            gcTime: Infinity,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={client}>
      <Body />
    </QueryClientProvider>
  )
}
