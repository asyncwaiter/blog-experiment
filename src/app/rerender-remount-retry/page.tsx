import Link from 'next/link'
import { RerenderRemountRetryExperiment } from '@/experiments/rerender-remount-retry'

export default function Page() {
  return (
    <main>
      <h1 style={{ fontSize: '1.1rem' }}>리렌더 · 리마운트 · 재시도 비교 실험</h1>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        각 패널의 로그는 화면과 브라우저 콘솔에 동시에 찍힙니다. 콘솔에는
        <code> [리렌더] </code>처럼 패널 이름이 접두사로 붙습니다.
      </p>
      <p style={{ color: '#666', fontSize: '0.85rem' }}>
        <code>reactStrictMode</code>는 <code>next.config.ts</code>에서 꺼져 있습니다.
        켜면 effect와 초기화 함수가 두 번씩 돌아 횟수 비교가 흐려집니다.
      </p>
      <p style={{ fontSize: '0.85rem' }}>
        <Link href="/">← effect order experiment</Link>
      </p>
      <hr />
      <RerenderRemountRetryExperiment />
    </main>
  )
}
