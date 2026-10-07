import Link from 'next/link'
import Parent from '@/experiments/effect-order'

export default function Page() {
  return (
    <main>
      <h1 style={{ fontSize: '1.1rem' }}>effect order experiment</h1>
      <p style={{ color: '#666' }}>
        브라우저 개발자 도구 콘솔을 열고 새로고침하세요. 서버 렌더 로그는
        <code> pnpm dev </code>를 띄운 터미널에 찍힙니다.
      </p>
      <p style={{ fontSize: '0.85rem' }}>
        <Link href="/rerender-remount-retry">
          리렌더 · 리마운트 · 재시도 비교 실험 →
        </Link>
      </p>
      <hr />
      <Parent />
    </main>
  )
}
