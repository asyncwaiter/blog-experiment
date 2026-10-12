'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function Providers({ children }: { readonly children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // staleTime은 시나리오마다 queryOptions로 직접 넘긴다.
          // 실패 재시도는 요청 횟수 집계를 흐리므로 끈다.
          queries: { retry: false },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
