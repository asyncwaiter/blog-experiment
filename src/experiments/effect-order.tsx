'use client'

import { useEffect, useSyncExternalStore } from 'react'

const store = {
  subscribe(listener: () => void) {
    console.log('Child: subscribe 실행 (TanStack의 onSubscribe 자리)')
    return () => {}
  },
  getSnapshot() {
    return 0
  },
  // SSR에서는 필수. 없으면 React가 "Missing getServerSnapshot"으로 던진다.
  // TanStack Query도 useBaseQuery에서 이 자리를 채워준다.
  getServerSnapshot() {
    return 0
  },
}

function Child() {
  console.log('Child: render')

  useEffect(() => {
    console.log('Child: effect A (구독 훅보다 위에 쓴 useEffect)')
  }, [])

  useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  )

  useEffect(() => {
    console.log('Child: effect B (구독 훅보다 아래에 쓴 useEffect)')
  }, [])

  return <p>child</p>
}

export default function Parent() {
  console.log('Parent: render')

  useEffect(() => {
    console.log('Parent: effect (HydrationBoundary의 useEffect 자리)')
  }, [])

  return <Child />
}
