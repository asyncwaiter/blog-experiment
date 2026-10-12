import { QueryClient } from '@tanstack/react-query'

/**
 * 요청마다 새로 만든다. 서버에서 공유하면 사용자끼리 캐시가 섞인다.
 * staleTime은 시나리오별로 useSuspenseQuery에 직접 넘긴다.
 */
export function getQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // 실패 재시도는 요청 횟수 집계를 흐리므로 끈다.
      queries: { retry: false },
    },
  })
}
