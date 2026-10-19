'use client'

import { whereAmI } from 'where-am-i'
import { tag } from '@/lib/shared'

const callSafely = (fn: () => string): string => {
  try {
    return fn()
  } catch (error) {
    return `threw: ${(error as Error).message}`
  }
}

export default function ClientBox() {
  // 렌더 중에 호출해서 ssr 그래프(Node에서 실행)와 client 그래프(브라우저) 양쪽 결과를 남긴다.
  // 둘 다 STUB을 던지므로 렌더되는 문자열은 같고, hydration mismatch는 나지 않는다.
  const side = typeof window === 'undefined' ? 'ssr' : 'client'
  const direct = callSafely(whereAmI)
  const viaShared = callSafely(tag)
  console.log(`[ClientBox:${side}] whereAmI():`, direct)
  console.log(`[ClientBox:${side}] tag():`, viaShared)

  return (
    <>
      <p>ClientBox whereAmI(): {direct}</p>
      <p>ClientBox tag(): {viaShared}</p>
    </>
  )
}
