/**
 * suspend를 일으킬 promise. render 중에 만들면 매 render마다 새 promise가 생겨
 * 영원히 suspend 하므로, 반드시 이벤트 핸들러에서 만들어 state로 들고 있어야 한다.
 */
export function delayedValue(value: string, ms: number): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms)
  })
}

/** fallback이 실제로 commit 되는 것을 눈으로 확인할 수 있는 길이. */
export const SUSPEND_MS = 1200
