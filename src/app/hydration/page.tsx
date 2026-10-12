import Link from 'next/link'
import { MOCK_DELAY_MS } from '@/lib/user'

export default function Page() {
  return (
    <main>
      <h1 style={{ fontSize: '1.1rem' }}>
        prefetch + hydrate 데이터는 마운트 시점에 얼마나 늙어 있나
      </h1>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        서버가 <code>prefetchQuery</code>로 받은 데이터를{' '}
        <code>HydrationBoundary</code>로 넘기고, 브라우저에서{' '}
        <code>useSuspenseQuery</code>가 마운트되는 순간{' '}
        <code>Date.now() − dataUpdatedAt</code>을 잰다. Suspense 모드에서는
        staleTime이 최소 1,000ms로 보정되므로, 이 나이가 1,000ms를 넘으면 마운트 시
        재요청이 나간다. MockAPI 지연은 <code>{MOCK_DELAY_MS}ms</code>이고
        dataUpdatedAt이 찍히기 전에 끝나므로 나이에 들어가지 않는다.
      </p>
      <ul style={{ fontSize: '0.9rem', lineHeight: 2 }}>
        <li>
          <Link href="/hydration/hydrated-stale">hydrated-stale</Link>
          <span style={{ color: '#666' }}>
            {' '}
            — <code>staleTime: 0</code> (적용값 1,000ms). 나이가 1초를 넘기면 refetch
          </span>
        </li>
        <li>
          <Link href="/hydration/hydrated-fresh">hydrated-fresh</Link>
          <span style={{ color: '#666' }}>
            {' '}
            — <code>staleTime: 5,000</code>. 같은 나이라도 refetch 없음
          </span>
        </li>
      </ul>
      <div style={{ color: '#666', fontSize: '0.8rem', lineHeight: 1.8 }}>
        <p style={{ margin: '0 0 0.3rem' }}>각 페이지는 자기 마운트 측정을 표로 보여준다.</p>
        <p style={{ margin: '0 0 0.3rem' }}>
          <strong>시나리오는 꼭 새로고침해서 열 것.</strong> Link로 넘어가면 이전
          페이지의 캐시가 남아 있어 나이가 몇 초로 찍힌다. 이유는 각 페이지 표 아래에
          적어뒀다.
        </p>
        <p style={{ margin: 0 }}>
          여러 번 반복, dev/prod 비교, CPU throttling은 <code>pnpm measure</code>로
          돌린다.
        </p>
      </div>
      <p style={{ fontSize: '0.85rem' }}>
        <Link href="/">← 실험 목록</Link>
      </p>
    </main>
  )
}
